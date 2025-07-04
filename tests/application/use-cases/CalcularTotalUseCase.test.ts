import { CalcularTotalUseCase } from '../../../src/application/use-cases/CalcularTotalUseCase.js';
import { 
  CalcularTotalRequest, 
  IPedidoRepository, 
  ICalculadoraDesconto 
} from '../../../src/application/ports/index.js';
import { Pedido } from '../../../src/domain/entities/Pedido.js';
import { ItemPedido } from '../../../src/domain/value-objects/ItemPedido.js';
import { Money } from '../../../src/domain/value-objects/Money.js';

describe('CalcularTotalUseCase', () => {
  let useCase: CalcularTotalUseCase;
  let mockPedidoRepository: jest.Mocked<IPedidoRepository>;
  let mockCalculadoraDesconto: jest.Mocked<ICalculadoraDesconto>;

  beforeEach(() => {
    mockPedidoRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByClienteId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn()
    };

    mockCalculadoraDesconto = {
      calcularDescontoPorQuantidade: jest.fn(),
      calcularDescontoPorValorTotal: jest.fn(),
      aplicarCupomDesconto: jest.fn(),
      calcularDescontoTotal: jest.fn()
    };

    useCase = new CalcularTotalUseCase(mockPedidoRepository, mockCalculadoraDesconto);
  });

  describe('execute', () => {
    it('deve calcular total do pedido sem desconto', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-456');
      
      // Adicionar item ao pedido
      const item = new ItemPedido(
        { id: 'produto-1', nome: 'Produto Teste' },
        2,
        new Money(50.00, 'BRL')
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const request: CalcularTotalRequest = {
        pedidoId: pedido.id
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockCalculadoraDesconto.calcularDescontoTotal.mockResolvedValue(new Money(0, 'BRL'));

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.pedidoId).toBe(pedido.id);
      expect(response.subtotal).toBe(100.00); // 2 * 50
      expect(response.desconto).toBe(0);
      expect(response.total).toBe(100.00);
      expect(response.moeda).toBe('BRL');

      expect(mockPedidoRepository.findById).toHaveBeenCalledWith(request.pedidoId);
      expect(mockCalculadoraDesconto.calcularDescontoTotal).toHaveBeenCalledWith(pedido, undefined);
    });

    it('deve calcular total do pedido com desconto', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-789');
      
      // Adicionar item ao pedido
      const item = new ItemPedido(
        { id: 'produto-1', nome: 'Produto Teste' },
        3,
        new Money(30.00, 'BRL')
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const request: CalcularTotalRequest = {
        pedidoId: pedido.id,
        cupomDesconto: 'DESCONTO10'
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockCalculadoraDesconto.calcularDescontoTotal.mockResolvedValue(new Money(9.00, 'BRL')); // 10% de desconto

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeDefined();
      expect(response.pedidoId).toBe(pedido.id);
      expect(response.subtotal).toBe(90.00); // 3 * 30
      expect(response.desconto).toBe(9.00);
      expect(response.total).toBe(81.00); // 90 - 9
      expect(response.moeda).toBe('BRL');

      expect(mockCalculadoraDesconto.calcularDescontoTotal).toHaveBeenCalledWith(pedido, 'DESCONTO10');
    });

    it('deve lançar erro quando pedido não é encontrado', async () => {
      // Arrange
      const request: CalcularTotalRequest = {
        pedidoId: 'pedido-inexistente'
      };

      mockPedidoRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Pedido não encontrado: pedido-inexistente');
    });

    it('deve lançar erro quando request é nulo', async () => {
      // Act & Assert
      await expect(useCase.execute(null as unknown as CalcularTotalRequest)).rejects.toThrow('Request é obrigatório');
    });

    it('deve lançar erro quando pedidoId é vazio', async () => {
      // Arrange
      const request: CalcularTotalRequest = {
        pedidoId: ''
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('PedidoId é obrigatório');
    });

    it('deve lançar erro quando cupom é string vazia', async () => {
      // Arrange
      const request: CalcularTotalRequest = {
        pedidoId: 'pedido-123',
        cupomDesconto: ''
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Cupom de desconto não pode ser vazio');
    });

    it('deve calcular total de pedido vazio (sem itens)', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-sem-itens');
      pedido.clearDomainEvents();

      const request: CalcularTotalRequest = {
        pedidoId: pedido.id
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      mockCalculadoraDesconto.calcularDescontoTotal.mockResolvedValue(new Money(0, 'BRL'));

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.subtotal).toBe(0);
      expect(response.desconto).toBe(0);
      expect(response.total).toBe(0);
    });

    it('deve propagar erro do repository', async () => {
      // Arrange
      const request: CalcularTotalRequest = {
        pedidoId: 'pedido-erro'
      };

      const erroRepository = new Error('Erro de banco de dados');
      mockPedidoRepository.findById.mockRejectedValue(erroRepository);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro de banco de dados');
    });

    it('deve propagar erro da calculadora de desconto', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-erro-desconto');
      pedido.clearDomainEvents();

      const request: CalcularTotalRequest = {
        pedidoId: pedido.id
      };

      mockPedidoRepository.findById.mockResolvedValue(pedido);
      const erroCalculadora = new Error('Erro na calculadora de desconto');
      mockCalculadoraDesconto.calcularDescontoTotal.mockRejectedValue(erroCalculadora);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Erro na calculadora de desconto');
    });
  });
});
