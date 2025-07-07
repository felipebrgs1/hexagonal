// Logger
export type { ILogger } from './logger/Logger.js';
export { logger } from './logger/Logger.js';

// Events
export type { 
  DomainEvent, 
  EventHandler, 
  IEventDispatcher 
} from './events/EventDispatcher.js';

export { EventDispatcher, BaseDomainEvent } from './events/EventDispatcher.js';

export type { IEventPublisher } from './events/EventPublisher.js';
export { EventPublisher } from './events/EventPublisher.js';

// Messaging
export type { 
  IMessagePublisher, 
  IMessageConsumer
} from './messaging/RabbitMQAdapter.js';

export { RabbitMQAdapter } from './messaging/RabbitMQAdapter.js';

// Database
export type { IRepository } from './db/BaseRepository.js';
export { BaseRepository } from './db/BaseRepository.js';

export type { IDatabaseConnection } from './db/DatabaseConnection.js';
export { DatabaseConnection } from './db/DatabaseConnection.js';

// Infrastructure Services and Adapters
export * from './discount/CalculadoraDescontoAdapter.js';
export * from './services/MockServicoEstoque.js';
export * from './events/EstoqueEventHandler.js';
