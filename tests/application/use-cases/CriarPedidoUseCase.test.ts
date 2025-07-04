import { CriarPedidoUseCase } from '../../../src/application/use-cases/CriarPedidoUseCase.js';
import { 
  CriarPedidoRequest, 
  IPedidoRepository, 
  IEventPublisher 
} from '../../../src/application/ports/index.js';

describe('CriarPedidoUseCase', () => {
  let useCase: CriarPedidoUseCase;
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

    useCase = new CriarPedidoUseCase(mockPedidoRepository, mockEventPublisher);
  });

  describe('execute', () => {
    it('deve criar um pedido com sucesso', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'cliente-123',
        observacoes: 'Observação de teste'
      };

      mockPedidoRepository.save.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.clienteId).toBe(request.clienteId);
      expect(response.status).toBe('PENDENTE');
      expect(response.pedidoId).toBeDefined();
      expect(response.dataCriacao).toBeInstanceOf(Date);

      expect(mockPedidoRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishMany).toHaveBeenCalledTimes(1);
    });

    it('deve criar um pedido sem observações', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'cliente-456'
      };

      mockPedidoRepository.save.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.clienteId).toBe(request.clienteId);
      expect(response.status).toBe('PENDENTE');
    });

    it('deve lançar erro quando request é nulo', async () => {
      // Act & Assert
      await expect(useCase.execute(null as unknown as CriarPedidoRequest)).rejects.toThrow('Request é obrigatório');
    });

    it('deve lançar erro quando clienteId é vazio', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: ''
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('ClienteId é obrigatório');
    });

    it('deve lançar erro quando clienteId tem menos de 3 caracteres', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'ab'
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('ClienteId deve ter pelo menos 3 caracteres');
    });

    it('deve publicar domain events quando o pedido é criado', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'cliente-789'
      };

      mockPedidoRepository.save.mockResolvedValue();
      mockEventPublisher.publishMany.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.publishMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'PedidoCriado',
            aggregateId: expect.any(String),
            payload: expect.objectContaining({
              pedidoId: expect.any(String),
              clienteId: 'cliente-789'
            })
          })
        ])
      );
    });

    it('deve propagar erro do repository', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'cliente-erro'
      };

      const erroRepository = new Error('Erro de banco de dados');
      mockPedidoRepository.save.mockRejectedValue(erroRepository);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro de banco de dados');
    });

    it('deve propagar erro do event publisher', async () => {
      // Arrange
      const request: CriarPedidoRequest = {
        clienteId: 'cliente-evento-erro'
      };

      const erroEventPublisher = new Error('Erro ao publicar evento');
      mockPedidoRepository.save.mockResolvedValue();
      mockEventPublisher.publishMany.mockRejectedValue(erroEventPublisher);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro ao publicar evento');
    });
  });
});
