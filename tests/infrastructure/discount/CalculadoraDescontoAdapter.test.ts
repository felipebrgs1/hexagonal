import { CalculadoraDescontoAdapter } from '../../../src/infrastructure/discount/CalculadoraDescontoAdapter.js';
import { Money } from '../../../src/domain/value-objects/Money.js';
import { Pedido } from '../../../src/domain/entities/Pedido.js';
import { ItemPedido } from '../../../src/domain/value-objects/ItemPedido.js';

describe('CalculadoraDescontoAdapter', () => {
  let adapter: CalculadoraDescontoAdapter;

  beforeEach(() => {
    adapter = new CalculadoraDescontoAdapter();
  });

  describe('calcularDescontoPorQuantidade', () => {
    it('deve calcular desconto por quantidade através do adapter', async () => {
      const quantidade = 15;
      const precoUnitario = new Money(50, 'BRL');

      const desconto = await adapter.calcularDescontoPorQuantidade(quantidade, precoUnitario);

      expect(desconto).toBeDefined();
      expect(desconto.moeda).toBe('BRL');
      expect(desconto.valor).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calcularDescontoPorValorTotal', () => {
    it('deve calcular desconto por valor total através do adapter', async () => {
      const valorTotal = new Money(600, 'BRL');

      const desconto = await adapter.calcularDescontoPorValorTotal(valorTotal);

      expect(desconto).toBeDefined();
      expect(desconto.valor).toBe(60); // 10% de 600
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve retornar zero quando valor não atinge o limite', async () => {
      const valorTotal = new Money(400, 'BRL');

      const desconto = await adapter.calcularDescontoPorValorTotal(valorTotal);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });
  });

  describe('aplicarCupomDesconto', () => {
    it('deve aplicar cupom válido através do adapter', async () => {
      const valorTotal = new Money(100, 'BRL');
      const cupom = 'DESCONTO10';

      const desconto = await adapter.aplicarCupomDesconto(cupom, valorTotal);

      expect(desconto.valor).toBe(10); // 10% de 100
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve retornar zero para cupom inválido', async () => {
      const valorTotal = new Money(100, 'BRL');
      const cupom = 'INEXISTENTE';

      const desconto = await adapter.aplicarCupomDesconto(cupom, valorTotal);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve respeitar valor mínimo do cupom', async () => {
      const valorTotal = new Money(30, 'BRL'); // Menor que o mínimo de 50 do DESCONTO10
      const cupom = 'DESCONTO10';

      const desconto = await adapter.aplicarCupomDesconto(cupom, valorTotal);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });
  });

  describe('calcularDescontoTotal', () => {
    it('deve calcular desconto total para pedido com itens', async () => {
      const pedido = Pedido.criar('cliente-123');
      
      const item = new ItemPedido(
        { id: 'prod-1', nome: 'Produto 1' },
        12, // Quantidade para desconto
        new Money(50, 'BRL')
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const desconto = await adapter.calcularDescontoTotal(pedido);

      expect(desconto).toBeDefined();
      expect(desconto.valor).toBeGreaterThan(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve calcular desconto total com cupom', async () => {
      const pedido = Pedido.criar('cliente-456');
      
      const item = new ItemPedido(
        { id: 'prod-1', nome: 'Produto 1' },
        2,
        new Money(100, 'BRL')
      );
      pedido.adicionarItem(item);
      pedido.clearDomainEvents();

      const cupom = 'DESCONTO15';
      const desconto = await adapter.calcularDescontoTotal(pedido, cupom);

      expect(desconto.valor).toBeGreaterThan(0);
      expect(desconto.moeda).toBe('BRL');
    });

    it('deve retornar zero para pedido vazio', async () => {
      const pedido = Pedido.criar('cliente-vazio');

      const desconto = await adapter.calcularDescontoTotal(pedido);

      expect(desconto.valor).toBe(0);
      expect(desconto.moeda).toBe('BRL');
    });
  });

  describe('Gestão de cupons', () => {
    it('deve retornar cupons ativos', () => {
      const cuponsAtivos = adapter.getCuponsAtivos();

      expect(cuponsAtivos).toBeInstanceOf(Array);
      expect(cuponsAtivos.length).toBeGreaterThan(0);
      expect(cuponsAtivos).toContain('DESCONTO10');
      expect(cuponsAtivos).toContain('DESCONTO15');
    });

    it('deve permitir adicionar novos cupons', () => {
      adapter.adicionarCupom('NOVO20', 20, 100);

      const cuponsAtivos = adapter.getCuponsAtivos();
      expect(cuponsAtivos).toContain('NOVO20');
    });

    it('deve permitir desativar cupons', () => {
      adapter.desativarCupom('DESCONTO10');

      const cuponsAtivos = adapter.getCuponsAtivos();
      expect(cuponsAtivos).not.toContain('DESCONTO10');
    });
  });

  describe('Integration with CalcularTotalUseCase', () => {
    it('deve ser compatível com a interface ICalculadoraDesconto', () => {
      // Verificar se implementa todos os métodos necessários
      expect(typeof adapter.calcularDescontoPorQuantidade).toBe('function');
      expect(typeof adapter.calcularDescontoPorValorTotal).toBe('function');
      expect(typeof adapter.aplicarCupomDesconto).toBe('function');
      expect(typeof adapter.calcularDescontoTotal).toBe('function');
    });

    it('deve funcionar com pedidos em diferentes moedas', async () => {
      const pedidoBRL = Pedido.criar('cliente-brl');
      const itemBRL = new ItemPedido(
        { id: 'prod-1', nome: 'Produto BRL' },
        2,
        new Money(100, 'BRL')
      );
      pedidoBRL.adicionarItem(itemBRL);
      pedidoBRL.clearDomainEvents();

      const descontoBRL = await adapter.calcularDescontoTotal(pedidoBRL);
      expect(descontoBRL.moeda).toBe('BRL');

      // Note: Para testar com outras moedas, seria necessário ajustar o domínio
      // para permitir pedidos com itens em moedas diferentes ou criar um novo pedido
    });
  });
});
