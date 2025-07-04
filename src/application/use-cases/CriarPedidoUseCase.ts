import { Pedido } from '../../domain/entities/Pedido.js';
import { 
  ICriarPedidoUseCase, 
  CriarPedidoRequest, 
  CriarPedidoResponse,
  IPedidoRepository,
  IEventPublisher
} from '../ports/index.js';

export class CriarPedidoUseCase implements ICriarPedidoUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(request: CriarPedidoRequest): Promise<CriarPedidoResponse> {
    this.validateRequest(request);

    // Criar novo pedido
    const pedido = Pedido.criar(request.clienteId, request.observacoes);

    // Salvar no repository
    await this.pedidoRepository.save(pedido);

    // Publicar domain events
    const domainEvents = pedido.domainEvents;
    if (domainEvents.length > 0) {
      await this.eventPublisher.publishMany(domainEvents);
    }

    // Retornar response
    return {
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      status: pedido.status.status,
      dataCriacao: pedido.dataCriacao
    };
  }

  private validateRequest(request: CriarPedidoRequest): void {
    if (!request) {
      throw new Error('Request é obrigatório');
    }

    if (!request.clienteId || request.clienteId.trim() === '') {
      throw new Error('ClienteId é obrigatório');
    }

    // Validar formato do clienteId se necessário
    if (request.clienteId.length < 3) {
      throw new Error('ClienteId deve ter pelo menos 3 caracteres');
    }
  }
}
