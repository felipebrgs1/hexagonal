import { StatusPedido } from '../value-objects/StatusPedido.js';
import { Pedido } from '../entities/Pedido.js';

export interface ITransicaoEstado {
  from: StatusPedido;
  to: StatusPedido;
  condition?: (pedido: Pedido) => boolean;
  preAction?: (pedido: Pedido) => void;
  postAction?: (pedido: Pedido) => void;
}

export class MaquinaEstadosPedido {
  private readonly transicoes: Map<string, ITransicaoEstado[]>;

  constructor() {
    this.transicoes = new Map();
    this.configurarTransicoes();
  }

  private configurarTransicoes(): void {
    // PENDENTE -> CONFIRMADO
    this.adicionarTransicao({
      from: StatusPedido.PENDENTE,
      to: StatusPedido.CONFIRMADO,
      condition: (pedido: Pedido) => !pedido.isEmpty() && pedido.calcularTotal().valor > 0,
      preAction: (pedido: Pedido) => {
        // Validações antes da confirmação
        if (pedido.isEmpty()) {
          throw new Error('Não é possível confirmar pedido vazio');
        }
      }
    });

    // PENDENTE -> CANCELADO
    this.adicionarTransicao({
      from: StatusPedido.PENDENTE,
      to: StatusPedido.CANCELADO,
      condition: () => true // Sempre pode cancelar se pendente
    });

    // CONFIRMADO -> PREPARANDO
    this.adicionarTransicao({
      from: StatusPedido.CONFIRMADO,
      to: StatusPedido.PREPARANDO,
      condition: (pedido: Pedido) => !pedido.isEmpty(),
      preAction: (pedido: Pedido) => {
        // Aqui poderia verificar estoque, pagamento, etc.
        console.log(`Iniciando preparação do pedido ${pedido.id}`);
      }
    });

    // CONFIRMADO -> CANCELADO
    this.adicionarTransicao({
      from: StatusPedido.CONFIRMADO,
      to: StatusPedido.CANCELADO,
      condition: () => true // Ainda pode cancelar se confirmado
    });

    // PREPARANDO -> PRONTO
    this.adicionarTransicao({
      from: StatusPedido.PREPARANDO,
      to: StatusPedido.PRONTO,
      condition: () => true,
      postAction: (pedido: Pedido) => {
        console.log(`Pedido ${pedido.id} está pronto para envio`);
      }
    });

    // PREPARANDO -> CANCELADO
    this.adicionarTransicao({
      from: StatusPedido.PREPARANDO,
      to: StatusPedido.CANCELADO,
      condition: () => true,
      postAction: (pedido: Pedido) => {
        console.log(`Pedido ${pedido.id} cancelado durante preparação`);
      }
    });

    // PRONTO -> ENVIADO
    this.adicionarTransicao({
      from: StatusPedido.PRONTO,
      to: StatusPedido.ENVIADO,
      condition: () => true,
      preAction: (pedido: Pedido) => {
        console.log(`Gerando código de rastreamento para pedido ${pedido.id}`);
      }
    });

    // ENVIADO -> ENTREGUE
    this.adicionarTransicao({
      from: StatusPedido.ENVIADO,
      to: StatusPedido.ENTREGUE,
      condition: () => true,
      postAction: (pedido: Pedido) => {
        console.log(`Pedido ${pedido.id} foi entregue com sucesso`);
      }
    });
  }

  private adicionarTransicao(transicao: ITransicaoEstado): void {
    const key = transicao.from;
    
    if (!this.transicoes.has(key)) {
      this.transicoes.set(key, []);
    }
    
    this.transicoes.get(key)!.push(transicao);
  }

  podeTransicionar(pedido: Pedido, novoStatus: StatusPedido): boolean {
    const statusAtual = pedido.status.status;
    const transicoesDisponiveis = this.transicoes.get(statusAtual) || [];
    
    const transicao = transicoesDisponiveis.find(t => t.to === novoStatus);
    
    if (!transicao) {
      return false;
    }

    // Verificar condição se existir
    if (transicao.condition) {
      return transicao.condition(pedido);
    }

    return true;
  }

  executarTransicao(pedido: Pedido, novoStatus: StatusPedido): void {
    const statusAtual = pedido.status.status;
    const transicoesDisponiveis = this.transicoes.get(statusAtual) || [];
    const transicao = transicoesDisponiveis.find(t => t.to === novoStatus);

    if (!transicao) {
      throw new Error(
        `Transição inválida: ${statusAtual} -> ${novoStatus} para pedido ${pedido.id}`
      );
    }

    // Verificar condição específica e lançar erro personalizado
    if (transicao.condition && !transicao.condition(pedido)) {
      // Para pedidos vazios tentando ser confirmados, dar mensagem específica
      if (statusAtual === StatusPedido.PENDENTE && novoStatus === StatusPedido.CONFIRMADO && pedido.isEmpty()) {
        throw new Error('Não é possível confirmar pedido vazio');
      }
      
      throw new Error(
        `Transição inválida: ${statusAtual} -> ${novoStatus} para pedido ${pedido.id}`
      );
    }

    try {
      // Executar ação pré-transição
      if (transicao.preAction) {
        transicao.preAction(pedido);
      }

      // Executar a transição
      pedido.alterarStatus(novoStatus);

      // Executar ação pós-transição
      if (transicao.postAction) {
        transicao.postAction(pedido);
      }

    } catch (error) {
      throw new Error(
        `Falha ao executar transição ${statusAtual} -> ${novoStatus}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  obterTransicoesDisponiveis(pedido: Pedido): StatusPedido[] {
    const statusAtual = pedido.status.status;
    const transicoesDisponiveis = this.transicoes.get(statusAtual) || [];
    
    return transicoesDisponiveis
      .filter(transicao => {
        if (transicao.condition) {
          try {
            return transicao.condition(pedido);
          } catch {
            return false;
          }
        }
        return true;
      })
      .map(transicao => transicao.to);
  }

  validarFluxoCompleto(pedido: Pedido): { valido: boolean; proximosPassos: StatusPedido[]; bloqueios: string[] } {
    const proximosPassos = this.obterTransicoesDisponiveis(pedido);
    const bloqueios: string[] = [];

    // Verificar possíveis bloqueios
    if (pedido.isEmpty()) {
      bloqueios.push('Pedido não possui itens');
    }

    if (pedido.calcularTotal().valor === 0) {
      bloqueios.push('Pedido possui valor zero');
    }

    if (pedido.status.isFinalStatus()) {
      bloqueios.push('Pedido já está em status final');
    }

    return {
      valido: bloqueios.length === 0,
      proximosPassos,
      bloqueios
    };
  }

  // Método para simular um fluxo automático (saga-like)
  async executarFluxoAutomatico(
    pedido: Pedido, 
    statusDesejado: StatusPedido,
    onTransition?: (from: StatusPedido, to: StatusPedido) => Promise<void>
  ): Promise<void> {
    const statusAtual = pedido.status.status;
    
    if (statusAtual === statusDesejado) {
      return; // Já está no status desejado
    }

    // Encontrar caminho para o status desejado
    const caminho = this.encontrarCaminho(statusAtual, statusDesejado);
    
    if (caminho.length === 0) {
      throw new Error(`Não é possível chegar ao status ${statusDesejado} a partir de ${statusAtual}`);
    }

    // Executar transições em sequência
    for (const proximoStatus of caminho) {
      const statusAnterior = pedido.status.status;
      
      if (onTransition) {
        await onTransition(statusAnterior, proximoStatus);
      }
      
      this.executarTransicao(pedido, proximoStatus);
    }
  }

  private encontrarCaminho(statusAtual: StatusPedido, statusDesejado: StatusPedido): StatusPedido[] {
    // Implementação simples de busca em largura para encontrar caminho
    const visitados = new Set<StatusPedido>();
    const fila: { status: StatusPedido; caminho: StatusPedido[] }[] = [];
    
    fila.push({ status: statusAtual, caminho: [] });
    visitados.add(statusAtual);

    while (fila.length > 0) {
      const { status, caminho } = fila.shift()!;
      
      if (status === statusDesejado) {
        return caminho;
      }

      const transicoesDisponiveis = this.transicoes.get(status) || [];
      
      for (const transicao of transicoesDisponiveis) {
        if (!visitados.has(transicao.to)) {
          visitados.add(transicao.to);
          fila.push({
            status: transicao.to,
            caminho: [...caminho, transicao.to]
          });
        }
      }
    }

    return []; // Caminho não encontrado
  }

  // Métodos utilitários
  isStatusFinal(status: StatusPedido): boolean {
    return status === StatusPedido.ENTREGUE || status === StatusPedido.CANCELADO;
  }

  isStatusCancelavel(status: StatusPedido): boolean {
    return [StatusPedido.PENDENTE, StatusPedido.CONFIRMADO, StatusPedido.PREPARANDO].includes(status);
  }

  getTodosStatusPossiveis(): StatusPedido[] {
    return Object.values(StatusPedido);
  }
}
