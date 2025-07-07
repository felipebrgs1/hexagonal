import { 
  BaseDomainEvent, 
  PedidoCriado, 
  ItemAdicionado, 
  StatusAlterado,
  PedidoConfirmado 
} from '@/domain/events/DomainEvent.js';

describe('Domain Events', () => {
  describe('BaseDomainEvent', () => {
    class TestEvent extends BaseDomainEvent {
      constructor(aggregateId: string, payload: Record<string, unknown>) {
        super('TestEvent', aggregateId, payload);
      }
    }

    it('should create event with required properties', () => {
      const payload = { test: 'data' };
      const event = new TestEvent('aggregate-123', payload);
      
      expect(event.eventType).toBe('TestEvent');
      expect(event.aggregateId).toBe('aggregate-123');
      expect(event.payload).toEqual(payload);
      expect(event.eventId).toBeDefined();
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should accept custom eventId and occurredOn', () => {
      const customDate = new Date('2023-01-01');
      const customId = 'custom-id-123';
      
      // Testing through a concrete implementation
      class CustomTestEvent extends BaseDomainEvent {
        constructor(aggregateId: string, payload: Record<string, unknown>, eventId?: string, occurredOn?: Date) {
          super('TestEvent', aggregateId, payload, eventId, occurredOn);
        }
      }
      
      const eventWithCustom = new CustomTestEvent('aggregate-123', {}, customId, customDate);
      
      expect(eventWithCustom.eventId).toBe(customId);
      expect(eventWithCustom.occurredOn).toBe(customDate);
    });

    it('should serialize to JSON correctly', () => {
      const payload = { test: 'data', number: 123 };
      const event = new TestEvent('aggregate-123', payload);
      
      const json = event.toJSON();
      
      expect(json).toMatchObject({
        eventType: 'TestEvent',
        aggregateId: 'aggregate-123',
        payload: payload
      });
      expect(json.eventId).toBeDefined();
      expect(json.occurredOn).toBeDefined();
    });
  });

  describe('PedidoCriado', () => {
    it('should create PedidoCriado event correctly', () => {
      const payload = {
        pedidoId: 'pedido-123',
        clienteId: 'cliente-456',
        dataCriacao: '2023-01-01T00:00:00.000Z',
        observacoes: 'Observação teste'
      };
      
      const event = new PedidoCriado('pedido-123', payload);
      
      expect(event.eventType).toBe('PedidoCriado');
      expect(event.aggregateId).toBe('pedido-123');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('ItemAdicionado', () => {
    it('should create ItemAdicionado event correctly', () => {
      const payload = {
        pedidoId: 'pedido-123',
        item: {
          produto: { id: 'prod-1', nome: 'Produto 1' },
          quantidade: 2,
          precoUnitario: { valor: 50, moeda: 'BRL' },
          precoTotal: { valor: 100, moeda: 'BRL' }
        },
        novoTotal: { valor: 100, moeda: 'BRL' }
      };
      
      const event = new ItemAdicionado('pedido-123', payload);
      
      expect(event.eventType).toBe('ItemAdicionado');
      expect(event.aggregateId).toBe('pedido-123');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('StatusAlterado', () => {
    it('should create StatusAlterado event correctly', () => {
      const payload = {
        pedidoId: 'pedido-123',
        statusAnterior: 'PENDENTE',
        novoStatus: 'CONFIRMADO'
      };
      
      const event = new StatusAlterado('pedido-123', payload);
      
      expect(event.eventType).toBe('StatusAlterado');
      expect(event.aggregateId).toBe('pedido-123');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('PedidoConfirmado', () => {
    it('should create PedidoConfirmado event correctly', () => {
      const payload = {
        pedidoId: 'pedido-123',
        clienteId: 'cliente-456',
        total: { valor: 150, moeda: 'BRL' },
        itens: [
          {
            produto: { id: 'prod-1', nome: 'Produto 1' },
            quantidade: 2,
            precoUnitario: { valor: 50, moeda: 'BRL' },
            precoTotal: { valor: 100, moeda: 'BRL' }
          }
        ]
      };
      
      const event = new PedidoConfirmado('pedido-123', payload);
      
      expect(event.eventType).toBe('PedidoConfirmado');
      expect(event.aggregateId).toBe('pedido-123');
      expect(event.payload).toEqual(payload);
    });
  });

  describe('Event properties validation', () => {
    it('should generate unique eventIds', () => {
      const event1 = new PedidoCriado('aggregate-1', {
        pedidoId: 'pedido-1',
        clienteId: 'cliente-1',
        dataCriacao: new Date().toISOString()
      });
      
      const event2 = new PedidoCriado('aggregate-2', {
        pedidoId: 'pedido-2',
        clienteId: 'cliente-2',
        dataCriacao: new Date().toISOString()
      });
      
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should have timestamps close to creation time', () => {
      const beforeCreation = new Date();
      const event = new PedidoCriado('aggregate-1', {
        pedidoId: 'pedido-1',
        clienteId: 'cliente-1',
        dataCriacao: new Date().toISOString()
      });
      const afterCreation = new Date();
      
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });
});
