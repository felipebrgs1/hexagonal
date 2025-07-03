export type Moeda = 'BRL' | 'USD' | 'EUR';

export class Money {
  private readonly _valor: number;
  private readonly _moeda: Moeda;

  constructor(valor: number, moeda: Moeda = 'BRL') {
    this.validateValor(valor);
    this.validateMoeda(moeda);
    
    this._valor = this.roundToTwoDecimals(valor);
    this._moeda = moeda;
  }

  get valor(): number {
    return this._valor;
  }

  get moeda(): Moeda {
    return this._moeda;
  }

  private validateValor(valor: number): void {
    if (valor < 0) {
      throw new Error('Valor não pode ser negativo');
    }
    if (!Number.isFinite(valor)) {
      throw new Error('Valor deve ser um número válido');
    }
  }

  private validateMoeda(moeda: Moeda): void {
    const moedasValidas: Moeda[] = ['BRL', 'USD', 'EUR'];
    if (!moedasValidas.includes(moeda)) {
      throw new Error(`Moeda inválida: ${moeda}`);
    }
  }

  private roundToTwoDecimals(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  add(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this._valor + other._valor, this._moeda);
  }

  subtract(other: Money): Money {
    this.validateSameCurrency(other);
    const resultado = this._valor - other._valor;
    if (resultado < 0) {
      throw new Error('Resultado da subtração não pode ser negativo');
    }
    return new Money(resultado, this._moeda);
  }

  multiply(multiplicador: number): Money {
    if (multiplicador < 0) {
      throw new Error('Multiplicador não pode ser negativo');
    }
    return new Money(this._valor * multiplicador, this._moeda);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Divisor deve ser maior que zero');
    }
    return new Money(this._valor / divisor, this._moeda);
  }

  equals(other: Money): boolean {
    return this._valor === other._valor && this._moeda === other._moeda;
  }

  isGreaterThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._valor > other._valor;
  }

  isLessThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._valor < other._valor;
  }

  isZero(): boolean {
    return this._valor === 0;
  }

  private validateSameCurrency(other: Money): void {
    if (this._moeda !== other._moeda) {
      throw new Error(`Não é possível operar com moedas diferentes: ${this._moeda} e ${other._moeda}`);
    }
  }

  toString(): string {
    const symbol = this.getCurrencySymbol();
    return `${symbol} ${this._valor.toFixed(2)}`;
  }

  private getCurrencySymbol(): string {
    const symbols = {
      BRL: 'R$',
      USD: '$',
      EUR: '€'
    };
    return symbols[this._moeda];
  }

  toJSON(): { valor: number; moeda: Moeda } {
    return {
      valor: this._valor,
      moeda: this._moeda
    };
  }

  static fromJSON(data: { valor: number; moeda: Moeda }): Money {
    return new Money(data.valor, data.moeda);
  }

  static zero(moeda: Moeda = 'BRL'): Money {
    return new Money(0, moeda);
  }
}
