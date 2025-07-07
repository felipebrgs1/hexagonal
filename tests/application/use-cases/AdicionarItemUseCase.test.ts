import { AdicionarItemUseCase } from '@/application/use-cases/AdicionarItemUseCase.js';
import { 
  AdicionarItemRequest, 
  IPedidoRepository, 
  IEventPublisher 
} from '@/application/ports/index.js';
import { Pedido } from '@/domain/entities/Pedido.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('AdicionarItemUseCase', () => {
  let useCase: AdicionarItemUseCase;
  let mockPedidoRepository: vi.Mocked<IPedidoRepository>;
  let mockEventPublisher: vi.Mocked<IEventPublisher>;

  beforeEach(() => {
    mockPedidoRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByClienteId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn()
    };

    mockEventPublisher = {
      publish: vi.fn(),
      publishMany: vi.fn()
    };

    useCase = new AdicionarItemUseCase(mockPedidoRepository, mockEventPublisher);
  });

  describe('execute', () => {
    it('deve adicionar item ao pedido com sucesso', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-456');
      pedido.clearDomainEvents(); // Limpar eventos do construtor para não interferir no teste

      const request: AdicionarItemRequest = {
        pedidoId: pedido.id,
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        descricaoProduto: 'Descrição do produto',
        quantidade: 2,
        precoUnitario: 50.00,
        moeda: 'BRL'
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockPedidoRepository.update.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.pedidoId).toBe(request.pedidoId);
      expect(response.itemAdicionado.produtoId).toBe(request.produtoId);
      expect(response.itemAdicionado.nomeProduto).toBe(request.nomeProduto);
      expect(response.itemAdicionado.quantidade).toBe(request.quantidade);
      expect(response.itemAdicionado.precoUnitario).toBe(request.precoUnitario);
      expect(response.itemAdicionado.precoTotal).toBe(100.00); // 2 * 50
      expect(response.itemAdicionado.moeda).toBe(request.moeda);
      expect(response.novoTotal).toBe(100.00);

      expect(mockPedidoRepository.findById).toHaveBeenCalledWith(request.pedidoId);
      expect(mockPedidoRepository.update).toHaveBeenCalledWith(pedido);
      expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando pedido não é encontrado', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: 'pedido-inexistente',
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        quantidade: 1,
        precoUnitario: 25.00,
        moeda: 'BRL'
      };

      mockPedidoRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Pedido não encontrado: pedido-inexistente');
    });

    it('deve lançar erro quando request é nulo', async () => {
      // Act & Assert
      await expect(useCase.execute(null as unknown as AdicionarItemRequest)).rejects.toThrow('Request é obrigatório');
    });

    it('deve lançar erro quando pedidoId é vazio', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: '',
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        quantidade: 1,
        precoUnitario: 25.00,
        moeda: 'BRL'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('PedidoId é obrigatório');
    });

    it('deve lançar erro quando produtoId é vazio', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: 'pedido-123',
        produtoId: '',
        nomeProduto: 'Produto Teste',
        quantidade: 1,
        precoUnitario: 25.00,
        moeda: 'BRL'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('ProdutoId é obrigatório');
    });

    it('deve lançar erro quando quantidade é zero', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: 'pedido-123',
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        quantidade: 0,
        precoUnitario: 25.00,
        moeda: 'BRL'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Quantidade deve ser maior que zero');
    });

    it('deve lançar erro quando preço unitário é zero', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: 'pedido-123',
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        quantidade: 1,
        precoUnitario: 0,
        moeda: 'BRL'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Preço unitário deve ser maior que zero');
    });

    it('deve propagar erro do repository', async () => {
      // Arrange
      const request: AdicionarItemRequest = {
        pedidoId: 'pedido-erro',
        produtoId: 'produto-789',
        nomeProduto: 'Produto Teste',
        quantidade: 1,
        precoUnitario: 25.00,
        moeda: 'BRL'
      };

      const erroRepository = new Error('Erro de banco de dados');
      mockPedidoRepository.findById.mockRejectedValue(erroRepository);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro de banco de dados');
    });
  });
});
