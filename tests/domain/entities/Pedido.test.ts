import { Pedido } from '../../../src/domain/entities/Pedido.js';
import { ItemPedido } from '../../../src/domain/value-objects/ItemPedido.js';
import { Money } from '../../../src/domain/value-objects/Money.js';
import { StatusPedido } from '../../../src/domain/value-objects/StatusPedido.js';

describe('Pedido Entity', () => {
  const produtoExemplo = {
    id: 'prod-123',
    nome: 'Produto Teste',
    descricao: 'Descrição do produto'
  };

  const itemExemplo = new ItemPedido(produtoExemplo, 2, new Money(50, 'BRL'));

  describe('Creation', () => {
    it('should create pedido with minimal data', () => {
      const pedido = Pedido.criar('cliente-123');
      
      expect(pedido.clienteId).toBe('cliente-123');
      expect(pedido.itens).toHaveLength(0);
      expect(pedido.status.isPendente()).toBe(true);
      expect(pedido.id).toBeDefined();
      expect(pedido.dataCriacao).toBeInstanceOf(Date);
    });

    it('should create pedido with observacoes', () => {
      const pedido = Pedido.criar('cliente-123', 'Observação especial');
      
      expect(pedido.observacoes).toBe('Observação especial');
    });

    it('should generate PedidoCriado event', () => {
      const pedido = Pedido.criar('cliente-123');
      
      const events = pedido.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('PedidoCriado');
      expect(events[0]?.payload).toMatchObject({
        pedidoId: pedido.id,
        clienteId: 'cliente-123'
      });
    });

    it('should throw error for invalid clienteId', () => {
      expect(() => Pedido.criar('')).toThrow('Cliente ID é obrigatório');
      expect(() => Pedido.criar('   ')).toThrow('Cliente ID é obrigatório');
    });
  });

  describe('Items management', () => {
    it('should add item successfully', () => {
      const pedido = Pedido.criar('cliente-123');
      
      pedido.adicionarItem(itemExemplo);
      
      expect(pedido.itens).toHaveLength(1);
      expect(pedido.itens[0]).toEqual(itemExemplo);
      expect(pedido.calcularTotal().valor).toBe(100); // 2 * 50
    });

    it('should generate ItemAdicionado event', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.clearDomainEvents(); // Limpar evento de criação
      
      pedido.adicionarItem(itemExemplo);
      
      const events = pedido.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('ItemAdicionado');
    });

    it('should combine quantities when adding same produto', () => {
      const pedido = Pedido.criar('cliente-123');
      const item1 = new ItemPedido(produtoExemplo, 2, new Money(50, 'BRL'));
      const item2 = new ItemPedido(produtoExemplo, 3, new Money(50, 'BRL'));
      
      pedido.adicionarItem(item1);
      pedido.adicionarItem(item2);
      
      expect(pedido.itens).toHaveLength(1);
      expect(pedido.itens[0]?.quantidade).toBe(5); // 2 + 3
    });

    it('should remove item successfully', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.adicionarItem(itemExemplo);
      
      pedido.removerItem('prod-123');
      
      expect(pedido.itens).toHaveLength(0);
      expect(pedido.calcularTotal().valor).toBe(0);
    });

    it('should throw error when removing non-existent item', () => {
      const pedido = Pedido.criar('cliente-123');
      
      expect(() => pedido.removerItem('prod-inexistente'))
        .toThrow('Item com produto ID prod-inexistente não encontrado no pedido');
    });

    it('should change item quantity successfully', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.adicionarItem(itemExemplo);
      
      pedido.alterarQuantidadeItem('prod-123', 5);
      
      expect(pedido.itens[0]?.quantidade).toBe(5);
      expect(pedido.calcularTotal().valor).toBe(250); // 5 * 50
    });

    it('should not allow modifications when status is not PENDENTE', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      expect(() => pedido.adicionarItem(itemExemplo))
        .toThrow('Não é possível modificar itens com status CONFIRMADO');
    });

    it('should validate same currency for all items', () => {
      const pedido = Pedido.criar('cliente-123');
      const itemBRL = new ItemPedido(produtoExemplo, 1, new Money(50, 'BRL'));
      const itemUSD = new ItemPedido(produtoExemplo, 1, new Money(50, 'USD'));
      
      pedido.adicionarItem(itemBRL);
      
      expect(() => pedido.adicionarItem(itemUSD))
        .toThrow('Todos os itens devem ter a mesma moeda. Esperado: BRL, Recebido: USD');
    });
  });

  describe('Status management', () => {
    it('should change status with valid transition', () => {
      const pedido = Pedido.criar('cliente-123');
      
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      expect(pedido.status.isConfirmado()).toBe(true);
    });

    it('should generate StatusAlterado event', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.clearDomainEvents();
      
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      const events = pedido.domainEvents;
      expect(events.some(e => e.eventType === 'StatusAlterado')).toBe(true);
    });

    it('should generate specific events for certain status', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.clearDomainEvents();
      
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      const events = pedido.domainEvents;
      expect(events.some(e => e.eventType === 'PedidoConfirmado')).toBe(true);
    });

    it('should throw error for invalid transition', () => {
      const pedido = Pedido.criar('cliente-123');
      
      expect(() => pedido.alterarStatus(StatusPedido.ENTREGUE))
        .toThrow('Transição inválida de PENDENTE para ENTREGUE');
    });
  });

  describe('Business rules', () => {
    it('should calculate total correctly', () => {
      const pedido = Pedido.criar('cliente-123');
      const item1 = new ItemPedido(produtoExemplo, 2, new Money(50, 'BRL'));
      const item2 = new ItemPedido(
        { id: 'prod-456', nome: 'Produto 2' }, 
        1, 
        new Money(75, 'BRL')
      );
      
      pedido.adicionarItem(item1);
      pedido.adicionarItem(item2);
      
      expect(pedido.calcularTotal().valor).toBe(175); // (2*50) + (1*75)
    });

    it('should count total items correctly', () => {
      const pedido = Pedido.criar('cliente-123');
      const item1 = new ItemPedido(produtoExemplo, 3, new Money(50, 'BRL'));
      const item2 = new ItemPedido(
        { id: 'prod-456', nome: 'Produto 2' }, 
        2, 
        new Money(75, 'BRL')
      );
      
      pedido.adicionarItem(item1);
      pedido.adicionarItem(item2);
      
      expect(pedido.calcularQuantidadeItens()).toBe(5); // 3 + 2
    });

    it('should return zero total for empty pedido', () => {
      const pedido = Pedido.criar('cliente-123');
      
      expect(pedido.calcularTotal().valor).toBe(0);
      expect(pedido.isEmpty()).toBe(true);
    });

    it('should identify if pedido can be cancelled', () => {
      const pedido = Pedido.criar('cliente-123');
      
      expect(pedido.podeSerCancelado()).toBe(true);
      
      // Transição válida para ENTREGUE: PENDENTE -> CONFIRMADO -> PREPARANDO -> PRONTO -> ENVIADO -> ENTREGUE
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      pedido.alterarStatus(StatusPedido.PREPARANDO);
      pedido.alterarStatus(StatusPedido.PRONTO);
      pedido.alterarStatus(StatusPedido.ENVIADO);
      pedido.alterarStatus(StatusPedido.ENTREGUE);
      
      expect(pedido.podeSerCancelado()).toBe(false);
    });
  });

  describe('Domain Events', () => {
    it('should accumulate domain events', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.adicionarItem(itemExemplo);
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      const events = pedido.domainEvents;
      expect(events.length).toBeGreaterThan(2);
      
      const eventTypes = events.map(e => e.eventType);
      expect(eventTypes).toContain('PedidoCriado');
      expect(eventTypes).toContain('ItemAdicionado');
      expect(eventTypes).toContain('StatusAlterado');
      expect(eventTypes).toContain('PedidoConfirmado');
    });

    it('should clear domain events', () => {
      const pedido = Pedido.criar('cliente-123');
      pedido.adicionarItem(itemExemplo);
      
      expect(pedido.domainEvents.length).toBeGreaterThan(0);
      
      pedido.clearDomainEvents();
      
      expect(pedido.domainEvents).toHaveLength(0);
    });
  });

  describe('Utility methods', () => {
    it('should serialize to JSON correctly', () => {
      const pedido = Pedido.criar('cliente-123', 'Observação');
      pedido.adicionarItem(itemExemplo);
      
      const json = pedido.toJSON();
      
      expect(json).toMatchObject({
        id: pedido.id,
        clienteId: 'cliente-123',
        observacoes: 'Observação',
        quantidadeItens: 2,
        total: { valor: 100, moeda: 'BRL' }
      });
      expect(json.itens).toHaveLength(1);
    });

    it('should update dataAtualizacao when modified', () => {
      const pedido = Pedido.criar('cliente-123');
      const dataInicial = pedido.dataAtualizacao;
      
      // Pequena espera para garantir diferença de timestamp
      setTimeout(() => {
        pedido.adicionarItem(itemExemplo);
        
        expect(pedido.dataAtualizacao.getTime()).toBeGreaterThan(dataInicial.getTime());
      }, 1);
    });
  });
});
