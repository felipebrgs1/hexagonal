import { MockServicoEstoque } from '@/infrastructure/services/MockServicoEstoque.js';
import { Money } from '@/domain/value-objects/Money.js';

describe('MockServicoEstoque', () => {
  let servicoEstoque: MockServicoEstoque;

  beforeEach(() => {
    servicoEstoque = new MockServicoEstoque();
  });

  describe('verificarDisponibilidade', () => {
    it('deve retornar true para produto com estoque suficiente', async () => {
      const disponivel = await servicoEstoque.verificarDisponibilidade('prod-1', 10);
      
      expect(disponivel).toBe(true);
    });

    it('deve retornar false para produto com estoque insuficiente', async () => {
      const disponivel = await servicoEstoque.verificarDisponibilidade('prod-3', 10); // prod-3 tem apenas 5 unidades
      
      expect(disponivel).toBe(false);
    });

    it('deve retornar false para produto inexistente', async () => {
      const disponivel = await servicoEstoque.verificarDisponibilidade('prod-inexistente', 1);
      
      expect(disponivel).toBe(false);
    });

    it('deve retornar false para produto inativo', async () => {
      const disponivel = await servicoEstoque.verificarDisponibilidade('prod-erro', 1);
      
      expect(disponivel).toBe(false);
    });

    it('deve considerar estoque reservado na disponibilidade', async () => {
      // Reservar parte do estoque
      await servicoEstoque.reservarEstoque('prod-1', 50, 'pedido-teste');
      
      // Verificar disponibilidade do restante
      const disponivel = await servicoEstoque.verificarDisponibilidade('prod-1', 60); // prod-1 tinha 100, reservou 50
      
      expect(disponivel).toBe(false);
    });
  });

  describe('reservarEstoque', () => {
    it('deve reservar estoque com sucesso', async () => {
      await expect(
        servicoEstoque.reservarEstoque('prod-1', 10, 'pedido-123')
      ).resolves.not.toThrow();

      const produto = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produto?.quantidadeReservada).toBe(10);
    });

    it('deve lançar erro ao tentar reservar mais que disponível', async () => {
      await expect(
        servicoEstoque.reservarEstoque('prod-1', 150, 'pedido-123') // prod-1 tem apenas 100
      ).rejects.toThrow('Estoque insuficiente');
    });

    it('deve lançar erro para produto inexistente', async () => {
      await expect(
        servicoEstoque.reservarEstoque('prod-inexistente', 10, 'pedido-123')
      ).rejects.toThrow('Produto prod-inexistente não encontrado ou inativo');
    });

    it('deve registrar movimento de reserva', async () => {
      await servicoEstoque.reservarEstoque('prod-1', 10, 'pedido-123');
      
      const movimentos = await servicoEstoque.listarMovimentos('prod-1');
      const reserva = movimentos.find(m => m.tipo === 'RESERVA' && m.pedidoId === 'pedido-123');
      
      expect(reserva).toBeDefined();
      expect(reserva?.quantidade).toBe(10);
    });
  });

  describe('liberarReserva', () => {
    beforeEach(async () => {
      await servicoEstoque.reservarEstoque('prod-1', 20, 'pedido-123');
    });

    it('deve liberar reserva com sucesso', async () => {
      await expect(
        servicoEstoque.liberarReserva('prod-1', 10, 'pedido-123')
      ).resolves.not.toThrow();

      const produto = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produto?.quantidadeReservada).toBe(10); // 20 - 10
    });

    it('deve tratar tentativa de liberar mais que reservado', async () => {
      await expect(
        servicoEstoque.liberarReserva('prod-1', 30, 'pedido-123') // Reservou apenas 20
      ).resolves.not.toThrow();

      const produto = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produto?.quantidadeReservada).toBe(0); // Deve zerar a reserva
    });

    it('deve registrar movimento de liberação', async () => {
      await servicoEstoque.liberarReserva('prod-1', 10, 'pedido-123');
      
      const movimentos = await servicoEstoque.listarMovimentos('prod-1');
      const liberacao = movimentos.find(m => m.tipo === 'LIBERACAO' && m.pedidoId === 'pedido-123');
      
      expect(liberacao).toBeDefined();
      expect(liberacao?.quantidade).toBe(10);
    });
  });

  describe('baixarEstoque', () => {
    beforeEach(async () => {
      await servicoEstoque.reservarEstoque('prod-1', 20, 'pedido-123');
    });

    it('deve dar baixa no estoque com sucesso', async () => {
      const produtoAntes = await servicoEstoque.obterEstoqueProduto('prod-1');
      const quantidadeAntes = produtoAntes?.quantidadeDisponivel || 0;

      await servicoEstoque.baixarEstoque('prod-1', 10, 'pedido-123');

      const produtoDepois = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produtoDepois?.quantidadeDisponivel).toBe(quantidadeAntes - 10);
      expect(produtoDepois?.quantidadeReservada).toBe(10); // 20 - 10
    });

    it('deve lançar erro ao tentar baixa sem reserva suficiente', async () => {
      await expect(
        servicoEstoque.baixarEstoque('prod-1', 30, 'pedido-123') // Reservou apenas 20
      ).rejects.toThrow('Não há reserva suficiente');
    });

    it('deve registrar movimento de saída', async () => {
      await servicoEstoque.baixarEstoque('prod-1', 10, 'pedido-123');
      
      const movimentos = await servicoEstoque.listarMovimentos('prod-1');
      const saida = movimentos.find(m => m.tipo === 'SAIDA' && m.pedidoId === 'pedido-123');
      
      expect(saida).toBeDefined();
      expect(saida?.quantidade).toBe(10);
    });
  });

  describe('adicionarEstoque', () => {
    it('deve adicionar estoque com sucesso', async () => {
      const produtoAntes = await servicoEstoque.obterEstoqueProduto('prod-1');
      const quantidadeAntes = produtoAntes?.quantidadeDisponivel || 0;

      await servicoEstoque.adicionarEstoque('prod-1', 50, 'Reposição de estoque');

      const produtoDepois = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produtoDepois?.quantidadeDisponivel).toBe(quantidadeAntes + 50);
    });

    it('deve registrar movimento de entrada', async () => {
      await servicoEstoque.adicionarEstoque('prod-1', 50, 'Reposição');
      
      const movimentos = await servicoEstoque.listarMovimentos('prod-1');
      const entrada = movimentos.find(m => m.tipo === 'ENTRADA');
      
      expect(entrada).toBeDefined();
      expect(entrada?.quantidade).toBe(50);
      expect(entrada?.observacoes).toBe('Reposição');
    });
  });

  describe('obterEstoqueProduto', () => {
    it('deve retornar produto existente', async () => {
      const produto = await servicoEstoque.obterEstoqueProduto('prod-1');
      
      expect(produto).toBeDefined();
      expect(produto?.id).toBe('prod-1');
      expect(produto?.nome).toBe('Produto A');
      expect(produto?.quantidadeDisponivel).toBe(100);
    });

    it('deve retornar null para produto inexistente', async () => {
      const produto = await servicoEstoque.obterEstoqueProduto('prod-inexistente');
      
      expect(produto).toBeNull();
    });
  });

  describe('listarMovimentos', () => {
    it('deve listar todos os movimentos quando não especifica produto', async () => {
      await servicoEstoque.reservarEstoque('prod-1', 10, 'pedido-1');
      await servicoEstoque.reservarEstoque('prod-2', 5, 'pedido-2');
      
      const movimentos = await servicoEstoque.listarMovimentos();
      
      expect(movimentos.length).toBeGreaterThanOrEqual(2);
    });

    it('deve filtrar movimentos por produto', async () => {
      await servicoEstoque.reservarEstoque('prod-1', 10, 'pedido-1');
      await servicoEstoque.reservarEstoque('prod-2', 5, 'pedido-2');
      
      const movimentosProd1 = await servicoEstoque.listarMovimentos('prod-1');
      
      expect(movimentosProd1.every(m => m.produtoId === 'prod-1')).toBe(true);
    });
  });

  describe('compensarOperacao', () => {
    it('deve compensar operações de um pedido', async () => {
      // Fazer algumas operações
      await servicoEstoque.reservarEstoque('prod-1', 20, 'pedido-123');
      await servicoEstoque.baixarEstoque('prod-1', 10, 'pedido-123');
      
      const produtoAntes = await servicoEstoque.obterEstoqueProduto('prod-1');
      
      // Compensar
      await servicoEstoque.compensarOperacao('prod-1', 'pedido-123');
      
      const produtoDepois = await servicoEstoque.obterEstoqueProduto('prod-1');
      
      // Verificar se as operações foram revertidas
      expect(produtoDepois?.quantidadeReservada).toBeLessThan(produtoAntes?.quantidadeReservada || 0);
    });
  });

  describe('obterEstatisticas', () => {
    it('deve retornar estatísticas do estoque', () => {
      const stats = servicoEstoque.obterEstatisticas();
      
      expect(stats).toHaveProperty('totalProdutos');
      expect(stats).toHaveProperty('totalMovimentos');
      expect(stats).toHaveProperty('produtosComEstoqueBaixo');
      expect(stats).toHaveProperty('valorTotalEstoque');
      
      expect(stats.totalProdutos).toBeGreaterThan(0);
      expect(stats.valorTotalEstoque).toBeGreaterThan(0);
    });
  });

  describe('Gestão de produtos', () => {
    it('deve permitir adicionar novos produtos', () => {
      const novoProduto = {
        id: 'prod-novo',
        nome: 'Produto Novo',
        quantidadeDisponivel: 25,
        quantidadeReservada: 0,
        precoUnitario: new Money(80, 'BRL'),
        categoria: 'Nova Categoria',
        ativo: true
      };

      servicoEstoque.adicionarProduto(novoProduto);

      // Verificar se foi adicionado
      expect(servicoEstoque.obterEstoqueProduto('prod-novo')).resolves.toBeDefined();
    });

    it('deve permitir remover produtos', async () => {
      servicoEstoque.removerProduto('prod-1');

      const produto = await servicoEstoque.obterEstoqueProduto('prod-1');
      expect(produto).toBeNull();
    });

    it('deve permitir redefinir estoque', () => {
      servicoEstoque.redefinirEstoque();

      const stats = servicoEstoque.obterEstatisticas();
      expect(stats.totalMovimentos).toBe(0);
      expect(stats.totalProdutos).toBeGreaterThan(0); // Produtos padrão foram recarregados
    });
  });

  describe('Simulação de erros', () => {
    it('deve simular erros quando configurado', async () => {
      const servicoComErros = new MockServicoEstoque(true);
      
      // Tentar algumas operações que podem falhar
      let errosEncontrados = 0;
      
      for (let i = 0; i < 20; i++) {
        try {
          await servicoComErros.verificarDisponibilidade('prod-1', 1);
        } catch {
          errosEncontrados++;
        }
      }
      
      // Com 10% de chance de erro, deve ter pelo menos alguns erros em 20 tentativas
      expect(errosEncontrados).toBeGreaterThan(0);
    });
  });
});
