export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredOn: Date;
  payload: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly payload: Record<string, unknown>;

  constructor(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    eventId?: string,
    occurredOn?: Date
  ) {
    this.eventId = eventId || this.generateEventId();
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = occurredOn || new Date();
    this.payload = payload;
  }

  private generateEventId(): string {
    // Simple UUID v4 generation without external library for this base case
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      payload: this.payload
    };
  }
}

// Eventos específicos do domínio de Pedidos
export class PedidoCriado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    clienteId: string;
    dataCriacao: string;
    observacoes?: string;
  }) {
    super('PedidoCriado', aggregateId, payload);
  }
}

export class ItemAdicionado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    item: Record<string, unknown>;
    novoTotal: Record<string, unknown>;
  }) {
    super('ItemAdicionado', aggregateId, payload);
  }
}

export class ItemRemovido extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    itemRemovido: Record<string, unknown>;
    novoTotal: Record<string, unknown>;
  }) {
    super('ItemRemovido', aggregateId, payload);
  }
}

export class StatusAlterado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    statusAnterior: string;
    novoStatus: string;
  }) {
    super('StatusAlterado', aggregateId, payload);
  }
}

export class PedidoConfirmado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    clienteId: string;
    total: Record<string, unknown>;
    itens: Record<string, unknown>[];
  }) {
    super('PedidoConfirmado', aggregateId, payload);
  }
}

export class PedidoEntregue extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    clienteId: string;
    dataEntrega: string;
  }) {
    super('PedidoEntregue', aggregateId, payload);
  }
}

export class PedidoPago extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    valorPago: Record<string, unknown>;
    metodoPagamento: string;
    dataPagamento: string;
  }) {
    super('PedidoPago', aggregateId, payload);
  }
}

export class QuantidadeItemAlterada extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    produtoId: string;
    quantidadeAnterior: number;
    novaQuantidade: number;
    novoTotal: Record<string, unknown>;
  }) {
    super('QuantidadeItemAlterada', aggregateId, payload);
  }
}

export class DescontoAplicado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    tipoDesconto: string;
    valorDesconto: Record<string, unknown>;
    valorAnterior: Record<string, unknown>;
    valorFinal: Record<string, unknown>;
    cupomUtilizado?: string;
  }) {
    super('DescontoAplicado', aggregateId, payload);
  }
}

export class PedidoEnviado extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    clienteId: string;
    dataEnvio: string;
    codigoRastreamento?: string;
    transportadora?: string;
  }) {
    super('PedidoEnviado', aggregateId, payload);
  }
}

export class PedidoEntregueEvent extends BaseDomainEvent {
  constructor(aggregateId: string, payload: {
    pedidoId: string;
    clienteId: string;
    dataEntrega: string;
    assinatura?: string;
    observacoes?: string;
  }) {
    super('PedidoEntregue', aggregateId, payload);
  }
}
