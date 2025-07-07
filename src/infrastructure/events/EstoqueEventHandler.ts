import { DomainEvent } from '../../domain/events/DomainEvent.js';
import { MockServicoEstoque } from '../services/MockServicoEstoque.js';
import { StatusPedido } from '../../domain/value-objects/StatusPedido.js';

export interface IEventHandler {
  handle(event: DomainEvent): Promise<void>;
  canHandle(eventType: string): boolean;
}

interface ItemEventPayload {
  produto: { id: string; nome: string };
  quantidade: number;
}

interface PedidoEventPayload {
  pedidoId: string;
  itens?: ItemEventPayload[];
  item?: ItemEventPayload;
  itemRemovido?: ItemEventPayload;
}

export class EstoqueEventHandler implements IEventHandler {
  private readonly servicoEstoque: MockServicoEstoque;

  constructor(servicoEstoque?: MockServicoEstoque) {
    this.servicoEstoque = servicoEstoque || new MockServicoEstoque();
  }

  canHandle(eventType: string): boolean {
    const eventosSuportados = [
      'PedidoCriado',
      'PedidoConfirmado',
      'StatusAlterado',
      'ItemAdicionado',
      'ItemRemovido',
      'QuantidadeItemAlterada',
      'PedidoCancelado'
    ];

    return eventosSuportados.includes(eventType);
  }

  async handle(event: DomainEvent): Promise<void> {
    console.log(`EstoqueEventHandler processando evento: ${event.eventType}`);

    try {
      switch (event.eventType) {
        case 'PedidoConfirmado':
          await this.handlePedidoConfirmado(event);
          break;

        case 'StatusAlterado':
          await this.handleStatusAlterado(event);
          break;

        case 'ItemAdicionado':
          await this.handleItemAdicionado(event);
          break;

        case 'ItemRemovido':
          await this.handleItemRemovido(event);
          break;

        case 'QuantidadeItemAlterada':
          await this.handleQuantidadeItemAlterada(event);
          break;

        default:
          console.log(`Evento ${event.eventType} reconhecido mas não requer ação de estoque`);
      }
    } catch (error) {
      console.error(`Erro ao processar evento ${event.eventType}:`, error);
      
      // Tentar compensação em caso de erro
      await this.tentarCompensacao(event);
      
      throw error; // Re-throw para notificar o sistema de eventos
    }
  }

  private async handlePedidoConfirmado(event: DomainEvent): Promise<void> {
    const { pedidoId, itens } = event.payload;
    
    console.log(`Processando confirmação de pedido ${pedidoId} - reservando estoque`);

    // Verificar disponibilidade de todos os itens primeiro
    for (const item of (itens as ItemEventPayload[])) {
      const disponivel = await this.servicoEstoque.verificarDisponibilidade(
        item.produto.id,
        item.quantidade
      );

      if (!disponivel) {
        throw new Error(
          `Estoque insuficiente para produto ${item.produto.nome} (${item.produto.id})`
        );
      }
    }

    // Se todos estão disponíveis, reservar
    for (const item of (itens as ItemEventPayload[])) {
      await this.servicoEstoque.reservarEstoque(
        item.produto.id,
        item.quantidade,
        pedidoId as string
      );
    }

    console.log(`Estoque reservado com sucesso para pedido ${pedidoId}`);
  }

  private async handleStatusAlterado(event: DomainEvent): Promise<void> {
    const { pedidoId, statusAnterior, novoStatus } = event.payload;

    console.log(`Processando mudança de status: ${statusAnterior} -> ${novoStatus} para pedido ${pedidoId}`);

    switch (novoStatus) {
      case StatusPedido.ENVIADO:
        await this.processarEnvio(pedidoId as string);
        break;

      case StatusPedido.CANCELADO:
        await this.processarCancelamento(pedidoId as string);
        break;

      case StatusPedido.ENTREGUE:
        console.log(`Pedido ${pedidoId} entregue - baixa no estoque já foi processada no envio`);
        break;

      default:
        console.log(`Status ${novoStatus} não requer ação de estoque`);
    }
  }

  private async processarEnvio(pedidoId: string): Promise<void> {
    console.log(`Processando envio do pedido ${pedidoId} - dando baixa no estoque`);
    
    // Em um cenário real, buscaríamos os itens do pedido no banco
    // Para este mock, vamos simular que temos acesso aos movimentos
    const movimentos = await this.servicoEstoque.listarMovimentos();
    const reservasDoPedido = movimentos.filter(
      m => m.pedidoId === pedidoId && m.tipo === 'RESERVA'
    );

    for (const reserva of reservasDoPedido) {
      await this.servicoEstoque.baixarEstoque(
        reserva.produtoId,
        reserva.quantidade,
        pedidoId
      );
    }

    console.log(`Baixa no estoque processada para pedido ${pedidoId}`);
  }

  private async processarCancelamento(pedidoId: string): Promise<void> {
    console.log(`Processando cancelamento do pedido ${pedidoId} - liberando reservas`);
    
    const movimentos = await this.servicoEstoque.listarMovimentos();
    const reservasDoPedido = movimentos.filter(
      m => m.pedidoId === pedidoId && m.tipo === 'RESERVA'
    );

    for (const reserva of reservasDoPedido) {
      await this.servicoEstoque.liberarReserva(
        reserva.produtoId,
        reserva.quantidade,
        pedidoId
      );
    }

    console.log(`Reservas liberadas para pedido cancelado ${pedidoId}`);
  }

  private async handleItemAdicionado(event: DomainEvent): Promise<void> {
    const { pedidoId, item } = event.payload;
    const itemData = item as ItemEventPayload;
    const produtoId = itemData.produto.id;
    const quantidade = itemData.quantidade;

    console.log(`Item adicionado ao pedido ${pedidoId}: ${produtoId} (${quantidade} unidades)`);

    // Verificar se pedido já está confirmado para reservar estoque
    // Em um cenário real, verificaríamos o status atual do pedido
    console.log(`Verificando necessidade de reserva adicional para pedido ${pedidoId}`);
  }

  private async handleItemRemovido(event: DomainEvent): Promise<void> {
    const { pedidoId, itemRemovido } = event.payload;
    const itemData = itemRemovido as ItemEventPayload;
    const produtoId = itemData.produto.id;
    const quantidade = itemData.quantidade;

    console.log(`Item removido do pedido ${pedidoId}: ${produtoId} (${quantidade} unidades)`);

    // Se havia reserva, liberar
    try {
      await this.servicoEstoque.liberarReserva(produtoId, quantidade, pedidoId as string);
    } catch (error) {
      console.warn(`Não foi possível liberar reserva para item removido: ${error}`);
    }
  }

  private async handleQuantidadeItemAlterada(event: DomainEvent): Promise<void> {
    const { pedidoId, produtoId, quantidadeAnterior, novaQuantidade } = event.payload;

    console.log(
      `Quantidade alterada no pedido ${pedidoId}: produto ${produtoId} de ${quantidadeAnterior} para ${novaQuantidade}`
    );

    const diferenca = (novaQuantidade as number) - (quantidadeAnterior as number);

    if (diferenca > 0) {
      // Aumentou a quantidade - reservar mais estoque
      const disponivel = await this.servicoEstoque.verificarDisponibilidade(
        produtoId as string,
        diferenca
      );

      if (!disponivel) {
        throw new Error(`Estoque insuficiente para aumentar quantidade do produto ${produtoId}`);
      }

      await this.servicoEstoque.reservarEstoque(
        produtoId as string,
        diferenca,
        pedidoId as string
      );
    } else if (diferenca < 0) {
      // Diminuiu a quantidade - liberar reserva
      await this.servicoEstoque.liberarReserva(
        produtoId as string,
        Math.abs(diferenca),
        pedidoId as string
      );
    }
  }

  private async tentarCompensacao(event: DomainEvent): Promise<void> {
    console.log(`Tentando compensação para evento ${event.eventType}`);

    try {
      const { pedidoId } = event.payload;
      
      if (pedidoId) {
        // Para cada produto do pedido, tentar compensar
        const movimentos = await this.servicoEstoque.listarMovimentos();
        const produtosDoPedido = new Set(
          movimentos
            .filter(m => m.pedidoId === pedidoId)
            .map(m => m.produtoId)
        );

        for (const produtoId of produtosDoPedido) {
          await this.servicoEstoque.compensarOperacao(produtoId, pedidoId as string);
        }
      }
    } catch (compensationError) {
      console.error(`Erro na compensação:`, compensationError);
    }
  }

  // Métodos utilitários para monitoramento
  async verificarIntegridadeEstoque(): Promise<{
    produtosComProblemas: string[];
    reservasOrfas: number;
    estatisticas: {
      totalProdutos: number;
      totalMovimentos: number;
      produtosComEstoqueBaixo: number;
      valorTotalEstoque: number;
    };
  }> {
    const estatisticas = this.servicoEstoque.obterEstatisticas();
    const movimentos = await this.servicoEstoque.listarMovimentos();
    
    // Verificar reservas órfãs (reservas sem baixa correspondente)
    const reservas = movimentos.filter(m => m.tipo === 'RESERVA');
    const baixas = movimentos.filter(m => m.tipo === 'SAIDA');
    
    let reservasOrfas = 0;
    for (const reserva of reservas) {
      const baixaCorrespondente = baixas.find(
        b => b.pedidoId === reserva.pedidoId && 
             b.produtoId === reserva.produtoId &&
             b.quantidade === reserva.quantidade
      );
      
      if (!baixaCorrespondente) {
        reservasOrfas++;
      }
    }

    return {
      produtosComProblemas: [], // Implementar verificações específicas se necessário
      reservasOrfas,
      estatisticas
    };
  }

  // Getter para acesso ao serviço de estoque (útil para testes)
  get servicoEstoqueInstance(): MockServicoEstoque {
    return this.servicoEstoque;
  }
}
