import { ICalculadoraDesconto } from '@/application/ports/index.js';
import { CalculadoraDescontoService } from '@/domain/services/CalculadoraDesconto.js';
import { Money } from '@/domain/value-objects/Money.js';
import { Pedido } from '@/domain/entities/Pedido.js';

export class CalculadoraDescontoAdapter implements ICalculadoraDesconto {
  private readonly calculadoraService: CalculadoraDescontoService;

  constructor() {
    this.calculadoraService = new CalculadoraDescontoService();
  }

  async calcularDescontoPorQuantidade(quantidade: number, precoUnitario: Money): Promise<Money> {
    return this.calculadoraService.calcularDescontoPorQuantidade(quantidade, precoUnitario);
  }

  async calcularDescontoPorValorTotal(valorTotal: Money): Promise<Money> {
    return this.calculadoraService.calcularDescontoPorValorTotal(valorTotal);
  }

  async aplicarCupomDesconto(cupom: string, valorTotal: Money): Promise<Money> {
    return this.calculadoraService.aplicarCupomDesconto(cupom, valorTotal);
  }

  async calcularDescontoTotal(pedido: Pedido, cupom?: string): Promise<Money> {
    return this.calculadoraService.calcularDescontoTotal(pedido, cupom);
  }

  // Métodos adicionais para gestão de cupons
  getCuponsAtivos(): string[] {
    return this.calculadoraService.getCuponsAtivos();
  }

  adicionarCupom(codigo: string, percentual: number, valorMinimo?: number): void {
    this.calculadoraService.adicionarCupom(codigo, percentual, valorMinimo);
  }

  desativarCupom(codigo: string): void {
    this.calculadoraService.desativarCupom(codigo);
  }
}
