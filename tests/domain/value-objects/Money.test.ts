import { Money, Moeda } from '@/domain/value-objects/Money.js';
import { describe, it, expect } from 'vitest';

describe('Money Value Object', () => {
  describe('Construction', () => {
    it('should create money with valid valor and moeda', () => {
      const money = new Money(100.50, 'BRL');
      
      expect(money.valor).toBe(100.50);
      expect(money.moeda).toBe('BRL');
    });

    it('should default to BRL when no moeda is provided', () => {
      const money = new Money(100);
      
      expect(money.moeda).toBe('BRL');
    });

    it('should round valor to two decimal places', () => {
      const money = new Money(100.999);
      
      expect(money.valor).toBe(101.00);
    });

    it('should throw error for negative valor', () => {
      expect(() => new Money(-10)).toThrow('Valor não pode ser negativo');
    });

    it('should throw error for invalid valor', () => {
      expect(() => new Money(NaN)).toThrow('Valor deve ser um número válido');
      expect(() => new Money(Infinity)).toThrow('Valor deve ser um número válido');
    });

    it('should throw error for invalid moeda', () => {
      expect(() => new Money(100, 'INVALID' as Moeda)).toThrow('Moeda inválida: INVALID');
    });
  });

  describe('Operations', () => {
    it('should add two money objects with same currency', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(50, 'BRL');
      
      const result = money1.add(money2);
      
      expect(result.valor).toBe(150);
      expect(result.moeda).toBe('BRL');
    });

    it('should throw error when adding different currencies', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(50, 'USD');
      
      expect(() => money1.add(money2)).toThrow('Não é possível operar com moedas diferentes: BRL e USD');
    });

    it('should subtract two money objects', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(30, 'BRL');
      
      const result = money1.subtract(money2);
      
      expect(result.valor).toBe(70);
    });

    it('should throw error when subtraction results in negative', () => {
      const money1 = new Money(30, 'BRL');
      const money2 = new Money(100, 'BRL');
      
      expect(() => money1.subtract(money2)).toThrow('Resultado da subtração não pode ser negativo');
    });

    it('should multiply money by positive number', () => {
      const money = new Money(50, 'BRL');
      
      const result = money.multiply(3);
      
      expect(result.valor).toBe(150);
    });

    it('should throw error when multiplying by negative number', () => {
      const money = new Money(50, 'BRL');
      
      expect(() => money.multiply(-2)).toThrow('Multiplicador não pode ser negativo');
    });

    it('should divide money by positive number', () => {
      const money = new Money(100, 'BRL');
      
      const result = money.divide(4);
      
      expect(result.valor).toBe(25);
    });

    it('should throw error when dividing by zero or negative', () => {
      const money = new Money(100, 'BRL');
      
      expect(() => money.divide(0)).toThrow('Divisor deve ser maior que zero');
      expect(() => money.divide(-2)).toThrow('Divisor deve ser maior que zero');
    });
  });

  describe('Comparisons', () => {
    it('should check equality correctly', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(100, 'BRL');
      const money3 = new Money(100, 'USD');
      
      expect(money1.equals(money2)).toBe(true);
      expect(money1.equals(money3)).toBe(false);
    });

    it('should compare values correctly', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(50, 'BRL');
      const money3 = new Money(150, 'BRL');
      
      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money1.isLessThan(money3)).toBe(true);
      expect(money2.isLessThan(money1)).toBe(true);
    });

    it('should identify zero values', () => {
      const money1 = new Money(0, 'BRL');
      const money2 = new Money(100, 'BRL');
      
      expect(money1.isZero()).toBe(true);
      expect(money2.isZero()).toBe(false);
    });
  });

  describe('Utility methods', () => {
    it('should format toString correctly', () => {
      const moneyBRL = new Money(100.50, 'BRL');
      const moneyUSD = new Money(75.25, 'USD');
      const moneyEUR = new Money(85.75, 'EUR');
      
      expect(moneyBRL.toString()).toBe('R$ 100.50');
      expect(moneyUSD.toString()).toBe('$ 75.25');
      expect(moneyEUR.toString()).toBe('€ 85.75');
    });

    it('should serialize to JSON correctly', () => {
      const money = new Money(100.50, 'BRL');
      
      const json = money.toJSON();
      
      expect(json).toEqual({ valor: 100.50, moeda: 'BRL' });
    });

    it('should deserialize from JSON correctly', () => {
      const json = { valor: 100.50, moeda: 'BRL' as Moeda };
      
      const money = Money.fromJSON(json);
      
      expect(money.valor).toBe(100.50);
      expect(money.moeda).toBe('BRL');
    });

    it('should create zero money', () => {
      const zeroBRL = Money.zero('BRL');
      const zeroUSD = Money.zero('USD');
      const zeroDefault = Money.zero();
      
      expect(zeroBRL.valor).toBe(0);
      expect(zeroBRL.moeda).toBe('BRL');
      expect(zeroUSD.moeda).toBe('USD');
      expect(zeroDefault.moeda).toBe('BRL');
    });
  });
});
