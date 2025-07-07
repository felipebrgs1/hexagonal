import { MaquinaEstadosPedido } from '@/domain/services/MaquinaEstadosPedido.js';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';
import { Pedido } from '@/domain/entities/Pedido.js';
import { ItemPedido } from '@/domain/value-objects/ItemPedido.js';
import { Money } from '@/domain/value-objects/Money.js';

describe('MaquinaEstadosPedido', () => {
  let maquinaEstados: MaquinaEstadosPedido;
  let pedido: Pedido;

  beforeEach(() => {
    maquinaEstados = new MaquinaEstadosPedido();
    pedido = Pedido.criar('cliente-123');
    
    // Adicionar item para testes
    const item = new ItemPedido(
      { id: 'prod-1', nome: 'Produto Teste' },
      2,
      new Money(50, 'BRL')
    );
    pedido.adicionarItem(item);
    pedido.clearDomainEvents();
  });

  describe('Transições válidas', () => {
    it('deve permitir transição de PENDENTE para CONFIRMADO', () => {
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.CONFIRMADO)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      
      expect(pedido.status.status).toBe(StatusPedido.CONFIRMADO);
    });

    it('deve permitir transição de PENDENTE para CANCELADO', () => {
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.CANCELADO)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.CANCELADO);
      
      expect(pedido.status.status).toBe(StatusPedido.CANCELADO);
    });

    it('deve permitir transição de CONFIRMADO para PREPARANDO', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PREPARANDO)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      
      expect(pedido.status.status).toBe(StatusPedido.PREPARANDO);
    });

    it('deve permitir transição de PREPARANDO para PRONTO', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PRONTO)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      
      expect(pedido.status.status).toBe(StatusPedido.PRONTO);
    });

    it('deve permitir transição de PRONTO para ENVIADO', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.ENVIADO)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENVIADO);
      
      expect(pedido.status.status).toBe(StatusPedido.ENVIADO);
    });

    it('deve permitir transição de ENVIADO para ENTREGUE', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENVIADO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.ENTREGUE)).toBe(true);
      
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENTREGUE);
      
      expect(pedido.status.status).toBe(StatusPedido.ENTREGUE);
    });
  });

  describe('Transições inválidas', () => {
    it('não deve permitir transição de PENDENTE para PREPARANDO', () => {
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PREPARANDO)).toBe(false);
      
      expect(() => {
        maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      }).toThrow('Transição inválida: PENDENTE -> PREPARANDO');
    });

    it('não deve permitir transição de ENTREGUE para qualquer outro status', () => {
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      pedido.alterarStatus(StatusPedido.PREPARANDO);
      pedido.alterarStatus(StatusPedido.PRONTO);
      pedido.alterarStatus(StatusPedido.ENVIADO);
      pedido.alterarStatus(StatusPedido.ENTREGUE);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PENDENTE)).toBe(false);
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.CANCELADO)).toBe(false);
    });

    it('não deve permitir transição de CANCELADO para qualquer outro status', () => {
      pedido.alterarStatus(StatusPedido.CANCELADO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PENDENTE)).toBe(false);
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.CONFIRMADO)).toBe(false);
    });
  });

  describe('Condições de transição', () => {
    it('não deve confirmar pedido vazio', () => {
      const pedidoVazio = Pedido.criar('cliente-vazio');
      
      expect(maquinaEstados.podeTransicionar(pedidoVazio, StatusPedido.CONFIRMADO)).toBe(false);
      
      expect(() => {
        maquinaEstados.executarTransicao(pedidoVazio, StatusPedido.CONFIRMADO);
      }).toThrow('Não é possível confirmar pedido vazio');
    });

    it('deve preparar apenas pedidos confirmados com itens', () => {
      pedido.alterarStatus(StatusPedido.CONFIRMADO);
      
      expect(maquinaEstados.podeTransicionar(pedido, StatusPedido.PREPARANDO)).toBe(true);
    });
  });

  describe('Obter transições disponíveis', () => {
    it('deve retornar transições disponíveis para PENDENTE', () => {
      const transicoes = maquinaEstados.obterTransicoesDisponiveis(pedido);
      
      expect(transicoes).toContain(StatusPedido.CONFIRMADO);
      expect(transicoes).toContain(StatusPedido.CANCELADO);
      expect(transicoes).not.toContain(StatusPedido.PREPARANDO);
    });

    it('deve retornar transições disponíveis para CONFIRMADO', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      
      const transicoes = maquinaEstados.obterTransicoesDisponiveis(pedido);
      
      expect(transicoes).toContain(StatusPedido.PREPARANDO);
      expect(transicoes).toContain(StatusPedido.CANCELADO);
      expect(transicoes).not.toContain(StatusPedido.PRONTO);
    });

    it('deve retornar array vazio para status finais', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENVIADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENTREGUE);
      
      const transicoes = maquinaEstados.obterTransicoesDisponiveis(pedido);
      
      expect(transicoes).toEqual([]);
    });
  });

  describe('Validação de fluxo completo', () => {
    it('deve validar fluxo para pedido válido', () => {
      const validacao = maquinaEstados.validarFluxoCompleto(pedido);
      
      expect(validacao.valido).toBe(true);
      expect(validacao.bloqueios).toEqual([]);
      expect(validacao.proximosPassos.length).toBeGreaterThan(0);
    });

    it('deve identificar bloqueios para pedido vazio', () => {
      const pedidoVazio = Pedido.criar('cliente-vazio');
      
      const validacao = maquinaEstados.validarFluxoCompleto(pedidoVazio);
      
      expect(validacao.valido).toBe(false);
      expect(validacao.bloqueios).toContain('Pedido não possui itens');
      expect(validacao.bloqueios).toContain('Pedido possui valor zero');
    });

    it('deve identificar status final como bloqueio', () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENVIADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENTREGUE);
      
      const validacao = maquinaEstados.validarFluxoCompleto(pedido);
      
      expect(validacao.valido).toBe(false);
      expect(validacao.bloqueios).toContain('Pedido já está em status final');
    });
  });

  describe('Fluxo automático', () => {
    it('deve executar fluxo automático até status desejado', async () => {
      const mockOnTransition = jest.fn();
      
      await maquinaEstados.executarFluxoAutomatico(
        pedido, 
        StatusPedido.PRONTO,
        mockOnTransition
      );
      
      expect(pedido.status.status).toBe(StatusPedido.PRONTO);
      expect(mockOnTransition).toHaveBeenCalledTimes(3); // PENDENTE->CONFIRMADO->PREPARANDO->PRONTO
    });

    it('deve lançar erro para fluxo impossível', async () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PREPARANDO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.PRONTO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENVIADO);
      maquinaEstados.executarTransicao(pedido, StatusPedido.ENTREGUE);
      
      await expect(
        maquinaEstados.executarFluxoAutomatico(pedido, StatusPedido.PENDENTE)
      ).rejects.toThrow('Não é possível chegar ao status PENDENTE a partir de ENTREGUE');
    });

    it('não deve fazer nada se já está no status desejado', async () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      
      await maquinaEstados.executarFluxoAutomatico(pedido, StatusPedido.CONFIRMADO);
      
      expect(pedido.status.status).toBe(StatusPedido.CONFIRMADO);
    });
  });

  describe('Encontrar caminho', () => {
    it('deve encontrar caminho de PENDENTE para ENTREGUE', async () => {
      await maquinaEstados.executarFluxoAutomatico(pedido, StatusPedido.ENTREGUE);
      
      expect(pedido.status.status).toBe(StatusPedido.ENTREGUE);
    });

    it('deve encontrar caminho de CONFIRMADO para ENVIADO', async () => {
      maquinaEstados.executarTransicao(pedido, StatusPedido.CONFIRMADO);
      
      await maquinaEstados.executarFluxoAutomatico(pedido, StatusPedido.ENVIADO);
      
      expect(pedido.status.status).toBe(StatusPedido.ENVIADO);
    });
  });

  describe('Métodos utilitários', () => {
    it('deve identificar status finais', () => {
      expect(maquinaEstados.isStatusFinal(StatusPedido.ENTREGUE)).toBe(true);
      expect(maquinaEstados.isStatusFinal(StatusPedido.CANCELADO)).toBe(true);
      expect(maquinaEstados.isStatusFinal(StatusPedido.PENDENTE)).toBe(false);
      expect(maquinaEstados.isStatusFinal(StatusPedido.ENVIADO)).toBe(false);
    });

    it('deve identificar status canceláveis', () => {
      expect(maquinaEstados.isStatusCancelavel(StatusPedido.PENDENTE)).toBe(true);
      expect(maquinaEstados.isStatusCancelavel(StatusPedido.CONFIRMADO)).toBe(true);
      expect(maquinaEstados.isStatusCancelavel(StatusPedido.PREPARANDO)).toBe(true);
      expect(maquinaEstados.isStatusCancelavel(StatusPedido.PRONTO)).toBe(false);
      expect(maquinaEstados.isStatusCancelavel(StatusPedido.ENVIADO)).toBe(false);
    });

    it('deve retornar todos os status possíveis', () => {
      const todosStatus = maquinaEstados.getTodosStatusPossiveis();
      
      expect(todosStatus).toContain(StatusPedido.PENDENTE);
      expect(todosStatus).toContain(StatusPedido.CONFIRMADO);
      expect(todosStatus).toContain(StatusPedido.PREPARANDO);
      expect(todosStatus).toContain(StatusPedido.PRONTO);
      expect(todosStatus).toContain(StatusPedido.ENVIADO);
      expect(todosStatus).toContain(StatusPedido.ENTREGUE);
      expect(todosStatus).toContain(StatusPedido.CANCELADO);
    });
  });
});
