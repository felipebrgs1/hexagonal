import type { ILogger } from '../logger/Logger.js';

export interface IMessagePublisher {
  publish(exchange: string, routingKey: string, message: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

export interface IMessageConsumer {
  consume(queue: string, handler: (message: Record<string, unknown>) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

// Mock implementation for testing - will be replaced with actual RabbitMQ implementation
export class RabbitMQAdapter implements IMessagePublisher, IMessageConsumer {
  private isConnected = false;

  constructor(
    private connectionUrl: string,
    private logger: ILogger
  ) {}

  async connect(): Promise<void> {
    try {
      // Mock connection for testing
      this.isConnected = true;
      this.logger.info('Connected to RabbitMQ (mock)');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', { error: (error as Error).message });
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, message: Record<string, unknown>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      // Mock publish for testing
      this.logger.debug('Message published (mock)', { exchange, routingKey, messageId: message.eventId });
    } catch (error) {
      this.logger.error('Failed to publish message:', { error: (error as Error).message, exchange, routingKey });
      throw error;
    }
  }

  async consume(queue: string, handler: (message: Record<string, unknown>) => Promise<void>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      // Mock consume for testing - simulate processing a test message
      const mockMessage = { 
        eventType: 'test',
        eventId: 'test-id',
        data: { test: true }
      };
      
      setTimeout(async () => {
        await handler(mockMessage);
      }, 100);

      this.logger.info(`Started consuming from queue: ${queue} (mock)`);
    } catch (error) {
      this.logger.error('Failed to setup consumer:', { error: (error as Error).message, queue });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.isConnected = false;
      this.logger.info('RabbitMQ connection closed (mock)');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', { error: (error as Error).message });
    }
  }

  async declareExchange(
    exchangeName: string,
    exchangeType: 'direct' | 'fanout' | 'topic' | 'headers',
    options: { durable?: boolean; autoDelete?: boolean } = {}
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      // Mock exchange declaration
      this.logger.debug('Exchange declared (mock)', { exchangeName, exchangeType });
    } catch (error) {
      this.logger.error('Failed to declare exchange:', { 
        error: (error as Error).message, 
        exchangeName, 
        exchangeType 
      });
      throw error;
    }
  }

  async declareQueue(
    queueName: string,
    options: {
      durable?: boolean;
      exclusive?: boolean;
      autoDelete?: boolean;
      arguments?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      // Mock queue declaration
      this.logger.debug('Queue declared (mock)', { queueName });
    } catch (error) {
      this.logger.error('Failed to declare queue:', { 
        error: (error as Error).message, 
        queueName 
      });
      throw error;
    }
  }

  async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string,
    args?: Record<string, unknown>
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      // Mock queue binding
      this.logger.debug('Queue bound to exchange (mock)', { queueName, exchangeName, routingKey });
    } catch (error) {
      this.logger.error('Failed to bind queue:', { 
        error: (error as Error).message, 
        queueName, 
        exchangeName, 
        routingKey 
      });
      throw error;
    }
  }
}
