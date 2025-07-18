import * as amqp from 'amqplib';
import type { ILogger } from '../logger/Logger.js';

export interface IMessagePublisher {
  publish(exchange: string, routingKey: string, message: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

export interface IMessageConsumer {
  consume(queue: string, handler: (message: Record<string, unknown>) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export class RabbitMQAdapter implements IMessagePublisher, IMessageConsumer {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private connectionUrl: string,
    private logger: ILogger
  ) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.connectionUrl);
      this.channel = await this.connection.createChannel();
      
      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error:', { error: err.message });
      });

      this.connection.on('close', () => {
        this.logger.info('RabbitMQ connection closed');
      }); 

      this.logger.info('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', { error: (error as Error).message });
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, message: Record<string, unknown>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
        messageId: message.eventId as string
      });

      if (!published) {
        throw new Error('Failed to publish message');
      }

      this.logger.debug('Message published', { exchange, routingKey, messageId: message.eventId });
    } catch (error) {
      this.logger.error('Failed to publish message:', { error: (error as Error).message, exchange, routingKey });
      throw error;
    }
  }

  async consume(queue: string, handler: (message: Record<string, unknown>) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      
      await this.channel.consume(queue, async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel!.ack(msg);
          this.logger.debug('Message processed successfully', { queue });
        } catch (error) {
          this.logger.error('Failed to process message:', { error: (error as Error).message, queue });
          this.channel!.nack(msg, false, false); // Reject message without requeue
        }
      });

      this.logger.info(`Started consuming from queue: ${queue}`);
    } catch (error) {
      this.logger.error('Failed to setup consumer:', { error: (error as Error).message, queue });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.info('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', { error: (error as Error).message });
    }
  }

  async declareExchange(
    exchangeName: string,
    exchangeType: 'direct' | 'fanout' | 'topic' | 'headers',
    options: { durable?: boolean; autoDelete?: boolean } = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      await this.channel.assertExchange(exchangeName, exchangeType, {
        durable: options.durable ?? true,
        autoDelete: options.autoDelete ?? false
      });
      this.logger.debug('Exchange declared', { exchangeName, exchangeType });
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
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      await this.channel.assertQueue(queueName, {
        durable: options.durable ?? true,
        exclusive: options.exclusive ?? false,
        autoDelete: options.autoDelete ?? false,
        arguments: options.arguments
      });
      this.logger.debug('Queue declared', { queueName });
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
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      await this.channel.bindQueue(queueName, exchangeName, routingKey, args);
      this.logger.debug('Queue bound to exchange', { queueName, exchangeName, routingKey });
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
