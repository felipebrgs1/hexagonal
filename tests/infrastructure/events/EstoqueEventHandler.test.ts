import { EstoqueEventHandler } from '@/infrastructure/events/EstoqueEventHandler.js';
import { MockServicoEstoque } from '@/infrastructure/services/MockServicoEstoque.js';
import { DomainEvent } from '@/domain/events/DomainEvent.js';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';
import { describe, it, expect, beforeEach } from 'vitest';

// Helper para criar eventos de teste
class TestDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly payload: Record<string, unknown>;

  constructor(eventType: string, aggregateId: string, payload: Record<string, unknown>) {
    this.eventId = `test-${Date.now()}-${Math.random()}`;
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.payload = payload;
  }
}

describe('EstoqueEventHandler', () => {
  let handler: EstoqueEventHandler;
  let mockServicoEstoque: MockServicoEstoque;

  beforeEach(() => {
    mockServicoEstoque = new MockServicoEstoque();
    handler = new EstoqueEventHandler(mockServicoEstoque);
  });

  describe('canHandle', () => {
    it('deve identificar eventos que pode processar', () => {
      expect(handler.canHandle('PedidoCriado')).toBe(true);
      expect(handler.canHandle('PedidoConfirmado')).toBe(true);
      expect(handler.canHandle('StatusAlterado')).toBe(true);
      expect(handler.canHandle('ItemAdicionado')).toBe(true);
      expect(handler.canHandle('ItemRemovido')).toBe(true);
      expect(handler.canHandle('QuantidadeItemAlterada')).toBe(true);
    });

    it('deve rejeitar eventos que não pode processar', () => {
      expect(handler.canHandle('EventoDesconhecido')).toBe(false);
      expect(handler.canHandle('OutroEvento')).toBe(false);
    });
  });

  describe('handlePedidoConfirmado', () => {
    it('deve reservar estoque para todos os itens do pedido', async () => {
      const evento = new TestDomainEvent('PedidoConfirmado', 'pedido-123', {
        pedidoId: 'pedido-123',
        itens: [
          {
            produto: { id: 'prod-1', nome: 'Produto A' },
            quantidade: 10
          },
          {
            produto: { id: 'prod-2', nome: 'Produto B' },
            quantidade: 5
          }
        ]
      });

      await handler.handle(evento);

      // Verificar se as reservas foram feitas
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const reservasProd1 = movimentos.filter(m => 
        m.produtoId === 'prod-1' && m.tipo === 'RESERVA' && m.pedidoId === 'pedido-123'
      );
      const reservasProd2 = movimentos.filter(m => 
        m.produtoId === 'prod-2' && m.tipo === 'RESERVA' && m.pedidoId === 'pedido-123'
      );

      expect(reservasProd1).toHaveLength(1);
      expect(reservasProd1[0]?.quantidade).toBe(10);
      expect(reservasProd2).toHaveLength(1);
      expect(reservasProd2[0]?.quantidade).toBe(5);
    });

    it('deve lançar erro quando estoque insuficiente', async () => {
      const evento = new TestDomainEvent('PedidoConfirmado', 'pedido-123', {
        pedidoId: 'pedido-123',
        itens: [
          {
            produto: { id: 'prod-3', nome: 'Produto C' },
            quantidade: 10 // prod-3 tem apenas 5 unidades
          }
        ]
      });

      await expect(handler.handle(evento)).rejects.toThrow('Estoque insuficiente');
    });

    it('deve verificar disponibilidade antes de reservar', async () => {
      const evento = new TestDomainEvent('PedidoConfirmado', 'pedido-123', {
        pedidoId: 'pedido-123',
        itens: [
          {
            produto: { id: 'prod-1', nome: 'Produto A' },
            quantidade: 50
          },
          {
            produto: { id: 'prod-3', nome: 'Produto C' },
            quantidade: 10 // Este vai falhar
          }
        ]
      });

      await expect(handler.handle(evento)).rejects.toThrow();

      // Verificar que nenhuma reserva foi feita (falha atômica)
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const reservasPedido = movimentos.filter(m => 
        m.tipo === 'RESERVA' && m.pedidoId === 'pedido-123'
      );

      expect(reservasPedido).toHaveLength(0);
    });
  });

  describe('handleStatusAlterado', () => {
    beforeEach(async () => {
      // Preparar reserva para os testes
      await mockServicoEstoque.reservarEstoque('prod-1', 20, 'pedido-123');
    });

    it('deve dar baixa no estoque quando status muda para ENVIADO', async () => {
      const evento = new TestDomainEvent('StatusAlterado', 'pedido-123', {
        pedidoId: 'pedido-123',
        statusAnterior: StatusPedido.PRONTO,
        novoStatus: StatusPedido.ENVIADO
      });

      await handler.handle(evento);

      // Verificar se a baixa foi registrada
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const baixas = movimentos.filter(m => 
        m.produtoId === 'prod-1' && m.tipo === 'SAIDA' && m.pedidoId === 'pedido-123'
      );

      expect(baixas).toHaveLength(1);
      expect(baixas[0]?.quantidade).toBe(20);
    });

    it('deve liberar reservas quando status muda para CANCELADO', async () => {
      const evento = new TestDomainEvent('StatusAlterado', 'pedido-123', {
        pedidoId: 'pedido-123',
        statusAnterior: StatusPedido.CONFIRMADO,
        novoStatus: StatusPedido.CANCELADO
      });

      await handler.handle(evento);

      // Verificar se a liberação foi registrada
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const liberacoes = movimentos.filter(m => 
        m.produtoId === 'prod-1' && m.tipo === 'LIBERACAO' && m.pedidoId === 'pedido-123'
      );

      expect(liberacoes).toHaveLength(1);
      expect(liberacoes[0]?.quantidade).toBe(20);
    });

    it('não deve fazer nada para outros status', async () => {
      const movimentosAntes = await mockServicoEstoque.listarMovimentos();
      const quantidadeAntes = movimentosAntes.length;

      const evento = new TestDomainEvent('StatusAlterado', 'pedido-123', {
        pedidoId: 'pedido-123',
        statusAnterior: StatusPedido.CONFIRMADO,
        novoStatus: StatusPedido.PREPARANDO
      });

      await handler.handle(evento);

      const movimentosDepois = await mockServicoEstoque.listarMovimentos();
      expect(movimentosDepois.length).toBe(quantidadeAntes); // Nenhum movimento adicional
    });
  });

  describe('handleItemAdicionado', () => {
    it('deve processar item adicionado', async () => {
      const evento = new TestDomainEvent('ItemAdicionado', 'pedido-123', {
        pedidoId: 'pedido-123',
        item: {
          produto: { id: 'prod-1', nome: 'Produto A' },
          quantidade: 5
        }
      });

      // Não deve lançar erro
      await handler.handle(evento);
    });
  });

  describe('handleItemRemovido', () => {
    beforeEach(async () => {
      await mockServicoEstoque.reservarEstoque('prod-1', 10, 'pedido-123');
    });

    it('deve liberar reserva quando item é removido', async () => {
      const evento = new TestDomainEvent('ItemRemovido', 'pedido-123', {
        pedidoId: 'pedido-123',
        itemRemovido: {
          produto: { id: 'prod-1', nome: 'Produto A' },
          quantidade: 5
        }
      });

      await handler.handle(evento);

      // Verificar se houve liberação
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const liberacoes = movimentos.filter(m => 
        m.produtoId === 'prod-1' && m.tipo === 'LIBERACAO' && m.pedidoId === 'pedido-123'
      );

      expect(liberacoes.length).toBeGreaterThan(0);
    });

    it('deve tratar graciosamente falha na liberação', async () => {
      const evento = new TestDomainEvent('ItemRemovido', 'pedido-123', {
        pedidoId: 'pedido-123',
        itemRemovido: {
          produto: { id: 'prod-inexistente', nome: 'Produto Inexistente' },
          quantidade: 5
        }
      });

      // Não deve lançar erro mesmo com produto inexistente
      await handler.handle(evento);
    });
  });

  describe('handleQuantidadeItemAlterada', () => {
    beforeEach(async () => {
      await mockServicoEstoque.reservarEstoque('prod-1', 10, 'pedido-123');
    });

    it('deve reservar mais estoque quando quantidade aumenta', async () => {
      const evento = new TestDomainEvent('QuantidadeItemAlterada', 'pedido-123', {
        pedidoId: 'pedido-123',
        produtoId: 'prod-1',
        quantidadeAnterior: 10,
        novaQuantidade: 15
      });

      await handler.handle(evento);

      // Verificar se houve reserva adicional
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const reservasAdicionais = movimentos.filter(m => 
        m.produtoId === 'prod-1' && 
        m.tipo === 'RESERVA' && 
        m.pedidoId === 'pedido-123' &&
        m.quantidade === 5 // Diferença
      );

      expect(reservasAdicionais).toHaveLength(1);
    });

    it('deve liberar reserva quando quantidade diminui', async () => {
      const evento = new TestDomainEvent('QuantidadeItemAlterada', 'pedido-123', {
        pedidoId: 'pedido-123',
        produtoId: 'prod-1',
        quantidadeAnterior: 10,
        novaQuantidade: 7
      });

      await handler.handle(evento);

      // Verificar se houve liberação
      const movimentos = await mockServicoEstoque.listarMovimentos();
      const liberacoes = movimentos.filter(m => 
        m.produtoId === 'prod-1' && 
        m.tipo === 'LIBERACAO' && 
        m.pedidoId === 'pedido-123' &&
        m.quantidade === 3 // Diferença
      );

      expect(liberacoes).toHaveLength(1);
    });

    it('não deve fazer nada quando quantidade não muda', async () => {
      const movimentosAntes = await mockServicoEstoque.listarMovimentos();
      const quantidadeAntes = movimentosAntes.length;

      const evento = new TestDomainEvent('QuantidadeItemAlterada', 'pedido-123', {
        pedidoId: 'pedido-123',
        produtoId: 'prod-1',
        quantidadeAnterior: 10,
        novaQuantidade: 10
      });

      await handler.handle(evento);

      const movimentosDepois = await mockServicoEstoque.listarMovimentos();
      expect(movimentosDepois.length).toBe(quantidadeAntes);
    });

    it('deve lançar erro quando não há estoque suficiente para aumento', async () => {
      const evento = new TestDomainEvent('QuantidadeItemAlterada', 'pedido-123', {
        pedidoId: 'pedido-123',
        produtoId: 'prod-1',
        quantidadeAnterior: 10,
        novaQuantidade: 200 // Muito mais que o disponível
      });

      await expect(handler.handle(evento)).rejects.toThrow('Estoque insuficiente');
    });
  });

  describe('Compensação de erros', () => {
    it('deve tentar compensação quando evento falha', async () => {
      // Criar evento que vai falhar
      const evento = new TestDomainEvent('PedidoConfirmado', 'pedido-erro', {
        pedidoId: 'pedido-erro',
        itens: [
          {
            produto: { id: 'prod-inexistente', nome: 'Produto Inexistente' },
            quantidade: 10
          }
        ]
      });

      await expect(handler.handle(evento)).rejects.toThrow();
      
      // A compensação deve ser executada automaticamente
      // (verificar logs ou outros indicadores se necessário)
    });
  });

  describe('verificarIntegridadeEstoque', () => {
    beforeEach(async () => {
      await mockServicoEstoque.reservarEstoque('prod-1', 10, 'pedido-1');
      await mockServicoEstoque.reservarEstoque('prod-2', 5, 'pedido-2');
    });

    it('deve retornar informações de integridade do estoque', async () => {
      const integridade = await handler.verificarIntegridadeEstoque();

      expect(integridade).toHaveProperty('produtosComProblemas');
      expect(integridade).toHaveProperty('reservasOrfas');
      expect(integridade).toHaveProperty('estatisticas');

      expect(Array.isArray(integridade.produtosComProblemas)).toBe(true);
      expect(typeof integridade.reservasOrfas).toBe('number');
      expect(integridade.estatisticas).toHaveProperty('totalProdutos');
    });

    it('deve detectar reservas órfãs', async () => {
      const integridade = await handler.verificarIntegridadeEstoque();
      
      expect(integridade.reservasOrfas).toBeGreaterThan(0); // Temos reservas sem baixas correspondentes
    });
  });

  describe('Acesso ao serviço de estoque', () => {
    it('deve fornecer acesso ao serviço de estoque', () => {
      const servico = handler.servicoEstoqueInstance;
      
      expect(servico).toBe(mockServicoEstoque);
      expect(servico).toBeInstanceOf(MockServicoEstoque);
    });
  });

  describe('Tratamento de eventos não suportados', () => {
    it('deve lidar graciosamente com eventos reconhecidos mas sem ação', async () => {
      const evento = new TestDomainEvent('PedidoCriado', 'pedido-123', {
        pedidoId: 'pedido-123'
      });

      await handler.handle(evento);
    });
  });
});
