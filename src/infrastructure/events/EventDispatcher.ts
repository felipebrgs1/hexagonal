import { v4 as uuidv4 } from 'uuid';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredOn: Date;
  payload: Record<string, unknown>;
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface IEventDispatcher {
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
  dispatch(event: DomainEvent): Promise<void>;
  dispatchAll(events: DomainEvent[]): Promise<void>;
}

export class EventDispatcher implements IEventDispatcher {
  private handlers: Map<string, EventHandler<DomainEvent>[]> = new Map();

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler<DomainEvent>);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];
    
    const promises = eventHandlers.map(handler => handler.handle(event));
    await Promise.all(promises);
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.dispatch(event));
    await Promise.all(promises);
  }
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown>
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}
