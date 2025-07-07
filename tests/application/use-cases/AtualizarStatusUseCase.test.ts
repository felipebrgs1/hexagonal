import { AtualizarStatusUseCase } from '@/application/use-cases/AtualizarStatusUseCase.js';
import { 
  AtualizarStatusRequest, 
  IPedidoRepository, 
  IEventPublisher 
} from '@/application/ports/index.js';
import { Pedido } from '@/domain/entities/Pedido.js';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';

describe('AtualizarStatusUseCase', () => {
  let useCase: AtualizarStatusUseCase;
  let mockPedidoRepository: jest.Mocked<IPedidoRepository>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;

  beforeEach(() => {
    mockPedidoRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByClienteId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn()
    };

    useCase = new AtualizarStatusUseCase(mockPedidoRepository, mockEventPublisher);
  });

  describe('execute', () => {
    it('deve atualizar status do pedido com sucesso', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-456');
      pedido.clearDomainEvents(); // Limpar eventos do construtor

      const request: AtualizarStatusRequest = {
        pedidoId: pedido.id,
        novoStatus: StatusPedido.CONFIRMADO
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockPedidoRepository.update.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.pedidoId).toBe(pedido.id);
      expect(response.statusAnterior).toBe(StatusPedido.PENDENTE);
      expect(response.novoStatus).toBe(StatusPedido.CONFIRMADO);
      expect(response.dataAtualizacao).toBeInstanceOf(Date);

      expect(mockPedidoRepository.findById).toHaveBeenCalledWith(request.pedidoId);
      expect(mockPedidoRepository.update).toHaveBeenCalledWith(pedido);
      expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando pedido não é encontrado', async () => {
      // Arrange
      const request: AtualizarStatusRequest = {
        pedidoId: 'pedido-inexistente',
        novoStatus: StatusPedido.CONFIRMADO
      };

      mockPedidoRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Pedido não encontrado: pedido-inexistente');
    });

    it('deve lançar erro quando request é nulo', async () => {
      // Act & Assert
      await expect(useCase.execute(null as unknown as AtualizarStatusRequest)).rejects.toThrow('Request é obrigatório');
    });

    it('deve lançar erro quando pedidoId é vazio', async () => {
      // Arrange
      const request: AtualizarStatusRequest = {
        pedidoId: '',
        novoStatus: StatusPedido.CONFIRMADO
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('PedidoId é obrigatório');
    });

    it('deve lançar erro quando novoStatus é vazio', async () => {
      // Arrange
      const request: AtualizarStatusRequest = {
        pedidoId: 'pedido-123',
        novoStatus: ''
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Novo status é obrigatório');
    });

    it('deve lançar erro quando novoStatus é inválido', async () => {
      // Arrange
      const request: AtualizarStatusRequest = {
        pedidoId: 'pedido-123',
        novoStatus: 'STATUS_INVALIDO'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Status inválido: STATUS_INVALIDO');
    });

    it('deve publicar domain events quando status é alterado', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-789');
      pedido.clearDomainEvents();

      const request: AtualizarStatusRequest = {
        pedidoId: pedido.id,
        novoStatus: StatusPedido.CONFIRMADO
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockPedidoRepository.update.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.publishMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'StatusAlterado',
            aggregateId: pedido.id,
            payload: expect.objectContaining({
              pedidoId: pedido.id,
              statusAnterior: StatusPedido.PENDENTE,
              novoStatus: StatusPedido.CONFIRMADO
            })
          })
        ])
      );
    });

    it('deve propagar erro do repository', async () => {
      // Arrange
      const request: AtualizarStatusRequest = {
        pedidoId: 'pedido-erro',
        novoStatus: StatusPedido.CONFIRMADO
      };

      const erroRepository = new Error('Erro de banco de dados');
      mockPedidoRepository.findById.mockRejectedValue(erroRepository);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro de banco de dados');
    });
  });
});
