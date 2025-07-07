import { CalculadoraDescontoService, DescontoPorQuantidadeStrategy, DescontoPorValorTotalStrategy, DescontoPorCupomStrategy } from '@/domain/services/CalculadoraDesconto.js';
import { Money } from '@/domain/value-objects/Money.js';
import { Pedido } from '@/domain/entities/Pedido.js';
import { ItemPedido } from '@/domain/value-objects/ItemPedido.js';

describe('CalculadoraDesconto Service', () => {
  let calculadoraService: CalculadoraDescontoService;

  beforeEach(() => {
    calculadoraService = new CalculadoraDescontoService();
  });

  describe('DescontoPorQuantidadeStrategy', () => {
    let strategy: DescontoPorQuantidadeStrategy;

    beforeEach(() => {
      strategy = new DescontoPorQuantidadeStrategy();
    });

    it('deve aplicar desconto quando quantidade atinge o limite', () => {
      const valorTotal = new Money(500, 'BRL');
      const parametros = { quantidade: 15, limiteQuantidade: 10, percentual: 5 };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(25); // 5% de 500
      expect(desconto.moeda).toBe('BRL');
    });

    it('não deve aplicar desconto quando quantidade não atinge o limite', () => {
      const valorTotal = new Money(500, 'BRL');
      const parametros = { quantidade: 5, limiteQuantidade: 10, percentual: 5 };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve verificar se pode aplicar desconto', () => {
      const valorTotal = new Money(500, 'BRL');
      
      expect(strategy.podeAplicar(valorTotal, { quantidade: 15, limiteQuantidade: 10 })).toBe(true);
      expect(strategy.podeAplicar(valorTotal, { quantidade: 5, limiteQuantidade: 10 })).toBe(false);
      expect(strategy.podeAplicar(Money.zero('BRL'), { quantidade: 15, limiteQuantidade: 10 })).toBe(false);
    });
  });

  describe('DescontoPorValorTotalStrategy', () => {
    let strategy: DescontoPorValorTotalStrategy;

    beforeEach(() => {
      strategy = new DescontoPorValorTotalStrategy();
    });

    it('deve aplicar desconto quando valor atinge o limite', () => {
      const valorTotal = new Money(600, 'BRL');
      const parametros = { limiteValor: 500, percentual: 10 };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(60); // 10% de 600
      expect(desconto.moeda).toBe('BRL');
    });

    it('não deve aplicar desconto quando valor não atinge o limite', () => {
      const valorTotal = new Money(400, 'BRL');
      const parametros = { limiteValor: 500, percentual: 10 };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve verificar se pode aplicar desconto', () => {
      expect(strategy.podeAplicar(new Money(600, 'BRL'), { limiteValor: 500 })).toBe(true);
      expect(strategy.podeAplicar(new Money(400, 'BRL'), { limiteValor: 500 })).toBe(false);
    });
  });

  describe('DescontoPorCupomStrategy', () => {
    let strategy: DescontoPorCupomStrategy;

    beforeEach(() => {
      strategy = new DescontoPorCupomStrategy();
    });

    it('deve aplicar desconto com cupom válido', () => {
      const valorTotal = new Money(100, 'BRL');
      const parametros = { cupom: 'DESCONTO10' };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(10); // 10% de 100
      expect(desconto.moeda).toBe('BRL');
    });

    it('não deve aplicar desconto com cupom inválido', () => {
      const valorTotal = new Money(100, 'BRL');
      const parametros = { cupom: 'INEXISTENTE' };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('não deve aplicar desconto quando valor não atinge o mínimo', () => {
      const valorTotal = new Money(30, 'BRL'); // DESCONTO10 requer mínimo de 50
      const parametros = { cupom: 'DESCONTO10' };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve permitir adicionar novos cupons', () => {
      strategy.adicionarCupom('NOVO10', 10, 50);
      
      const valorTotal = new Money(100, 'BRL');
      const parametros = { cupom: 'NOVO10' };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(10);
      expect(strategy.getCuponsAtivos()).toContain('NOVO10');
    });

    it('deve permitir desativar cupons', () => {
      strategy.desativarCupom('DESCONTO10');
      
      const valorTotal = new Money(100, 'BRL');
      const parametros = { cupom: 'DESCONTO10' };

      const desconto = strategy.calcular(valorTotal, parametros);

      expect(desconto.valor).toBe(0);
      expect(strategy.getCuponsAtivos()).not.toContain('DESCONTO10');
    });

    it('deve verificar se pode aplicar cupom', () => {
      expect(strategy.podeAplicar(new Money(100, 'BRL'), { cupom: 'DESCONTO10' })).toBe(true);
      expect(strategy.podeAplicar(new Money(30, 'BRL'), { cupom: 'DESCONTO10' })).toBe(false);
      expect(strategy.podeAplicar(new Money(100, 'BRL'), { cupom: 'INEXISTENTE' })).toBe(false);
    });
  });

  describe('CalculadoraDescontoService Integration', () => {
    it('deve calcular desconto total com múltiplas regras', async () => {
      // Arrange
      const pedido = Pedido.criar('cliente-123');
      
      // Adicionar itens suficientes para descontos
      const item1 = new ItemPedido(
        { id: 'prod-1', nome: 'Produto 1' },
        12, // Quantidade > 10 para desconto por quantidade
        new Money(50, 'BRL')
      );
      pedido.adicionarItem(item1);
      pedido.clearDomainEvents();

      // Total: 12 * 50 = 600 BRL (> 500 para desconto por valor)

      // Act
      const desconto = await calculadoraService.calcularDescontoTotal(pedido, 'DESCONTO10');

      // Assert
      expect(desconto.valor).toBeGreaterThan(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve calcular desconto por quantidade', async () => {
      const desconto = await calculadoraService.calcularDescontoPorQuantidade(15, new Money(50, 'BRL'));

      expect(desconto.valor).toBeGreaterThan(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve calcular desconto por valor total', async () => {
      const valorTotal = new Money(600, 'BRL');

      const desconto = await calculadoraService.calcularDescontoPorValorTotal(valorTotal);

      expect(desconto.valor).toBe(60); // 10% de 600
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve aplicar cupom de desconto', async () => {
      const valorTotal = new Money(100, 'BRL');

      const desconto = await calculadoraService.aplicarCupomDesconto('DESCONTO10', valorTotal);

      expect(desconto.valor).toBe(10); // 10% de 100
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve retornar zero para pedido vazio', async () => {
      const pedido = Pedido.criar('cliente-vazio');

      const desconto = await calculadoraService.calcularDescontoTotal(pedido);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve garantir que desconto não seja maior que valor total', async () => {
      const pedido = Pedido.criar('cliente-123');
      
      const item = new ItemPedido(
        { id: 'prod-1', nome: 'Produto 1' },
        1,
        new Money(10, 'BRL') // Valor baixo
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const desconto = await calculadoraService.calcularDescontoTotal(pedido, 'BLACKFRIDAY'); // 25% + outros descontos

      expect(desconto.valor).toBeLessThanOrEqual(10); // Não pode ser maior que o valor total
    });

    it('deve calcular desconto específico por tipo', async () => {
      const pedido = Pedido.criar('cliente-123');
      
      const item = new ItemPedido(
        { id: 'prod-1', nome: 'Produto 1' },
        15,
        new Money(50, 'BRL')
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const descontoQuantidade = await calculadoraService.calcularDesconto(pedido, 'quantidade');
      const descontoValor = await calculadoraService.calcularDesconto(pedido, 'valor');
      const descontoCupom = await calculadoraService.calcularDesconto(pedido, 'cupom', { cupom: 'DESCONTO10' });

      expect(descontoQuantidade.valor).toBeGreaterThan(0);
      expect(descontoValor.valor).toBeGreaterThan(0);
      expect(descontoCupom.valor).toBeGreaterThan(0);
    });

    it('deve gerenciar cupons ativos', () => {
      const cuponsAtivos = calculadoraService.getCuponsAtivos();

      expect(cuponsAtivos).toContain('DESCONTO10');
      expect(cuponsAtivos).toContain('DESCONTO15');
      expect(cuponsAtivos).toContain('BLACKFRIDAY');

      calculadoraService.adicionarCupom('TESTE', 5, 25);
      expect(calculadoraService.getCuponsAtivos()).toContain('TESTE');

      calculadoraService.desativarCupom('TESTE');
      expect(calculadoraService.getCuponsAtivos()).not.toContain('TESTE');
    });
  });
});
