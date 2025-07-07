import { 
  IAtualizarStatusUseCase, 
  AtualizarStatusRequest, 
  AtualizarStatusResponse,
  IPedidoRepository,
  IEventPublisher
} from '@/application/ports/index.js';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';

export class AtualizarStatusUseCase implements IAtualizarStatusUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(request: AtualizarStatusRequest): Promise<AtualizarStatusResponse> {
    this.validateRequest(request);

    // Buscar o pedido
    const pedido = await this.pedidoRepository.findById(request.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido não encontrado: ${request.pedidoId}`);
    }

    // Guardar status anterior
    const statusAnterior = pedido.status.status;

    // Atualizar status do pedido
    pedido.alterarStatus(request.novoStatus as StatusPedido);

    // Atualizar no repository
    await this.pedidoRepository.update(pedido);

    // Publicar domain events
    const domainEvents = pedido.domainEvents;
    if (domainEvents.length > 0) {
      await this.eventPublisher.publishMany(domainEvents);
    }

    // Retornar response
    return {
      pedidoId: pedido.id,
      statusAnterior: statusAnterior,
      novoStatus: pedido.status.status,
      dataAtualizacao: pedido.dataAtualizacao
    };
  }

  private validateRequest(request: AtualizarStatusRequest): void {
    if (!request) {
      throw new Error('Request é obrigatório');
    }

    if (!request.pedidoId || request.pedidoId.trim() === '') {
      throw new Error('PedidoId é obrigatório');
    }

    if (!request.novoStatus || request.novoStatus.trim() === '') {
      throw new Error('Novo status é obrigatório');
    }

    // Validar se o status é válido
    if (!Object.values(StatusPedido).includes(request.novoStatus as StatusPedido)) {
      throw new Error(`Status inválido: ${request.novoStatus}`);
    }
  }
}
