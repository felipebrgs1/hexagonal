import { 
  ICalcularTotalUseCase, 
  CalcularTotalRequest, 
  CalcularTotalResponse,
  IPedidoRepository,
  ICalculadoraDesconto
} from '../ports/index.js';

export class CalcularTotalUseCase implements ICalcularTotalUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly calculadoraDesconto: ICalculadoraDesconto
  ) {}

  async execute(request: CalcularTotalRequest): Promise<CalcularTotalResponse> {
    this.validateRequest(request);

    // Buscar o pedido
    const pedido = await this.pedidoRepository.findById(request.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido não encontrado: ${request.pedidoId}`);
    }

    // Calcular subtotal
    const subtotal = pedido.calcularTotal();

    // Calcular desconto
    const desconto = await this.calculadoraDesconto.calcularDescontoTotal(
      pedido, 
      request.cupomDesconto
    );

    // Calcular total final
    const total = subtotal.subtract(desconto);

    // Retornar response
    return {
      pedidoId: pedido.id,
      subtotal: subtotal.valor,
      desconto: desconto.valor,
      total: total.valor,
      moeda: total.moeda
    };
  }

  private validateRequest(request: CalcularTotalRequest): void {
    if (!request) {
      throw new Error('Request é obrigatório');
    }

    if (!request.pedidoId || request.pedidoId.trim() === '') {
      throw new Error('PedidoId é obrigatório');
    }

    // Validar cupom se fornecido
    if (request.cupomDesconto !== undefined && request.cupomDesconto.trim() === '') {
      throw new Error('Cupom de desconto não pode ser vazio');
    }
  }
}
