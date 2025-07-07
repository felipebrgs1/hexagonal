import { RabbitMQEventPublisher } from '@/infrastructure/events/RabbitMQEventPublisher.js';
import { NotificarEstoqueHandler, EnviarEmailHandler } from '@/infrastructure/events/EventHandlers.js';
import { MockNotificacaoService } from '@/infrastructure/notifications/MockNotificacaoService.js';
import { RabbitMQAdapter } from '@/infrastructure/messaging/MockRabbitMQAdapter.js';
import { PedidoCriado, ItemAdicionado, StatusAlterado } from '@/domain/events/DomainEvent.js';
import { logger } from '@/infrastructure/logger/Logger.js';

describe('Event Messaging Integration Tests', () => {
  let rabbitMQ: RabbitMQAdapter;
  let eventPublisher: RabbitMQEventPublisher;
  let notificacaoService: MockNotificacaoService;
  let stockHandler: NotificarEstoqueHandler;
  let emailHandler: EnviarEmailHandler;

  beforeAll(async () => {
    // Use test RabbitMQ instance
    const connectionUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    
    rabbitMQ = new RabbitMQAdapter(connectionUrl, logger);
    eventPublisher = new RabbitMQEventPublisher(rabbitMQ, logger);
    notificacaoService = new MockNotificacaoService(logger);
    stockHandler = new NotificarEstoqueHandler(notificacaoService, logger);
    emailHandler = new EnviarEmailHandler(notificacaoService, logger);

    try {
      await eventPublisher.initialize();
    } catch  {
      console.warn('RabbitMQ not available for integration tests, skipping...');
      // If RabbitMQ is not available, we'll skip these tests
      return;
    }
  });

  afterAll(async () => {
    if (eventPublisher) {
      await eventPublisher.close();
    }
  });

  beforeEach(() => {
    notificacaoService.clearHistory();
  });

  describe('RabbitMQEventPublisher', () => {
    it('should publish PedidoCriado event', async () => {
      if (!eventPublisher) return; // Skip if RabbitMQ not available

      // Arrange
      const event = new PedidoCriado('pedido-123', {
        pedidoId: 'pedido-123',
        clienteId: 'cliente-456',
        dataCriacao: new Date().toISOString()
      });

      // Act & Assert
      await expect(eventPublisher.publish(event)).resolves.not.toThrow();
    });

    it('should publish multiple events', async () => {
      if (!eventPublisher) return; // Skip if RabbitMQ not available

      // Arrange
      const events = [
        new PedidoCriado('pedido-1', { 
          pedidoId: 'pedido-1', 
          clienteId: 'cliente-1', 
          dataCriacao: new Date().toISOString() 
        }),
        new ItemAdicionado('pedido-1', { 
          pedidoId: 'pedido-1', 
          item: { produtoId: 'produto-1', quantidade: 1 }, 
          novoTotal: { valor: 10.00, moeda: 'BRL' } 
        }),
        new StatusAlterado('pedido-1', { 
          pedidoId: 'pedido-1', 
          statusAnterior: 'PENDENTE', 
          novoStatus: 'CONFIRMADO' 
        })
      ];

      // Act & Assert
      await expect(eventPublisher.publishMany(events)).resolves.not.toThrow();
    });
  });

  describe('NotificarEstoqueHandler', () => {
    it('should handle PedidoCriado event', async () => {
      // Arrange
      const event = new PedidoCriado('pedido-123', {
        pedidoId: 'pedido-123',
        clienteId: 'cliente-456',
        dataCriacao: new Date().toISOString()
      });

      // Act
      await stockHandler.handle(event);

      // Assert - PedidoCriado doesn't trigger stock notifications directly
      const stockNotifications = notificacaoService.getStockNotifications();
      expect(stockNotifications).toHaveLength(0);
    });

    it('should handle ItemAdicionado event', async () => {
      // Arrange
      const event = new ItemAdicionado('pedido-123', {
        pedidoId: 'pedido-123',
        item: { produtoId: 'produto-3', quantidade: 5 },
        novoTotal: { valor: 50.00, moeda: 'BRL' }
      });

      // Act
      await stockHandler.handle(event);

      // Assert
      const stockNotifications = notificacaoService.getStockNotifications();
      expect(stockNotifications).toHaveLength(1);
      expect(stockNotifications[0]).toEqual({ produtoId: 'produto-3', quantidade: 5 });
    });

    it('should not handle unrelated events', () => {
      // Arrange
      const event = new StatusAlterado('pedido-123', { 
        pedidoId: 'pedido-123',
        statusAnterior: 'PENDENTE',
        novoStatus: 'CONFIRMADO' 
      });

      // Act & Assert
      expect(stockHandler.canHandle(event)).toBe(false);
    });
  });

  describe('EnviarEmailHandler', () => {
    it('should handle PedidoCriado event', async () => {
      // Arrange
      const event = new PedidoCriado('pedido-123', {
        pedidoId: 'pedido-123',
        clienteId: 'cliente-456',
        dataCriacao: new Date().toISOString()
      });

      // Act
      await emailHandler.handle(event);

      // Assert
      const emailsSent = notificacaoService.getEmailsSent();
      expect(emailsSent).toHaveLength(1);
      expect(emailsSent[0]).toEqual({ clienteId: 'cliente-456', pedidoId: 'pedido-123' });
    });

    it('should handle StatusAlterado event', async () => {
      // Arrange
      const event = new StatusAlterado('pedido-123', {
        pedidoId: 'pedido-123',
        statusAnterior: 'PENDENTE',
        novoStatus: 'CONFIRMADO'
      });

      // Act
      await emailHandler.handle(event);

      // Assert
      const smssSent = notificacaoService.getSmssSent();
      expect(smssSent).toHaveLength(1);
      expect(smssSent[0]).toEqual({
        clienteId: 'pedido-123', // This will be the aggregateId since clienteId is not in the payload
        pedidoId: 'pedido-123',
        status: 'CONFIRMADO'
      });
    });

    it('should handle multiple event types', () => {
      // Arrange
      const events = [
        new PedidoCriado('pedido-1', { 
          pedidoId: 'pedido-1', 
          clienteId: 'cliente-1', 
          dataCriacao: new Date().toISOString() 
        }),
        new StatusAlterado('pedido-2', { 
          pedidoId: 'pedido-2', 
          statusAnterior: 'PENDENTE',
          novoStatus: 'ENVIADO' 
        })
      ];

      // Act & Assert
      events.forEach(event => {
        expect(emailHandler.canHandle(event)).toBe(true);
      });
    });
  });

  describe('MockNotificacaoService', () => {
    it('should track email notifications', async () => {
      // Act
      await notificacaoService.enviarEmailPedidoCriado('cliente-1', 'pedido-1');
      await notificacaoService.enviarEmailPedidoCriado('cliente-2', 'pedido-2');

      // Assert
      const emails = notificacaoService.getEmailsSent();
      expect(emails).toHaveLength(2);
      expect(emails).toEqual([
        { clienteId: 'cliente-1', pedidoId: 'pedido-1' },
        { clienteId: 'cliente-2', pedidoId: 'pedido-2' }
      ]);
    });

    it('should track SMS notifications', async () => {
      // Act
      await notificacaoService.enviarSMSStatusAlterado('cliente-1', 'pedido-1', 'CONFIRMADO');

      // Assert
      const smss = notificacaoService.getSmssSent();
      expect(smss).toHaveLength(1);
      expect(smss[0]).toEqual({
        clienteId: 'cliente-1',
        pedidoId: 'pedido-1',
        status: 'CONFIRMADO'
      });
    });

    it('should track stock notifications', async () => {
      // Act
      await notificacaoService.notificarEstoque('produto-1', 10);
      await notificacaoService.notificarEstoque('produto-2', 5);

      // Assert
      const notifications = notificacaoService.getStockNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications).toEqual([
        { produtoId: 'produto-1', quantidade: 10 },
        { produtoId: 'produto-2', quantidade: 5 }
      ]);
    });

    it('should clear history', async () => {
      // Arrange
      await notificacaoService.enviarEmailPedidoCriado('cliente-1', 'pedido-1');
      await notificacaoService.notificarEstoque('produto-1', 5);

      // Act
      notificacaoService.clearHistory();

      // Assert
      expect(notificacaoService.getEmailsSent()).toHaveLength(0);
      expect(notificacaoService.getStockNotifications()).toHaveLength(0);
    });
  });
});
