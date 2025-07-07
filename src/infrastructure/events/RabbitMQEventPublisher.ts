import { IEventPublisher } from '@/application/ports/index.js';
import { DomainEvent } from '@/domain/events/DomainEvent.js';
import { IMessagePublisher } from '../messaging/RabbitMQAdapter.js';
import type { ILogger } from '../logger/Logger.js';

interface IRabbitMQAdapter extends IMessagePublisher {
  connect(): Promise<void>;
  declareExchange(name: string, type: string, options?: Record<string, unknown>): Promise<void>;
  declareQueue(name: string, options?: Record<string, unknown>): Promise<void>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
}

export class RabbitMQEventPublisher implements IEventPublisher {
  private static readonly EXCHANGE_NAME = 'domain-events';
  private static readonly DLQ_EXCHANGE = 'domain-events-dlq';
  private static readonly RETRY_DELAY = 5000; // 5 seconds
  private static readonly MAX_RETRIES = 3;

  constructor(
    private readonly rabbitMQ: IRabbitMQAdapter,
    private readonly logger: ILogger
  ) {}

  async initialize(): Promise<void> {
    try {
      await this.rabbitMQ.connect();
      await this.setupExchangesAndQueues();
      this.logger.info('RabbitMQ Event Publisher initialized');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ Event Publisher', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      const routingKey = this.getRoutingKey(event);
      const message = this.prepareMessage(event);

      await this.rabbitMQ.publish(
        RabbitMQEventPublisher.EXCHANGE_NAME,
        routingKey,
        message
      );

      this.logger.info('Domain event published', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        routingKey
      });
    } catch (error) {
      this.logger.error('Failed to publish domain event', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.all(promises);
  }

  private async setupExchangesAndQueues(): Promise<void> {
    // Main exchange for domain events
    await this.rabbitMQ.declareExchange(
      RabbitMQEventPublisher.EXCHANGE_NAME,
      'topic',
      { durable: true }
    );

    // Dead Letter Exchange
    await this.rabbitMQ.declareExchange(
      RabbitMQEventPublisher.DLQ_EXCHANGE,
      'topic',
      { durable: true }
    );

    // Queue for notification service
    await this.rabbitMQ.declareQueue('notifications', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RabbitMQEventPublisher.DLQ_EXCHANGE,
        'x-dead-letter-routing-key': 'dlq.notifications',
        'x-message-ttl': 300000, // 5 minutes
        'x-max-retries': RabbitMQEventPublisher.MAX_RETRIES
      }
    });

    // Queue for stock service
    await this.rabbitMQ.declareQueue('stock-notifications', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RabbitMQEventPublisher.DLQ_EXCHANGE,
        'x-dead-letter-routing-key': 'dlq.stock',
        'x-message-ttl': 300000,
        'x-max-retries': RabbitMQEventPublisher.MAX_RETRIES
      }
    });

    // DLQ queues
    await this.rabbitMQ.declareQueue('dlq.notifications', { durable: true });
    await this.rabbitMQ.declareQueue('dlq.stock', { durable: true });

    // Bind queues to exchange
    await this.rabbitMQ.bindQueue(
      'notifications',
      RabbitMQEventPublisher.EXCHANGE_NAME,
      'pedido.*'
    );

    await this.rabbitMQ.bindQueue(
      'stock-notifications',
      RabbitMQEventPublisher.EXCHANGE_NAME,
      'pedido.criado'
    );

    await this.rabbitMQ.bindQueue(
      'stock-notifications',
      RabbitMQEventPublisher.EXCHANGE_NAME,
      'item.adicionado'
    );

    // Bind DLQ queues
    await this.rabbitMQ.bindQueue(
      'dlq.notifications',
      RabbitMQEventPublisher.DLQ_EXCHANGE,
      'dlq.notifications'
    );

    await this.rabbitMQ.bindQueue(
      'dlq.stock',
      RabbitMQEventPublisher.DLQ_EXCHANGE,
      'dlq.stock'
    );
  }

  private getRoutingKey(event: DomainEvent): string {
    const eventTypeMap: Record<string, string> = {
      'PedidoCriado': 'pedido.criado',
      'ItemAdicionado': 'item.adicionado',
      'StatusAlterado': 'pedido.status.alterado',
      'PedidoPago': 'pedido.pago',
      'PedidoEnviado': 'pedido.enviado',
      'PedidoEntregue': 'pedido.entregue',
      'PedidoCancelado': 'pedido.cancelado'
    };

    return eventTypeMap[event.eventType] || 'unknown.event';
  }

  private prepareMessage(event: DomainEvent): Record<string, unknown> {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      occurredOn: event.occurredOn.toISOString(),
      payload: event.payload,
      metadata: {
        publishedAt: new Date().toISOString(),
        publisher: 'hexag-service',
        retryCount: 0
      }
    };
  }

  async close(): Promise<void> {
    await this.rabbitMQ.close();
    this.logger.info('RabbitMQ Event Publisher closed');
  }
}
