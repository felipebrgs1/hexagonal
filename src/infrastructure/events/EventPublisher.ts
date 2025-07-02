import type { DomainEvent, IEventDispatcher } from '../events/EventDispatcher.js';
import type { IMessagePublisher } from '../messaging/RabbitMQAdapter.js';
import type { ILogger } from '../logger/Logger.js';

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

export class EventPublisher implements IEventPublisher {
  constructor(
    private messagePublisher: IMessagePublisher,
    private eventDispatcher: IEventDispatcher,
    private logger: ILogger
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      // First dispatch locally for immediate handlers
      await this.eventDispatcher.dispatch(event);
      
      // Then publish to message queue for external handlers
      await this.messagePublisher.publish(
        'domain.events',
        event.eventType,
        {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          occurredOn: event.occurredOn.toISOString(),
          payload: event.payload
        }
      );

      this.logger.debug('Event published successfully', { 
        eventType: event.eventType, 
        eventId: event.eventId 
      });
    } catch (error) {
      this.logger.error('Failed to publish event:', { 
        error: (error as Error).message,
        eventType: event.eventType,
        eventId: event.eventId
      });
      throw error;
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.all(promises);
  }
}
