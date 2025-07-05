import { INotificacaoService } from '../../application/ports/index.js';
import type { ILogger } from '../logger/Logger.js';

export class MockNotificacaoService implements INotificacaoService {
  private emailsSent: Array<{ clienteId: string; pedidoId: string }> = [];
  private smssSent: Array<{ clienteId: string; pedidoId: string; status: string }> = [];
  private stockNotifications: Array<{ produtoId: string; quantidade: number }> = [];

  constructor(private readonly logger: ILogger) {}

  async enviarEmailPedidoCriado(clienteId: string, pedidoId: string): Promise<void> {
    this.logger.info('Mock: Sending email for new order', { clienteId, pedidoId });
    
    this.emailsSent.push({ clienteId, pedidoId });
    
    // Simulate some processing time
    await this.delay(100);
    
    this.logger.info('Mock: Email sent successfully', { clienteId, pedidoId });
  }

  async enviarSMSStatusAlterado(clienteId: string, pedidoId: string, novoStatus: string): Promise<void> {
    this.logger.info('Mock: Sending SMS for status change', { 
      clienteId, 
      pedidoId, 
      novoStatus 
    });
    
    this.smssSent.push({ clienteId, pedidoId, status: novoStatus });
    
    // Simulate some processing time
    await this.delay(150);
    
    this.logger.info('Mock: SMS sent successfully', { 
      clienteId, 
      pedidoId, 
      novoStatus 
    });
  }

  async notificarEstoque(produtoId: string, quantidade: number): Promise<void> {
    this.logger.info('Mock: Notifying stock service', { produtoId, quantidade });
    
    this.stockNotifications.push({ produtoId, quantidade });
    
    // Simulate some processing time
    await this.delay(80);
    
    this.logger.info('Mock: Stock notification sent successfully', { 
      produtoId, 
      quantidade 
    });
  }

  // Methods to inspect what was sent (useful for testing)
  getEmailsSent(): Array<{ clienteId: string; pedidoId: string }> {
    return [...this.emailsSent];
  }

  getSmssSent(): Array<{ clienteId: string; pedidoId: string; status: string }> {
    return [...this.smssSent];
  }

  getStockNotifications(): Array<{ produtoId: string; quantidade: number }> {
    return [...this.stockNotifications];
  }

  clearHistory(): void {
    this.emailsSent = [];
    this.smssSent = [];
    this.stockNotifications = [];
  }

  // Simulate processing delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
