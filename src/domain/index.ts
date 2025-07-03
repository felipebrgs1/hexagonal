// Value Objects
export { Money, Moeda } from './value-objects/Money.js';
export { StatusPedido, StatusPedidoVO } from './value-objects/StatusPedido.js';
export { ItemPedido, ProdutoInfo } from './value-objects/ItemPedido.js';

// Entities
export { Pedido, PedidoProps } from './entities/Pedido.js';

// Domain Events
export {
  DomainEvent,
  BaseDomainEvent,
  PedidoCriado,
  ItemAdicionado,
  ItemRemovido,
  StatusAlterado,
  PedidoConfirmado,
  PedidoEntregue,
  PedidoPago,
  QuantidadeItemAlterada
} from './events/DomainEvent.js';
