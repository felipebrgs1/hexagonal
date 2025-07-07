import { ItemPedido, ProdutoInfo } from '@/domain/value-objects/ItemPedido.js';
import { Money } from '@/domain/value-objects/Money.js';

describe('ItemPedido Value Object', () => {
  const produtoValido: ProdutoInfo = {
    id: 'prod-123',
    nome: 'Produto Teste',
    descricao: 'Descrição do produto'
  };

  const precoValido = new Money(50, 'BRL');

  describe('Construction', () => {
    it('should create item with valid data', () => {
      const item = new ItemPedido(produtoValido, 2, precoValido);
      
      expect(item.produto).toEqual(produtoValido);
      expect(item.quantidade).toBe(2);
      expect(item.precoUnitario.valor).toBe(50);
      expect(item.precoTotal.valor).toBe(100);
    });

    it('should calculate total price correctly', () => {
      const item = new ItemPedido(produtoValido, 3, new Money(25.50, 'BRL'));
      
      expect(item.precoTotal.valor).toBe(76.5);
    });

    it('should throw error for invalid produto', () => {
      expect(() => new ItemPedido(null as unknown as ProdutoInfo, 1, precoValido))
        .toThrow('Produto é obrigatório');
      
      expect(() => new ItemPedido({ id: '', nome: 'test' }, 1, precoValido))
        .toThrow('ID do produto é obrigatório');
      
      expect(() => new ItemPedido({ id: 'test', nome: '' }, 1, precoValido))
        .toThrow('Nome do produto é obrigatório');
    });

    it('should throw error for invalid quantidade', () => {
      expect(() => new ItemPedido(produtoValido, 0, precoValido))
        .toThrow('Quantidade deve ser maior que zero');
      
      expect(() => new ItemPedido(produtoValido, -1, precoValido))
        .toThrow('Quantidade deve ser maior que zero');
      
      expect(() => new ItemPedido(produtoValido, 1.5, precoValido))
        .toThrow('Quantidade deve ser um número inteiro');
      
      expect(() => new ItemPedido(produtoValido, 1001, precoValido))
        .toThrow('Quantidade não pode ser maior que 1000');
    });

    it('should throw error for invalid precoUnitario', () => {
      expect(() => new ItemPedido(produtoValido, 1, null as unknown as Money))
        .toThrow('Preço unitário é obrigatório');
      
      expect(() => new ItemPedido(produtoValido, 1, Money.zero()))
        .toThrow('Preço unitário deve ser maior que zero');
    });
  });

  describe('Immutability', () => {
    it('should return copy of produto to maintain immutability', () => {
      const item = new ItemPedido(produtoValido, 1, precoValido);
      
      const produtoRetornado = item.produto;
      produtoRetornado.nome = 'Nome Alterado';
      
      expect(item.produto.nome).toBe('Produto Teste'); // Original não foi alterado
    });

    it('should create new instance when changing quantidade', () => {
      const item = new ItemPedido(produtoValido, 2, precoValido);
      
      const novoItem = item.alterarQuantidade(5);
      
      expect(item.quantidade).toBe(2); // Original não mudou
      expect(novoItem.quantidade).toBe(5);
      expect(novoItem.precoTotal.valor).toBe(250); // 5 * 50
    });

    it('should create new instance when changing preco', () => {
      const item = new ItemPedido(produtoValido, 2, precoValido);
      const novoPreco = new Money(75, 'BRL');
      
      const novoItem = item.alterarPrecoUnitario(novoPreco);
      
      expect(item.precoUnitario.valor).toBe(50); // Original não mudou
      expect(novoItem.precoUnitario.valor).toBe(75);
      expect(novoItem.precoTotal.valor).toBe(150); // 2 * 75
    });
  });

  describe('Comparisons', () => {
    it('should check equality correctly', () => {
      const item1 = new ItemPedido(produtoValido, 2, precoValido);
      const item2 = new ItemPedido(produtoValido, 2, precoValido);
      const item3 = new ItemPedido(produtoValido, 3, precoValido);
      
      expect(item1.equals(item2)).toBe(true);
      expect(item1.equals(item3)).toBe(false);
    });

    it('should identify same produto correctly', () => {
      const produto1 = { id: 'prod-1', nome: 'Produto 1' };
      const produto2 = { id: 'prod-2', nome: 'Produto 2' };
      
      const item1 = new ItemPedido(produto1, 1, precoValido);
      const item2 = new ItemPedido(produto1, 2, precoValido);
      const item3 = new ItemPedido(produto2, 1, precoValido);
      
      expect(item1.isMesmoProduto(item2)).toBe(true);
      expect(item1.isMesmoProduto(item3)).toBe(false);
    });
  });

  describe('Discounts', () => {
    it('should calculate discount correctly', () => {
      const item = new ItemPedido(produtoValido, 2, new Money(100, 'BRL')); // Total: 200
      
      const desconto = item.calcularDesconto(10); // 10%
      
      expect(desconto.valor).toBe(20); // 10% de 200
    });

    it('should apply discount correctly', () => {
      const item = new ItemPedido(produtoValido, 2, new Money(100, 'BRL')); // Total: 200
      
      const resultado = item.aplicarDesconto(10); // 10%
      
      expect(resultado.desconto.valor).toBe(20);
      expect(resultado.item.precoUnitario.valor).toBe(90); // 100 - 10%
      expect(resultado.item.precoTotal.valor).toBe(180); // 2 * 90
    });

    it('should throw error for invalid discount percentage', () => {
      const item = new ItemPedido(produtoValido, 1, precoValido);
      
      expect(() => item.calcularDesconto(-5)).toThrow('Percentual de desconto deve estar entre 0 e 100');
      expect(() => item.calcularDesconto(101)).toThrow('Percentual de desconto deve estar entre 0 e 100');
    });
  });

  describe('Utility methods', () => {
    it('should format toString correctly', () => {
      const item = new ItemPedido(produtoValido, 3, new Money(25.50, 'BRL'));
      
      const expected = 'Produto Teste (3x R$ 25.50) = R$ 76.50';
      expect(item.toString()).toBe(expected);
    });

    it('should serialize to JSON correctly', () => {
      const item = new ItemPedido(produtoValido, 2, precoValido);
      
      const json = item.toJSON();
      
      expect(json).toEqual({
        produto: produtoValido,
        quantidade: 2,
        precoUnitario: { valor: 50, moeda: 'BRL' },
        precoTotal: { valor: 100, moeda: 'BRL' }
      });
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        produto: produtoValido,
        quantidade: 2,
        precoUnitario: { valor: 50, moeda: 'BRL' as const }
      };
      
      const item = ItemPedido.fromJSON(json);
      
      expect(item.produto).toEqual(produtoValido);
      expect(item.quantidade).toBe(2);
      expect(item.precoUnitario.valor).toBe(50);
      expect(item.precoTotal.valor).toBe(100);
    });
  });
});
