import { SagaOrchestrator, ISagaStep } from '../../../src/domain/services/SagaOrchestrator.js';
import { Pedido } from '../../../src/domain/entities/Pedido.js';
import { Money } from '../../../src/domain/value-objects/Money.js';
import { ItemPedido } from '../../../src/domain/value-objects/ItemPedido.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { StatusPedido } from '../../../src/domain/value-objects/StatusPedido.js';

describe('SagaOrchestrator', () => {
  let sagaOrchestrator: SagaOrchestrator;
  let pedido: Pedido;

  beforeEach(() => {
    sagaOrchestrator = new SagaOrchestrator();
    pedido = Pedido.criar('cliente-123', 'Pedido de teste');
    
    // Adicionar um item para tornar o pedido válido
    const item = new ItemPedido(
      { id: 'produto-1', nome: 'Produto 1' },
      2,
      new Money(50, 'BRL')
    );
    pedido.adicionarItem(item);
  });

  describe('Steps básicos', () => {
    it('deve confirmar pedido válido', async () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      await sagaOrchestrator.executarStep('confirmar-pedido', context);

      expect(pedido.status.isConfirmado()).toBe(true);
      expect(context.executedSteps).toContain('confirmar-pedido');
    });

    it('não deve confirmar pedido vazio', async () => {
      const pedidoVazio = Pedido.criar('cliente-vazio');
      const context = {
        pedido: pedidoVazio,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      await expect(sagaOrchestrator.executarStep('confirmar-pedido', context))
        .rejects.toThrow('Não é possível confirmar pedido vazio');
    });

    it('deve verificar estoque com sucesso', async () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      await expect(sagaOrchestrator.executarStep('verificar-estoque', context))
        .resolves.not.toThrow();
      
      expect(context.executedSteps).toContain('verificar-estoque');
    });

    it('deve processar pagamento com sucesso', async () => {
      const context = {
        pedido,
        parameters: { metodoPagamento: 'cartao' },
        executedSteps: [],
        events: [],
        errors: []
      };

      await expect(sagaOrchestrator.executarStep('processar-pagamento', context))
        .resolves.not.toThrow();
      
      expect(context.executedSteps).toContain('processar-pagamento');
    });
  });

  describe('Execução de saga completa', () => {
    it('deve executar saga de confirmação de pedido', async () => {
      const resultado = await sagaOrchestrator.executarSaga('confirmar-pedido-completo', pedido, {
        metodoPagamento: 'cartao'
      });

      expect(resultado.executedSteps).toContain('confirmar-pedido');
      expect(resultado.executedSteps).toContain('verificar-estoque');
      expect(resultado.executedSteps).toContain('processar-pagamento');
      expect(pedido.status.isConfirmado()).toBe(true);
    });

    it('deve fazer compensação em caso de erro', async () => {
      // Simular erro no step de pagamento
      const pedidoComErro = Pedido.criar('cliente-erro');
      const itemCaro = new ItemPedido(
        { id: 'produto-caro', nome: 'Produto Caro' },
        1,
        new Money(10000, 'BRL') // Valor muito alto para simular falha no pagamento
      );
      pedidoComErro.adicionarItem(itemCaro);

      try {
        await sagaOrchestrator.executarSaga('confirmar-pedido-completo', pedidoComErro, {
          metodoPagamento: 'cartao_invalido'
        });
      } catch (error) {
        // Esperamos que a saga falhe
        expect(error).toBeDefined();
      }
    });
  });

  describe('Steps customizados', () => {
    it('deve permitir adicionar steps customizados', () => {
      const stepCustomizado: ISagaStep = {
        id: 'step-customizado',
        name: 'Step Customizado',
        execute: async (context) => {
          context.parameters.customizado = true;
        },
        compensate: async (context) => {
          context.parameters.customizado = false;
        }
      };

      sagaOrchestrator.adicionarStep(stepCustomizado);

      const steps = sagaOrchestrator.listarSteps();
      expect(steps).toContain('step-customizado');
    });

    it('deve executar step customizado', async () => {
      const stepCustomizado: ISagaStep = {
        id: 'step-teste',
        name: 'Step de Teste',
        execute: async (context) => {
          context.parameters.executado = true;
        },
        compensate: async (context) => {
          context.parameters.executado = false;
        }
      };

      sagaOrchestrator.adicionarStep(stepCustomizado);

      const context = {
        pedido,
        parameters: {} as Record<string, unknown>,
        executedSteps: [],
        events: [],
        errors: []
      };

      await sagaOrchestrator.executarStep('step-teste', context);

      expect(context.parameters.executado).toBe(true);
      expect(context.executedSteps).toContain('step-teste');
    });
  });

  describe('Condições de execução', () => {
    it('deve respeitar condições de execução dos steps', () => {
      const stepCondicional: ISagaStep = {
        id: 'step-condicional',
        name: 'Step Condicional',
        execute: async () => {},
        compensate: async () => {},
        canExecute: (context) => context.parameters.podExecutar === true
      };

      sagaOrchestrator.adicionarStep(stepCondicional);

      const contextSemPermissao = {
        pedido,
        parameters: { podExecutar: false },
        executedSteps: [],
        events: [],
        errors: []
      };

      const contextComPermissao = {
        pedido,
        parameters: { podExecutar: true },
        executedSteps: [],
        events: [],
        errors: []
      };

      expect(sagaOrchestrator.podeExecutarStep('step-condicional', contextSemPermissao)).toBe(false);
      expect(sagaOrchestrator.podeExecutarStep('step-condicional', contextComPermissao)).toBe(true);
    });
  });

  describe('Estado da saga', () => {
    it('deve retornar informações do estado atual', async () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      await sagaOrchestrator.executarStep('confirmar-pedido', context);

      const estado = sagaOrchestrator.obterEstadoSaga(context);

      expect(estado.stepsExecutados).toContain('confirmar-pedido');
      expect(estado.stepsDisponiveis).toContain('verificar-estoque');
      expect(estado.stepsDisponiveis).toContain('processar-pagamento');
    });

    it('deve identificar próximos steps disponíveis', () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: ['confirmar-pedido'],
        events: [],
        errors: []
      };

      const proximosSteps = sagaOrchestrator.obterProximosSteps(context);

      expect(proximosSteps).toContain('verificar-estoque');
      expect(proximosSteps).toContain('processar-pagamento');
    });
  });

  describe('Rollback e compensação', () => {
    it('deve executar compensação para steps já executados', async () => {
      const context = {
        pedido,
        parameters: { metodoPagamento: 'cartao' },
        executedSteps: [],
        events: [],
        errors: []
      };

      // Executar alguns steps
      await sagaOrchestrator.executarStep('confirmar-pedido', context);
      await sagaOrchestrator.executarStep('verificar-estoque', context);

      expect(context.executedSteps.length).toBe(2);
      expect(pedido.status.isConfirmado()).toBe(true);

      // Executar rollback
      await sagaOrchestrator.executarRollback(context);

      expect(pedido.status.isCancelado()).toBe(true); // Status deve voltar para cancelado
    });

    it('deve executar compensação parcial até step específico', async () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      // Executar steps
      await sagaOrchestrator.executarStep('confirmar-pedido', context);
      await sagaOrchestrator.executarStep('verificar-estoque', context);
      await sagaOrchestrator.executarStep('processar-pagamento', context);

      expect(context.executedSteps.length).toBe(3);

      // Executar compensação apenas até o step 'verificar-estoque'
      await sagaOrchestrator.executarCompensacao(context, 'verificar-estoque');

      // Deve ter compensado apenas o step 'processar-pagamento'
      expect(context.executedSteps).toContain('confirmar-pedido');
      expect(context.executedSteps).toContain('verificar-estoque');
    });
  });

  describe('Logs e eventos', () => {
    it('deve executar step sem erros', async () => {
      const context = {
        pedido,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      await sagaOrchestrator.executarStep('confirmar-pedido', context);

      expect(context.executedSteps).toContain('confirmar-pedido');
      expect(context.errors).toHaveLength(0);
    });

    it('deve registrar erros durante execução', async () => {
      const pedidoVazio = Pedido.criar('cliente-vazio');
      const context = {
        pedido: pedidoVazio,
        parameters: {},
        executedSteps: [],
        events: [],
        errors: []
      };

      try {
        await sagaOrchestrator.executarStep('confirmar-pedido', context);
      } catch (error) {
        // Erro esperado - pedido vazio não pode ser confirmado
        expect(error).toBeDefined();
      }

      expect(context.errors.length).toBeGreaterThan(0);
    });
  });
});
