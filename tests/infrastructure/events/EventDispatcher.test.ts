import { EventDispatcher, BaseDomainEvent } from '../../../src/infrastructure/events/EventDispatcher';

describe('EventDispatcher', () => {
  let eventDispatcher: EventDispatcher;

  beforeEach(() => {
    eventDispatcher = new EventDispatcher();
  });

  describe('subscribe and dispatch', () => {
    it('should handle events correctly', async () => {
      // Arrange
      const handler = {
        handle: jest.fn().mockResolvedValue(undefined)
      };

      class TestEvent extends BaseDomainEvent {
        constructor(aggregateId: string, payload: Record<string, unknown>) {
          super('test.event', aggregateId, payload);
        }
      }

      const testEvent = new TestEvent('test-id', { test: 'data' });

      // Act
      eventDispatcher.subscribe('test.event', handler);
      await eventDispatcher.dispatch(testEvent);

      // Assert
      expect(handler.handle).toHaveBeenCalledTimes(1);
      expect(handler.handle).toHaveBeenCalledWith(testEvent);
    });

    it('should handle multiple handlers for same event type', async () => {
      // Arrange
      const handler1 = {
        handle: jest.fn().mockResolvedValue(undefined)
      };
      const handler2 = {
        handle: jest.fn().mockResolvedValue(undefined)
      };

      class TestEvent extends BaseDomainEvent {
        constructor() {
          super('test.event', 'test-id', {});
        }
      }

      const testEvent = new TestEvent();

      // Act
      eventDispatcher.subscribe('test.event', handler1);
      eventDispatcher.subscribe('test.event', handler2);
      await eventDispatcher.dispatch(testEvent);

      // Assert
      expect(handler1.handle).toHaveBeenCalledTimes(1);
      expect(handler2.handle).toHaveBeenCalledTimes(1);
    });

    it('should dispatch multiple events', async () => {
      // Arrange
      const handler = {
        handle: jest.fn().mockResolvedValue(undefined)
      };

      class TestEvent extends BaseDomainEvent {
        constructor(id: string) {
          super('test.event', id, {});
        }
      }

      const events = [
        new TestEvent('id1'),
        new TestEvent('id2')
      ];

      // Act
      eventDispatcher.subscribe('test.event', handler);
      await eventDispatcher.dispatchAll(events);

      // Assert
      expect(handler.handle).toHaveBeenCalledTimes(2);
    });
  });

  describe('BaseDomainEvent', () => {
    it('should create event with required properties', () => {
      // Arrange & Act
      class TestEvent extends BaseDomainEvent {
        constructor() {
          super('test.event', 'test-id', { test: 'data' });
        }
      }

      const event = new TestEvent();

      // Assert
      expect(event.eventType).toBe('test.event');
      expect(event.aggregateId).toBe('test-id');
      expect(event.payload).toEqual({ test: 'data' });
      expect(event.eventId).toBeDefined();
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });
});
