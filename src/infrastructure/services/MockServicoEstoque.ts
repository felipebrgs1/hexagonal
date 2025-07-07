import { Money } from '../../domain/value-objects/Money.js';

export interface IProdutoEstoque {
  id: string;
  nome: string;
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  precoUnitario: Money;
  categoria: string;
  ativo: boolean;
}

export interface IMovimentoEstoque {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'RESERVA' | 'LIBERACAO';
  quantidade: number;
  dataMovimento: Date;
  pedidoId?: string;
  observacoes?: string;
}

export interface IServicoEstoque {
  verificarDisponibilidade(produtoId: string, quantidade: number): Promise<boolean>;
  reservarEstoque(produtoId: string, quantidade: number, pedidoId: string): Promise<void>;
  liberarReserva(produtoId: string, quantidade: number, pedidoId: string): Promise<void>;
  baixarEstoque(produtoId: string, quantidade: number, pedidoId: string): Promise<void>;
  adicionarEstoque(produtoId: string, quantidade: number, observacoes?: string): Promise<void>;
  obterEstoqueProduto(produtoId: string): Promise<IProdutoEstoque | null>;
  listarMovimentos(produtoId?: string): Promise<IMovimentoEstoque[]>;
}

export class MockServicoEstoque implements IServicoEstoque {
  private readonly estoque: Map<string, IProdutoEstoque>;
  private readonly movimentos: IMovimentoEstoque[];
  private readonly simularErros: boolean;

  constructor(simularErros: boolean = false) {
    this.estoque = new Map();
    this.movimentos = [];
    this.simularErros = simularErros;
    this.inicializarEstoqueMock();
  }

  private inicializarEstoqueMock(): void {
    // Produtos de exemplo
    const produtos: IProdutoEstoque[] = [
      {
        id: 'prod-1',
        nome: 'Produto A',
        quantidadeDisponivel: 100,
        quantidadeReservada: 0,
        precoUnitario: new Money(50, 'BRL'),
        categoria: 'Categoria 1',
        ativo: true
      },
      {
        id: 'prod-2',
        nome: 'Produto B',
        quantidadeDisponivel: 50,
        quantidadeReservada: 0,
        precoUnitario: new Money(75, 'BRL'),
        categoria: 'Categoria 2',
        ativo: true
      },
      {
        id: 'prod-3',
        nome: 'Produto C',
        quantidadeDisponivel: 5, // Estoque baixo
        quantidadeReservada: 0,
        precoUnitario: new Money(200, 'BRL'),
        categoria: 'Categoria 3',
        ativo: true
      },
      {
        id: 'prod-erro',
        nome: 'Produto com Erro',
        quantidadeDisponivel: 10,
        quantidadeReservada: 0,
        precoUnitario: new Money(100, 'BRL'),
        categoria: 'Categoria Erro',
        ativo: false // Produto inativo para simular erro
      }
    ];

    produtos.forEach(produto => {
      this.estoque.set(produto.id, produto);
    });
  }

  async verificarDisponibilidade(produtoId: string, quantidade: number): Promise<boolean> {
    await this.simularDelay();

    if (this.simularErros && Math.random() < 0.1) {
      throw new Error(`Erro ao verificar disponibilidade do produto ${produtoId}`);
    }

    const produto = this.estoque.get(produtoId);
    
    if (!produto || !produto.ativo) {
      return false;
    }

    const quantidadeDisponivel = produto.quantidadeDisponivel - produto.quantidadeReservada;
    return quantidadeDisponivel >= quantidade;
  }

  async reservarEstoque(produtoId: string, quantidade: number, pedidoId: string): Promise<void> {
    await this.simularDelay();

    if (this.simularErros && Math.random() < 0.1) {
      throw new Error(`Erro ao reservar estoque do produto ${produtoId}`);
    }

    const produto = this.estoque.get(produtoId);
    
    if (!produto || !produto.ativo) {
      throw new Error(`Produto ${produtoId} não encontrado ou inativo`);
    }

    const quantidadeDisponivel = produto.quantidadeDisponivel - produto.quantidadeReservada;
    
    if (quantidadeDisponivel < quantidade) {
      throw new Error(`Estoque insuficiente para produto ${produtoId}. Disponível: ${quantidadeDisponivel}, Solicitado: ${quantidade}`);
    }

    // Reservar estoque
    produto.quantidadeReservada += quantidade;

    // Registrar movimento
    this.registrarMovimento({
      id: this.gerarId(),
      produtoId,
      tipo: 'RESERVA',
      quantidade,
      dataMovimento: new Date(),
      pedidoId,
      observacoes: `Reserva para pedido ${pedidoId}`
    });

    console.log(`Estoque reservado: ${quantidade} unidades do produto ${produtoId} para pedido ${pedidoId}`);
  }

  async liberarReserva(produtoId: string, quantidade: number, pedidoId: string): Promise<void> {
    await this.simularDelay();

    if (this.simularErros && Math.random() < 0.1) {
      throw new Error(`Erro ao liberar reserva do produto ${produtoId}`);
    }

    const produto = this.estoque.get(produtoId);
    
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }

    if (produto.quantidadeReservada < quantidade) {
      console.warn(`Tentativa de liberar mais estoque do que está reservado para produto ${produtoId}`);
      produto.quantidadeReservada = 0;
    } else {
      produto.quantidadeReservada -= quantidade;
    }

    // Registrar movimento
    this.registrarMovimento({
      id: this.gerarId(),
      produtoId,
      tipo: 'LIBERACAO',
      quantidade,
      dataMovimento: new Date(),
      pedidoId,
      observacoes: `Liberação de reserva do pedido ${pedidoId}`
    });

    console.log(`Reserva liberada: ${quantidade} unidades do produto ${produtoId} do pedido ${pedidoId}`);
  }

  async baixarEstoque(produtoId: string, quantidade: number, pedidoId: string): Promise<void> {
    await this.simularDelay();

    if (this.simularErros && Math.random() < 0.1) {
      throw new Error(`Erro ao dar baixa no estoque do produto ${produtoId}`);
    }

    const produto = this.estoque.get(produtoId);
    
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }

    // Verificar se há reserva suficiente
    if (produto.quantidadeReservada < quantidade) {
      throw new Error(`Não há reserva suficiente para baixa do produto ${produtoId}. Reservado: ${produto.quantidadeReservada}, Solicitado: ${quantidade}`);
    }

    // Dar baixa no estoque
    produto.quantidadeDisponivel -= quantidade;
    produto.quantidadeReservada -= quantidade;

    // Registrar movimento
    this.registrarMovimento({
      id: this.gerarId(),
      produtoId,
      tipo: 'SAIDA',
      quantidade,
      dataMovimento: new Date(),
      pedidoId,
      observacoes: `Baixa de estoque para pedido ${pedidoId}`
    });

    console.log(`Baixa no estoque: ${quantidade} unidades do produto ${produtoId} para pedido ${pedidoId}`);
  }

  async adicionarEstoque(produtoId: string, quantidade: number, observacoes?: string): Promise<void> {
    await this.simularDelay();

    const produto = this.estoque.get(produtoId);
    
    if (!produto) {
      throw new Error(`Produto ${produtoId} não encontrado`);
    }

    produto.quantidadeDisponivel += quantidade;

    // Registrar movimento
    this.registrarMovimento({
      id: this.gerarId(),
      produtoId,
      tipo: 'ENTRADA',
      quantidade,
      dataMovimento: new Date(),
      observacoes: observacoes || `Entrada de estoque`
    });

    console.log(`Estoque adicionado: ${quantidade} unidades do produto ${produtoId}`);
  }

  async obterEstoqueProduto(produtoId: string): Promise<IProdutoEstoque | null> {
    await this.simularDelay();

    const produto = this.estoque.get(produtoId);
    return produto ? { ...produto } : null;
  }

  async listarMovimentos(produtoId?: string): Promise<IMovimentoEstoque[]> {
    await this.simularDelay();

    if (produtoId) {
      return this.movimentos.filter(m => m.produtoId === produtoId);
    }

    return [...this.movimentos];
  }

  // Métodos auxiliares
  private registrarMovimento(movimento: IMovimentoEstoque): void {
    this.movimentos.push(movimento);
    
    // Manter apenas os últimos 1000 movimentos
    if (this.movimentos.length > 1000) {
      this.movimentos.splice(0, this.movimentos.length - 1000);
    }
  }

  private gerarId(): string {
    return `mov-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private async simularDelay(): Promise<void> {
    // Simular latência de rede/banco
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Métodos para testes e configuração
  adicionarProduto(produto: IProdutoEstoque): void {
    this.estoque.set(produto.id, produto);
  }

  removerProduto(produtoId: string): void {
    this.estoque.delete(produtoId);
  }

  redefinirEstoque(): void {
    this.estoque.clear();
    this.movimentos.length = 0;
    this.inicializarEstoqueMock();
  }

  obterEstatisticas(): {
    totalProdutos: number;
    totalMovimentos: number;
    produtosComEstoqueBaixo: number;
    valorTotalEstoque: number;
  } {
    const produtos = Array.from(this.estoque.values());
    
    return {
      totalProdutos: produtos.length,
      totalMovimentos: this.movimentos.length,
      produtosComEstoqueBaixo: produtos.filter(p => p.quantidadeDisponivel < 10).length,
      valorTotalEstoque: produtos.reduce((total, produto) => {
        return total + (produto.quantidadeDisponivel * produto.precoUnitario.valor);
      }, 0)
    };
  }

  // Método para compensação em caso de erro
  async compensarOperacao(produtoId: string, pedidoId: string): Promise<void> {
    console.log(`Iniciando compensação para produto ${produtoId} do pedido ${pedidoId}`);
    
    // Encontrar movimentos relacionados ao pedido
    const movimentosPedido = this.movimentos.filter(
      m => m.pedidoId === pedidoId && m.produtoId === produtoId
    );

    // Reverter movimentos em ordem inversa
    for (const movimento of movimentosPedido.reverse()) {
      try {
        switch (movimento.tipo) {
          case 'RESERVA':
            await this.liberarReserva(produtoId, movimento.quantidade, pedidoId);
            break;
          case 'SAIDA':
            await this.adicionarEstoque(produtoId, movimento.quantidade, `Compensação - reversão de saída`);
            break;
          // LIBERACAO e ENTRADA não precisam de compensação
        }
      } catch (error) {
        console.error(`Erro na compensação do movimento ${movimento.id}:`, error);
      }
    }

    console.log(`Compensação concluída para produto ${produtoId} do pedido ${pedidoId}`);
  }
}
