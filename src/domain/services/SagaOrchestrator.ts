import { Pedido } from '../entities/Pedido.js';
import { StatusPedido } from '../value-objects/StatusPedido.js';
import { MaquinaEstadosPedido } from './MaquinaEstadosPedido.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { IServicoEstoque, MockServicoEstoque } from '@/infrastructure/services/MockServicoEstoque.js';

export interface ISagaStep {
  id: string;
  name: string;
  execute: (context: SagaContext) => Promise<void>;
  compensate: (context: SagaContext) => Promise<void>;
  canExecute?: (context: SagaContext) => boolean;
}

export interface SagaContext {
  pedido: Pedido;
  parameters: Record<string, unknown>;
  executedSteps: string[];
  events: DomainEvent[];
  errors: Error[];
}

export class SagaOrchestrator {
  private readonly maquinaEstados: MaquinaEstadosPedido;
  private readonly steps: Map<string, ISagaStep>;
  private readonly estoqueService: IServicoEstoque;

  constructor(estoqueService: IServicoEstoque = new MockServicoEstoque()) {
    this.maquinaEstados = new MaquinaEstadosPedido();
    this.steps = new Map();
    this.estoqueService = estoqueService;
    this.configurarStepsBasicos();
  }

  private configurarStepsBasicos(): void {
    // Step: Confirmar Pedido
    this.adicionarStep({
      id: 'confirmar-pedido',
      name: 'Confirmar Pedido',
      execute: async (context: SagaContext) => {
        // Validações de negócio primeiro
        if (context.pedido.isEmpty()) {
          throw new Error('Não é possível confirmar pedido vazio');
        }

        if (context.pedido.calcularTotal().valor <= 0) {
          throw new Error('Não é possível confirmar pedido com valor zero');
        }

        if (!this.maquinaEstados.podeTransicionar(context.pedido, StatusPedido.CONFIRMADO)) {
          throw new Error('Não é possível confirmar o pedido no estado atual');
        }

        this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.CONFIRMADO);
        console.log(`Pedido ${context.pedido.id} confirmado com sucesso`);
      },
      compensate: async (context: SagaContext) => {
        if (context.pedido.status.isConfirmado()) {
          this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.CANCELADO);
          console.log(`Compensação: Pedido ${context.pedido.id} cancelado`);
        }
      }
    });

    // Step: Verificar Estoque
    this.adicionarStep({
      id: 'verificar-estoque',
      name: 'Verificar Estoque',
      execute: async (context: SagaContext) => {
        // Simular verificação de estoque
        for (const item of context.pedido.itens) {
          const estoqueDisponivel = await this.estoqueService.verificarDisponibilidade(item.produto.id, item.quantidade);
          if (!estoqueDisponivel) {
            throw new Error(`Estoque insuficiente para produto ${item.produto.nome}`);
          }
        }
        console.log(`Estoque verificado para pedido ${context.pedido.id}`);
      },
      compensate: async (context: SagaContext) => {
        // Compensação: liberar estoque reservado
        for (const item of context.pedido.itens) {
          await this.estoqueService.liberarReserva(item.produto.id, item.quantidade, context.pedido.id);
        }
        console.log(`Compensação: Estoque liberado para pedido ${context.pedido.id}`);
      }
    });

    // Step: Processar Pagamento
    this.adicionarStep({
      id: 'processar-pagamento',
      name: 'Processar Pagamento',
      execute: async (context: SagaContext) => {
        const valorTotal = context.pedido.calcularTotal();
        const metodoPagamento = context.parameters.metodoPagamento as string || 'cartao';
        
        const pagamentoAprovado = await this.estoqueService.processarPagamento(
          context.pedido.id, 
          valorTotal.valor, 
          metodoPagamento
        );
        
        if (!pagamentoAprovado) {
          throw new Error('Pagamento foi rejeitado');
        }
        
        console.log(`Pagamento processado para pedido ${context.pedido.id}`);
      },
      compensate: async (context: SagaContext) => {
        // Compensação: estornar pagamento
        await this.estoqueService.estornarPagamento(context.pedido.id);
        console.log(`Compensação: Pagamento estornado para pedido ${context.pedido.id}`);
      }
    });

    // Step: Reservar Estoque
    this.adicionarStep({
      id: 'reservar-estoque',
      name: 'Reservar Estoque',
      execute: async (context: SagaContext) => {
        for (const item of context.pedido.itens) {
          await this.estoqueService.reservarEstoque(item.produto.id, item.quantidade, context.pedido.id);
        }
        console.log(`Estoque reservado para pedido ${context.pedido.id}`);
      },
      compensate: async (context: SagaContext) => {
        // Compensação: liberar estoque reservado
        for (const item of context.pedido.itens) {
          await this.estoqueService.liberarReserva(item.produto.id, item.quantidade, context.pedido.id);
        }
        console.log(`Compensação: Reserva de estoque cancelada para pedido ${context.pedido.id}`);
      }
    });

    // Step: Iniciar Preparação
    this.adicionarStep({
      id: 'iniciar-preparacao',
      name: 'Iniciar Preparação',
      execute: async (context: SagaContext) => {
        this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.PREPARANDO);
        
        // Notificar equipe de produção
        await this.notificarEquipeProducao(context.pedido.id);
        console.log(`Preparação iniciada para pedido ${context.pedido.id}`);
      },
      compensate: async (context: SagaContext) => {
        if (context.pedido.status.isPreparando()) {
          this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.CONFIRMADO);
          console.log(`Compensação: Preparação cancelada para pedido ${context.pedido.id}`);
        }
      }
    });

    // Step: Preparar Envio
    this.adicionarStep({
      id: 'preparar-envio',
      name: 'Preparar Envio',
      execute: async (context: SagaContext) => {
        this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.PRONTO);
        
        // Gerar etiqueta de envio
        const codigoRastreamento = await this.gerarEtiquetaEnvio(context.pedido.id);
        context.parameters.codigoRastreamento = codigoRastreamento;
        
        console.log(`Envio preparado para pedido ${context.pedido.id} - Código: ${codigoRastreamento}`);
      },
      compensate: async (context: SagaContext) => {
        if (context.pedido.status.isPronto()) {
          this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.PREPARANDO);
          console.log(`Compensação: Preparação de envio cancelada para pedido ${context.pedido.id}`);
        }
      }
    });

    // Step: Enviar Pedido
    this.adicionarStep({
      id: 'enviar-pedido',
      name: 'Enviar Pedido',
      execute: async (context: SagaContext) => {
        this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.ENVIADO);
        
        const codigoRastreamento = context.parameters.codigoRastreamento as string;
        await this.registrarEnvio(context.pedido.id, codigoRastreamento);
        
        console.log(`Pedido ${context.pedido.id} enviado com código ${codigoRastreamento}`);
      },
      compensate: async (context: SagaContext) => {
        if (context.pedido.status.isEnviado()) {
          this.maquinaEstados.executarTransicao(context.pedido, StatusPedido.PRONTO);
          console.log(`Compensação: Envio cancelado para pedido ${context.pedido.id}`);
        }
      }
    });
  }

  // Métodos públicos para gerenciamento da saga
  async executarStep(stepId: string, context: SagaContext): Promise<void> {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step não encontrado: ${stepId}`);
    }

    // Verificar se pode executar
    if (step.canExecute && !step.canExecute(context)) {
      throw new Error(`Step ${stepId} não pode ser executado no contexto atual`);
    }

    try {
      console.log(`Executando step: ${step.name}`);
      await step.execute(context);
      context.executedSteps.push(stepId);
      
      // Os eventos já são gerados pela entidade Pedido através dos domain events
      // e capturados pelos handlers de evento
    } catch (error) {
      console.error(`Erro ao executar step ${step.name}:`, error);
      context.errors.push(error as Error);
      throw error;
    }
  }

  podeExecutarStep(stepId: string, context: SagaContext): boolean {
    const step = this.steps.get(stepId);
    if (!step) {
      return false;
    }

    if (step.canExecute) {
      return step.canExecute(context);
    }

    return true;
  }

  adicionarStep(step: ISagaStep): void {
    this.steps.set(step.id, step);
  }

  listarSteps(): string[] {
    return Array.from(this.steps.keys());
  }

  obterEstadoSaga(context: SagaContext): { 
    stepsExecutados: string[]; 
    stepsDisponiveis: string[]; 
    erros: Error[];
    temErros: boolean;
  } {
    const todosSteps = this.listarSteps();
    const stepsDisponiveis = todosSteps.filter(stepId => 
      !context.executedSteps.includes(stepId) && 
      this.podeExecutarStep(stepId, context)
    );

    return {
      stepsExecutados: [...context.executedSteps],
      stepsDisponiveis,
      erros: [...context.errors],
      temErros: context.errors.length > 0
    };
  }

  obterProximosSteps(context: SagaContext): string[] {
    const todosSteps = this.listarSteps();
    return todosSteps.filter(stepId => 
      !context.executedSteps.includes(stepId) && 
      this.podeExecutarStep(stepId, context)
    );
  }

  async executarRollback(context: SagaContext): Promise<void> {
    console.log(`Iniciando rollback para pedido ${context.pedido.id}`);
    
    // Executar compensação em ordem reversa
    const stepsParaCompensar = [...context.executedSteps].reverse();
    
    for (const stepId of stepsParaCompensar) {
      const step = this.steps.get(stepId);
      if (step) {
        try {
          console.log(`Rollback step: ${step.name}`);
          await step.compensate(context);
        } catch (rollbackError) {
          console.error(`Erro no rollback do step ${step.name}:`, rollbackError);
          context.errors.push(rollbackError as Error);
        }
      }
    }
    
    console.log(`Rollback concluído para pedido ${context.pedido.id}`);
  }

  async executarCompensacao(context: SagaContext, ateStep?: string): Promise<void> {
    console.log(`Iniciando compensação para pedido ${context.pedido.id}`);
    
    let stepsParaCompensar = [...context.executedSteps].reverse();
    
    // Se especificado um step limite, compensar apenas até esse step
    if (ateStep) {
      const indiceStep = context.executedSteps.indexOf(ateStep);
      if (indiceStep !== -1) {
        stepsParaCompensar = context.executedSteps.slice(indiceStep + 1).reverse();
      }
    }
    
    for (const stepId of stepsParaCompensar) {
      const step = this.steps.get(stepId);
      if (step) {
        try {
          console.log(`Compensando step: ${step.name}`);
          await step.compensate(context);
        } catch (compensationError) {
          console.error(`Erro na compensação do step ${step.name}:`, compensationError);
          context.errors.push(compensationError as Error);
        }
      }
    }
    
    console.log(`Compensação concluída para pedido ${context.pedido.id}`);
  }

  // Sagas nomeadas
  async executarSaga(nomeOuPedido: string | Pedido, pedidoOuSteps?: Pedido | string[], parametrosOuParametros?: Record<string, unknown> | Record<string, unknown>): Promise<SagaContext> {
    // Overload para manter compatibilidade
    if (typeof nomeOuPedido === 'string') {
      // Formato: executarSaga(nome, pedido, parametros)
      const nome = nomeOuPedido;
      const pedido = pedidoOuSteps as Pedido;
      const parametros = parametrosOuParametros as Record<string, unknown> || {};
      
      return this.executarSagaNomeada(nome, pedido, parametros);
    } else {
      // Formato: executarSaga(pedido, steps, parametros)
      const pedido = nomeOuPedido;
      const steps = pedidoOuSteps as string[];
      const parametros = parametrosOuParametros as Record<string, unknown> || {};
      
      return this.executarSagaComSteps(pedido, steps, parametros);
    }
  }

  private async executarSagaNomeada(nome: string, pedido: Pedido, parametros: Record<string, unknown>): Promise<SagaContext> {
    switch (nome) {
      case 'confirmar-pedido-completo':
        return this.sagaProcessamentoPedido(pedido, parametros);
      case 'envio-pedido':
        return this.sagaEnvioPedido(pedido, parametros);
      case 'fluxo-completo':
        return this.sagaFluxoCompleto(pedido, parametros);
      default:
        throw new Error(`Saga não encontrada: ${nome}`);
    }
  }

  private async executarSagaComSteps(pedido: Pedido, stepsIds: string[], parameters: Record<string, unknown>): Promise<SagaContext> {
    const context: SagaContext = {
      pedido,
      parameters,
      executedSteps: [],
      events: [],
      errors: []
    };

    console.log(`Iniciando saga para pedido ${pedido.id} com steps: ${stepsIds.join(', ')}`);

    try {
      // Executar steps em sequência
      for (const stepId of stepsIds) {
        await this.executarStep(stepId, context);
      }

      console.log(`Saga concluída com sucesso para pedido ${pedido.id}`);
      return context;

    } catch (error) {
      console.error(`Erro na saga para pedido ${pedido.id}:`, error);
      context.errors.push(error as Error);
      
      // Executar compensação
      await this.executarCompensacao(context);
      
      throw error;
    }
  }

  // Sagas específicas
  async sagaProcessamentoPedido(pedido: Pedido, parametros: Record<string, unknown>): Promise<SagaContext> {
    const steps = ['confirmar-pedido', 'verificar-estoque', 'processar-pagamento', 'reservar-estoque'];
    return this.executarSagaComSteps(pedido, steps, parametros);
  }

  async sagaEnvioPedido(pedido: Pedido, parametros: Record<string, unknown>): Promise<SagaContext> {
    const steps = ['iniciar-preparacao', 'preparar-envio', 'enviar-pedido'];
    return this.executarSagaComSteps(pedido, steps, parametros);
  }

  async sagaFluxoCompleto(pedido: Pedido, parametros: Record<string, unknown>): Promise<SagaContext> {
    const steps = [
      'confirmar-pedido', 
      'verificar-estoque', 
      'processar-pagamento', 
      'reservar-estoque',
      'iniciar-preparacao',
      'preparar-envio',
      'enviar-pedido'
    ];
    return this.executarSagaComSteps(pedido, steps, parametros);
  }

  // Mock methods para simular serviços externos
  private async registrarEnvio(pedidoId: string, codigoRastreamento: string): Promise<void> {
    console.log(`Registrando envio: pedido ${pedidoId}, código ${codigoRastreamento}`);
    // Simular registro
  }
}
