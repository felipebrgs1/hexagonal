import { PrismaClient } from '@prisma/client';
import type { ILogger } from '../logger/Logger.js';

export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): PrismaClient;
}

export class DatabaseConnection implements IDatabaseConnection {
  private prisma: PrismaClient;
  private connected: boolean = false;

  constructor(private logger: ILogger) {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.connected = true;
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', { error: (error as Error).message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.connected = false;
      this.logger.info('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', { error: (error as Error).message });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): PrismaClient {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }
}
