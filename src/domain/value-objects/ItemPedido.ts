import { Money, Moeda } from './Money.js';

export interface ProdutoInfo {
  id: string;
  nome: string;
  descricao?: string;
}

export class ItemPedido {
  private readonly _produto: ProdutoInfo;
  private readonly _quantidade: number;
  private readonly _precoUnitario: Money;
  private readonly _precoTotal: Money;

  constructor(produto: ProdutoInfo, quantidade: number, precoUnitario: Money) {
    this.validateProduto(produto);
    this.validateQuantidade(quantidade);
    this.validatePrecoUnitario(precoUnitario);

    this._produto = { ...produto }; // Clone para imutabilidade
    this._quantidade = quantidade;
    this._precoUnitario = precoUnitario;
    this._precoTotal = precoUnitario.multiply(quantidade);
  }

  get produto(): ProdutoInfo {
    return { ...this._produto }; // Retorna clone para manter imutabilidade
  }

  get quantidade(): number {
    return this._quantidade;
  }

  get precoUnitario(): Money {
    return this._precoUnitario;
  }

  get precoTotal(): Money {
    return this._precoTotal;
  }

  private validateProduto(produto: ProdutoInfo): void {
    if (!produto) {
      throw new Error('Produto é obrigatório');
    }
    if (!produto.id || produto.id.trim() === '') {
      throw new Error('ID do produto é obrigatório');
    }
    if (!produto.nome || produto.nome.trim() === '') {
      throw new Error('Nome do produto é obrigatório');
    }
  }

  private validateQuantidade(quantidade: number): void {
    if (!Number.isInteger(quantidade)) {
      throw new Error('Quantidade deve ser um número inteiro');
    }
    if (quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    if (quantidade > 1000) {
      throw new Error('Quantidade não pode ser maior que 1000');
    }
  }

  private validatePrecoUnitario(preco: Money): void {
    if (!preco) {
      throw new Error('Preço unitário é obrigatório');
    }
    if (preco.isZero()) {
      throw new Error('Preço unitário deve ser maior que zero');
    }
  }

  alterarQuantidade(novaQuantidade: number): ItemPedido {
    return new ItemPedido(this._produto, novaQuantidade, this._precoUnitario);
  }

  alterarPrecoUnitario(novoPreco: Money): ItemPedido {
    return new ItemPedido(this._produto, this._quantidade, novoPreco);
  }

  equals(other: ItemPedido): boolean {
    return (
      this._produto.id === other._produto.id &&
      this._quantidade === other._quantidade &&
      this._precoUnitario.equals(other._precoUnitario)
    );
  }

  isMesmoProduto(other: ItemPedido): boolean {
    return this._produto.id === other._produto.id;
  }

  calcularDesconto(percentualDesconto: number): Money {
    if (percentualDesconto < 0 || percentualDesconto > 100) {
      throw new Error('Percentual de desconto deve estar entre 0 e 100');
    }
    
    const desconto = this._precoTotal.multiply(percentualDesconto / 100);
    return desconto;
  }

  aplicarDesconto(percentualDesconto: number): { item: ItemPedido; desconto: Money } {
    const desconto = this.calcularDesconto(percentualDesconto);
    const novoPrecoUnitario = this._precoUnitario.multiply((100 - percentualDesconto) / 100);
    const novoItem = new ItemPedido(this._produto, this._quantidade, novoPrecoUnitario);
    
    return {
      item: novoItem,
      desconto
    };
  }

  toString(): string {
    return `${this._produto.nome} (${this._quantidade}x ${this._precoUnitario.toString()}) = ${this._precoTotal.toString()}`;
  }

  toJSON(): {
    produto: ProdutoInfo;
    quantidade: number;
    precoUnitario: { valor: number; moeda: string };
    precoTotal: { valor: number; moeda: string };
  } {
    return {
      produto: this._produto,
      quantidade: this._quantidade,
      precoUnitario: this._precoUnitario.toJSON(),
      precoTotal: this._precoTotal.toJSON()
    };
  }

  static fromJSON(data: {
    produto: ProdutoInfo;
    quantidade: number;
    precoUnitario: { valor: number; moeda: Moeda };
  }): ItemPedido {
    const precoUnitario = Money.fromJSON(data.precoUnitario);
    return new ItemPedido(data.produto, data.quantidade, precoUnitario);
  }
}
