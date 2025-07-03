export enum StatusPedido {
  PENDENTE = 'PENDENTE',
  CONFIRMADO = 'CONFIRMADO',
  PREPARANDO = 'PREPARANDO',
  PRONTO = 'PRONTO',
  ENVIADO = 'ENVIADO',
  ENTREGUE = 'ENTREGUE',
  CANCELADO = 'CANCELADO'
}

export class StatusPedidoVO {
  private readonly _status: StatusPedido;

  constructor(status: StatusPedido) {
    this.validateStatus(status);
    this._status = status;
  }

  get status(): StatusPedido {
    return this._status;
  }

  private validateStatus(status: StatusPedido): void {
    if (!Object.values(StatusPedido).includes(status)) {
      throw new Error(`Status inválido: ${status}`);
    }
  }

  equals(other: StatusPedidoVO): boolean {
    return this._status === other._status;
  }

  isPendente(): boolean {
    return this._status === StatusPedido.PENDENTE;
  }

  isConfirmado(): boolean {
    return this._status === StatusPedido.CONFIRMADO;
  }

  isPreparando(): boolean {
    return this._status === StatusPedido.PREPARANDO;
  }

  isPronto(): boolean {
    return this._status === StatusPedido.PRONTO;
  }

  isEnviado(): boolean {
    return this._status === StatusPedido.ENVIADO;
  }

  isEntregue(): boolean {
    return this._status === StatusPedido.ENTREGUE;
  }

  isCancelado(): boolean {
    return this._status === StatusPedido.CANCELADO;
  }

  canTransitionTo(newStatus: StatusPedido): boolean {
    const transitions: Record<StatusPedido, StatusPedido[]> = {
      [StatusPedido.PENDENTE]: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
      [StatusPedido.CONFIRMADO]: [StatusPedido.PREPARANDO, StatusPedido.CANCELADO],
      [StatusPedido.PREPARANDO]: [StatusPedido.PRONTO, StatusPedido.CANCELADO],
      [StatusPedido.PRONTO]: [StatusPedido.ENVIADO],
      [StatusPedido.ENVIADO]: [StatusPedido.ENTREGUE],
      [StatusPedido.ENTREGUE]: [],
      [StatusPedido.CANCELADO]: []
    };

    return transitions[this._status].includes(newStatus);
  }

  getValidTransitions(): StatusPedido[] {
    const transitions: Record<StatusPedido, StatusPedido[]> = {
      [StatusPedido.PENDENTE]: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
      [StatusPedido.CONFIRMADO]: [StatusPedido.PREPARANDO, StatusPedido.CANCELADO],
      [StatusPedido.PREPARANDO]: [StatusPedido.PRONTO, StatusPedido.CANCELADO],
      [StatusPedido.PRONTO]: [StatusPedido.ENVIADO],
      [StatusPedido.ENVIADO]: [StatusPedido.ENTREGUE],
      [StatusPedido.ENTREGUE]: [],
      [StatusPedido.CANCELADO]: []
    };

    return transitions[this._status];
  }

  isFinalStatus(): boolean {
    return this._status === StatusPedido.ENTREGUE || this._status === StatusPedido.CANCELADO;
  }

  toString(): string {
    return this._status;
  }

  toJSON(): { status: StatusPedido } {
    return {
      status: this._status
    };
  }

  static fromJSON(data: { status: StatusPedido }): StatusPedidoVO {
    return new StatusPedidoVO(data.status);
  }

  static pendente(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.PENDENTE);
  }

  static confirmado(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.CONFIRMADO);
  }

  static preparando(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.PREPARANDO);
  }

  static pronto(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.PRONTO);
  }

  static enviado(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.ENVIADO);
  }

  static entregue(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.ENTREGUE);
  }

  static cancelado(): StatusPedidoVO {
    return new StatusPedidoVO(StatusPedido.CANCELADO);
  }
}
