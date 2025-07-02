import amqp, { Connection, Channel, Message } from 'amqplib';
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
  private connection: Connection | null = null;
  private channel: Channel | null = null;

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
      
      await this.channel.consume(queue, async (msg: Message | null) => {
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
}
