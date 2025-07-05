import { DomainEvent } from '../../domain/events/DomainEvent.js';
import { INotificacaoService } from '../../application/ports/index.js';
import type { ILogger } from '../logger/Logger.js';

export interface IEventHandler {
  canHandle(event: DomainEvent): boolean;
  handle(event: DomainEvent): Promise<void>;
}

export class NotificarEstoqueHandler implements IEventHandler {
  constructor(
    private readonly notificacaoService: INotificacaoService,
    private readonly logger: ILogger
  ) {}

  canHandle(event: DomainEvent): boolean {
    return ['PedidoCriado', 'ItemAdicionado'].includes(event.eventType);
  }

  async handle(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Processing stock notification event', {
        eventType: event.eventType,
        aggregateId: event.aggregateId
      });

      switch (event.eventType) {
        case 'PedidoCriado':
          await this.handlePedidoCriado(event);
          break;
        case 'ItemAdicionado':
          await this.handleItemAdicionado(event);
          break;
        default:
          this.logger.warn('Unhandled event type for stock notification', {
            eventType: event.eventType
          });
      }
    } catch (error) {
      this.logger.error('Failed to process stock notification event', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private async handlePedidoCriado(_event: DomainEvent): Promise<void> {
    // For PedidoCriado, we need to get the items from the aggregate itself
    // This is a simplified version - in a real implementation, we might need to 
    // query the pedido to get its current items
    this.logger.info('Stock notification for new order - items will be handled by separate ItemAdicionado events');
  }

  private async handleItemAdicionado(event: DomainEvent): Promise<void> {
    const { item } = event.payload;
    
    if (item && typeof item === 'object') {
      const itemData = item as Record<string, unknown>;
      await this.notificacaoService.notificarEstoque(
        itemData.produtoId as string,
        itemData.quantidade as number
      );
    }
  }
}

export class EnviarEmailHandler implements IEventHandler {
  constructor(
    private readonly notificacaoService: INotificacaoService,
    private readonly logger: ILogger
  ) {}

  canHandle(event: DomainEvent): boolean {
    return [
      'PedidoCriado',
      'StatusAlterado',
      'PedidoPago',
      'PedidoEnviado',
      'PedidoEntregue',
      'PedidoCancelado'
    ].includes(event.eventType);
  }

  async handle(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Processing email notification event', {
        eventType: event.eventType,
        aggregateId: event.aggregateId
      });

      const { clienteId } = event.payload;
      const pedidoId = event.aggregateId;

      switch (event.eventType) {
        case 'PedidoCriado':
          await this.notificacaoService.enviarEmailPedidoCriado(
            clienteId as string,
            pedidoId
          );
          break;
        case 'StatusAlterado': {
          const { novoStatus } = event.payload;
          // For StatusAlterado, we use the aggregateId as clienteId for simplicity
          // In a real system, you might need to look up the client from the pedido
          await this.notificacaoService.enviarSMSStatusAlterado(
            pedidoId, // Using pedidoId as clienteId for this demo
            pedidoId,
            novoStatus as string
          );
          break;
        }
        default:
          // For other events, we could implement specific email templates
          this.logger.info('Email notification not implemented for event type', {
            eventType: event.eventType
          });
      }
    } catch (error) {
      this.logger.error('Failed to process email notification event', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export class EventHandlerRegistry {
  private handlers: IEventHandler[] = [];

  constructor(private readonly logger: ILogger) {}

  register(handler: IEventHandler): void {
    this.handlers.push(handler);
    this.logger.info('Event handler registered', {
      handlerType: handler.constructor.name
    });
  }

  async processEvent(event: DomainEvent): Promise<void> {
    const applicableHandlers = this.handlers.filter(handler => 
      handler.canHandle(event)
    );

    if (applicableHandlers.length === 0) {
      this.logger.warn('No handlers found for event', {
        eventType: event.eventType
      });
      return;
    }

    const handlerPromises = applicableHandlers.map(async handler => {
      try {
        await handler.handle(event);
        this.logger.debug('Event processed successfully', {
          eventType: event.eventType,
          handlerType: handler.constructor.name
        });
      } catch (error) {
        this.logger.error('Handler failed to process event', {
          eventType: event.eventType,
          handlerType: handler.constructor.name,
          error: (error as Error).message
        });
        // Don't re-throw to allow other handlers to continue
      }
    });

    await Promise.allSettled(handlerPromises);
  }
}
