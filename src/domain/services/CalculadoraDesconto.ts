import { Money } from '../value-objects/Money.js';
import { Pedido } from '../entities/Pedido.js';

// Strategy Pattern para diferentes tipos de desconto
export interface IDescontoStrategy {
  calcular(valor: Money, parametros?: Record<string, unknown>): Money;
  podeAplicar(valor: Money, parametros?: Record<string, unknown>): boolean;
}

// Desconto por quantidade de itens
export class DescontoPorQuantidadeStrategy implements IDescontoStrategy {
  calcular(valorTotal: Money, parametros?: Record<string, unknown>): Money {
    const quantidade = parametros?.quantidade as number || 0;
    const limiteQuantidade = parametros?.limiteQuantidade as number || 10;
    const percentual = parametros?.percentual as number || 5;
    
    if (quantidade >= limiteQuantidade) {
      return valorTotal.multiply(percentual / 100);
    }
    
    return Money.zero(valorTotal.moeda);
  }

  podeAplicar(valor: Money, parametros?: Record<string, unknown>): boolean {
    const quantidade = parametros?.quantidade as number || 0;
    const limiteQuantidade = parametros?.limiteQuantidade as number || 10;
    
    return quantidade >= limiteQuantidade && valor.valor > 0;
  }
}

// Desconto por valor total
export class DescontoPorValorTotalStrategy implements IDescontoStrategy {
  calcular(valorTotal: Money, parametros?: Record<string, unknown>): Money {
    const limiteValor = parametros?.limiteValor as number || 500;
    const percentual = parametros?.percentual as number || 10;
    
    if (valorTotal.valor >= limiteValor) {
      return valorTotal.multiply(percentual / 100);
    }
    
    return Money.zero(valorTotal.moeda);
  }

  podeAplicar(valor: Money, parametros?: Record<string, unknown>): boolean {
    const limiteValor = parametros?.limiteValor as number || 500;
    
    return valor.valor >= limiteValor;
  }
}

// Desconto por cupom
export class DescontoPorCupomStrategy implements IDescontoStrategy {
  private readonly cuponsValidos: Map<string, { percentual: number; valorMinimo?: number; ativo: boolean }>;

  constructor() {
    this.cuponsValidos = new Map([
      ['DESCONTO10', { percentual: 10, valorMinimo: 50, ativo: true }],
      ['DESCONTO15', { percentual: 15, valorMinimo: 100, ativo: true }],
      ['DESCONTO20', { percentual: 20, valorMinimo: 200, ativo: true }],
      ['FRETEGRATIS', { percentual: 5, valorMinimo: 100, ativo: true }],
      ['BLACKFRIDAY', { percentual: 25, valorMinimo: 150, ativo: true }]
    ]);
  }

  calcular(valorTotal: Money, parametros?: Record<string, unknown>): Money {
    const cupom = parametros?.cupom as string;
    
    if (!cupom || !this.cuponsValidos.has(cupom)) {
      return Money.zero(valorTotal.moeda);
    }

    const configCupom = this.cuponsValidos.get(cupom)!;
    
    if (!configCupom.ativo) {
      return Money.zero(valorTotal.moeda);
    }

    if (configCupom.valorMinimo && valorTotal.valor < configCupom.valorMinimo) {
      return Money.zero(valorTotal.moeda);
    }

    return valorTotal.multiply(configCupom.percentual / 100);
  }

  podeAplicar(valor: Money, parametros?: Record<string, unknown>): boolean {
    const cupom = parametros?.cupom as string;
    
    if (!cupom || !this.cuponsValidos.has(cupom)) {
      return false;
    }

    const configCupom = this.cuponsValidos.get(cupom)!;
    
    if (!configCupom.ativo) {
      return false;
    }

    if (configCupom.valorMinimo && valor.valor < configCupom.valorMinimo) {
      return false;
    }

    return true;
  }

  adicionarCupom(codigo: string, percentual: number, valorMinimo?: number): void {
    this.cuponsValidos.set(codigo, { percentual, valorMinimo, ativo: true });
  }

  desativarCupom(codigo: string): void {
    const cupom = this.cuponsValidos.get(codigo);
    if (cupom) {
      cupom.ativo = false;
    }
  }

  getCuponsAtivos(): string[] {
    return Array.from(this.cuponsValidos.entries())
      .filter(([, config]) => config.ativo)
      .map(([codigo]) => codigo);
  }
}

// Service principal que utiliza as strategies
export class CalculadoraDescontoService {
  private readonly descontoPorQuantidade: DescontoPorQuantidadeStrategy;
  private readonly descontoPorValorTotal: DescontoPorValorTotalStrategy;
  private readonly descontoPorCupom: DescontoPorCupomStrategy;

  constructor() {
    this.descontoPorQuantidade = new DescontoPorQuantidadeStrategy();
    this.descontoPorValorTotal = new DescontoPorValorTotalStrategy();
    this.descontoPorCupom = new DescontoPorCupomStrategy();
  }

  async calcularDescontoPorQuantidade(quantidade: number, precoUnitario: Money): Promise<Money> {
    const valorTotal = precoUnitario.multiply(quantidade);
    return this.descontoPorQuantidade.calcular(valorTotal, { 
      quantidade, 
      limiteQuantidade: 10, 
      percentual: 5 
    });
  }

  async calcularDescontoPorValorTotal(valorTotal: Money): Promise<Money> {
    return this.descontoPorValorTotal.calcular(valorTotal, { 
      limiteValor: 500, 
      percentual: 10 
    });
  }

  async aplicarCupomDesconto(cupom: string, valorTotal: Money): Promise<Money> {
    return this.descontoPorCupom.calcular(valorTotal, { cupom });
  }

  async calcularDescontoTotal(pedido: Pedido, cupom?: string): Promise<Money> {
    const valorTotal = pedido.calcularTotal();
    const quantidadeTotal = pedido.calcularQuantidadeItens();

    if (valorTotal.isZero()) {
      return Money.zero(valorTotal.moeda);
    }

    let descontoTotal = Money.zero(valorTotal.moeda);

    // Aplicar desconto por quantidade (se aplicável)
    const descontoQuantidade = await this.calcularDescontoPorQuantidade(quantidadeTotal, valorTotal.divide(quantidadeTotal));
    if (descontoQuantidade.valor > 0) {
      descontoTotal = descontoTotal.add(descontoQuantidade);
    }

    // Aplicar desconto por valor total (se aplicável)
    const descontoValor = await this.calcularDescontoPorValorTotal(valorTotal);
    if (descontoValor.valor > 0) {
      descontoTotal = descontoTotal.add(descontoValor);
    }

    // Aplicar cupom de desconto (se fornecido e válido)
    if (cupom) {
      const descontoCupom = await this.aplicarCupomDesconto(cupom, valorTotal);
      if (descontoCupom.valor > 0) {
        descontoTotal = descontoTotal.add(descontoCupom);
      }
    }

    // Garantir que o desconto não seja maior que o valor total
    if (descontoTotal.isGreaterThan(valorTotal)) {
      return valorTotal;
    }

    return descontoTotal;
  }

  // Métodos utilitários
  getCuponsAtivos(): string[] {
    return this.descontoPorCupom.getCuponsAtivos();
  }

  adicionarCupom(codigo: string, percentual: number, valorMinimo?: number): void {
    this.descontoPorCupom.adicionarCupom(codigo, percentual, valorMinimo);
  }

  desativarCupom(codigo: string): void {
    this.descontoPorCupom.desativarCupom(codigo);
  }

  async calcularDesconto(pedido: Pedido, tipoDesconto: 'quantidade' | 'valor' | 'cupom', parametros?: Record<string, unknown>): Promise<Money> {
    const valorTotal = pedido.calcularTotal();
    
    switch (tipoDesconto) {
      case 'quantidade':
        return this.descontoPorQuantidade.calcular(valorTotal, {
          quantidade: pedido.calcularQuantidadeItens(),
          ...parametros
        });
      
      case 'valor':
        return this.descontoPorValorTotal.calcular(valorTotal, parametros);
      
      case 'cupom':
        return this.descontoPorCupom.calcular(valorTotal, parametros);
      
      default:
        return Money.zero(valorTotal.moeda);
    }
  }
}
