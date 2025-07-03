import { StatusPedido, StatusPedidoVO } from '../../../src/domain/value-objects/StatusPedido.js';

describe('StatusPedido Value Object', () => {
  describe('Construction', () => {
    it('should create status with valid enum value', () => {
      const status = new StatusPedidoVO(StatusPedido.PENDENTE);
      
      expect(status.status).toBe(StatusPedido.PENDENTE);
    });

    it('should throw error for invalid status', () => {
      expect(() => new StatusPedidoVO('INVALID' as StatusPedido))
        .toThrow('Status inválido: INVALID');
    });
  });

  describe('Status checks', () => {
    it('should correctly identify status types', () => {
      const pendente = new StatusPedidoVO(StatusPedido.PENDENTE);
      const confirmado = new StatusPedidoVO(StatusPedido.CONFIRMADO);
      const cancelado = new StatusPedidoVO(StatusPedido.CANCELADO);
      const entregue = new StatusPedidoVO(StatusPedido.ENTREGUE);
      
      expect(pendente.isPendente()).toBe(true);
      expect(confirmado.isConfirmado()).toBe(true);
      expect(cancelado.isCancelado()).toBe(true);
      expect(entregue.isEntregue()).toBe(true);
      
      expect(pendente.isConfirmado()).toBe(false);
      expect(confirmado.isPendente()).toBe(false);
    });

    it('should identify final status correctly', () => {
      const entregue = new StatusPedidoVO(StatusPedido.ENTREGUE);
      const cancelado = new StatusPedidoVO(StatusPedido.CANCELADO);
      const pendente = new StatusPedidoVO(StatusPedido.PENDENTE);
      
      expect(entregue.isFinalStatus()).toBe(true);
      expect(cancelado.isFinalStatus()).toBe(true);
      expect(pendente.isFinalStatus()).toBe(false);
    });
  });

  describe('Transitions', () => {
    it('should allow valid transitions from PENDENTE', () => {
      const pendente = new StatusPedidoVO(StatusPedido.PENDENTE);
      
      expect(pendente.canTransitionTo(StatusPedido.CONFIRMADO)).toBe(true);
      expect(pendente.canTransitionTo(StatusPedido.CANCELADO)).toBe(true);
      expect(pendente.canTransitionTo(StatusPedido.PREPARANDO)).toBe(false);
      expect(pendente.canTransitionTo(StatusPedido.ENTREGUE)).toBe(false);
    });

    it('should allow valid transitions from CONFIRMADO', () => {
      const confirmado = new StatusPedidoVO(StatusPedido.CONFIRMADO);
      
      expect(confirmado.canTransitionTo(StatusPedido.PREPARANDO)).toBe(true);
      expect(confirmado.canTransitionTo(StatusPedido.CANCELADO)).toBe(true);
      expect(confirmado.canTransitionTo(StatusPedido.PENDENTE)).toBe(false);
      expect(confirmado.canTransitionTo(StatusPedido.ENTREGUE)).toBe(false);
    });

    it('should not allow transitions from final status', () => {
      const entregue = new StatusPedidoVO(StatusPedido.ENTREGUE);
      const cancelado = new StatusPedidoVO(StatusPedido.CANCELADO);
      
      expect(entregue.canTransitionTo(StatusPedido.PENDENTE)).toBe(false);
      expect(cancelado.canTransitionTo(StatusPedido.CONFIRMADO)).toBe(false);
    });

    it('should return valid transitions correctly', () => {
      const pendente = new StatusPedidoVO(StatusPedido.PENDENTE);
      const confirmado = new StatusPedidoVO(StatusPedido.CONFIRMADO);
      const entregue = new StatusPedidoVO(StatusPedido.ENTREGUE);
      
      expect(pendente.getValidTransitions()).toEqual([
        StatusPedido.CONFIRMADO,
        StatusPedido.CANCELADO
      ]);
      
      expect(confirmado.getValidTransitions()).toEqual([
        StatusPedido.PREPARANDO,
        StatusPedido.CANCELADO
      ]);
      
      expect(entregue.getValidTransitions()).toEqual([]);
    });
  });

  describe('Equality', () => {
    it('should check equality correctly', () => {
      const status1 = new StatusPedidoVO(StatusPedido.PENDENTE);
      const status2 = new StatusPedidoVO(StatusPedido.PENDENTE);
      const status3 = new StatusPedidoVO(StatusPedido.CONFIRMADO);
      
      expect(status1.equals(status2)).toBe(true);
      expect(status1.equals(status3)).toBe(false);
    });
  });

  describe('Utility methods', () => {
    it('should convert to string correctly', () => {
      const status = new StatusPedidoVO(StatusPedido.PENDENTE);
      
      expect(status.toString()).toBe('PENDENTE');
    });

    it('should serialize to JSON correctly', () => {
      const status = new StatusPedidoVO(StatusPedido.CONFIRMADO);
      
      const json = status.toJSON();
      
      expect(json).toEqual({ status: StatusPedido.CONFIRMADO });
    });

    it('should deserialize from JSON correctly', () => {
      const json = { status: StatusPedido.PREPARANDO };
      
      const status = StatusPedidoVO.fromJSON(json);
      
      expect(status.status).toBe(StatusPedido.PREPARANDO);
    });
  });

  describe('Factory methods', () => {
    it('should create status objects with factory methods', () => {
      expect(StatusPedidoVO.pendente().status).toBe(StatusPedido.PENDENTE);
      expect(StatusPedidoVO.confirmado().status).toBe(StatusPedido.CONFIRMADO);
      expect(StatusPedidoVO.preparando().status).toBe(StatusPedido.PREPARANDO);
      expect(StatusPedidoVO.pronto().status).toBe(StatusPedido.PRONTO);
      expect(StatusPedidoVO.enviado().status).toBe(StatusPedido.ENVIADO);
      expect(StatusPedidoVO.entregue().status).toBe(StatusPedido.ENTREGUE);
      expect(StatusPedidoVO.cancelado().status).toBe(StatusPedido.CANCELADO);
    });
  });
});
