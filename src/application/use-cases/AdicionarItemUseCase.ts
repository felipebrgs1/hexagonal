import { 
  IAdicionarItemUseCase, 
  AdicionarItemRequest, 
  AdicionarItemResponse,
  IPedidoRepository,
  IEventPublisher
} from '@/application/ports/index.js';
import { ItemPedido, ProdutoInfo } from '@/domain/value-objects/ItemPedido.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Money, Moeda } from '@/domain/value-objects/Money.js';

export class AdicionarItemUseCase implements IAdicionarItemUseCase {
  constructor(
    private readonly pedidoRepository: IPedidoRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(request: AdicionarItemRequest): Promise<AdicionarItemResponse> {
    this.validateRequest(request);

    // Buscar o pedido
    const pedido = await this.pedidoRepository.findById(request.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido não encontrado: ${request.pedidoId}`);
    }

    // Criar o item
    const produto: ProdutoInfo = {
      id: request.produtoId,
      nome: request.nomeProduto,
      descricao: request.descricaoProduto
    };

    const precoUnitario = new Money(request.precoUnitario, request.moeda as 'BRL' | 'USD' | 'EUR');
    const item = new ItemPedido(produto, request.quantidade, precoUnitario);

    // Adicionar item ao pedido
    pedido.adicionarItem(item);

    // Atualizar no repository
    await this.pedidoRepository.update(pedido);

    // Publicar domain events
    const domainEvents = pedido.domainEvents;
    if (domainEvents.length > 0) {
      await this.eventPublisher.publishMany(domainEvents);
    }

    // Calcular novo total
    const novoTotal = pedido.calcularTotal();

    // Retornar response
    return {
      pedidoId: pedido.id,
      itemAdicionado: {
        produtoId: item.produto.id,
        nomeProduto: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario.valor,
        precoTotal: item.precoTotal.valor,
        moeda: item.precoTotal.moeda
      },
      novoTotal: novoTotal.valor
    };
  }

  private validateRequest(request: AdicionarItemRequest): void {
    if (!request) {
      throw new Error('Request é obrigatório');
    }

    if (!request.pedidoId || request.pedidoId.trim() === '') {
      throw new Error('PedidoId é obrigatório');
    }

    if (!request.produtoId || request.produtoId.trim() === '') {
      throw new Error('ProdutoId é obrigatório');
    }

    if (!request.nomeProduto || request.nomeProduto.trim() === '') {
      throw new Error('Nome do produto é obrigatório');
    }

    if (!request.quantidade || request.quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    if (!request.precoUnitario || request.precoUnitario <= 0) {
      throw new Error('Preço unitário deve ser maior que zero');
    }

    if (!request.moeda || request.moeda.trim() === '') {
      throw new Error('Moeda é obrigatória');
    }
  }
}
