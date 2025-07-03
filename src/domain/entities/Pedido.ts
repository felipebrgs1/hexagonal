import { v4 as uuidv4 } from 'uuid';
import { Money } from '../value-objects/Money.js';
import { StatusPedido, StatusPedidoVO } from '../value-objects/StatusPedido.js';
import { ItemPedido } from '../value-objects/ItemPedido.js';
import { DomainEvent } from '../events/DomainEvent.js';

export interface PedidoProps {
  id?: string;
  clienteId: string;
  itens?: ItemPedido[];
  status?: StatusPedidoVO;
  dataCriacao?: Date;
  dataAtualizacao?: Date;
  observacoes?: string;
}

export class Pedido {
  private readonly _id: string;
  private readonly _clienteId: string;
  private _itens: ItemPedido[];
  private _status: StatusPedidoVO;
  private readonly _dataCriacao: Date;
  private _dataAtualizacao: Date;
  private _observacoes?: string;
  private _domainEvents: DomainEvent[] = [];

  constructor(props: PedidoProps) {
    this.validateClienteId(props.clienteId);
    
    this._id = props.id || uuidv4();
    this._clienteId = props.clienteId;
    this._itens = props.itens || [];
    this._status = props.status || StatusPedidoVO.pendente();
    this._dataCriacao = props.dataCriacao || new Date();
    this._dataAtualizacao = props.dataAtualizacao || new Date();
    this._observacoes = props.observacoes;

    this.validateInvariants();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get clienteId(): string {
    return this._clienteId;
  }

  get itens(): ItemPedido[] {
    return [...this._itens]; // Retorna cópia para manter imutabilidade
  }

  get status(): StatusPedidoVO {
    return this._status;
  }

  get dataCriacao(): Date {
    return new Date(this._dataCriacao);
  }

  get dataAtualizacao(): Date {
    return new Date(this._dataAtualizacao);
  }

  get observacoes(): string | undefined {
    return this._observacoes;
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  // Métodos de negócio
  calcularTotal(): Money {
    if (this._itens.length === 0) {
      return Money.zero();
    }

    const primeiroItem = this._itens[0];
    if (!primeiroItem) {
      return Money.zero();
    }

    return this._itens.reduce((total, item) => {
      return total.add(item.precoTotal);
    }, Money.zero(primeiroItem.precoTotal.moeda));
  }

  calcularQuantidadeItens(): number {
    return this._itens.reduce((total, item) => total + item.quantidade, 0);
  }

  adicionarItem(item: ItemPedido): void {
    this.validateCanModifyItens();
    this.validateItemParaAdicionar(item);

    const itemExistente = this._itens.find(i => i.isMesmoProduto(item));
    
    if (itemExistente) {
      // Remove o item existente e adiciona com nova quantidade
      this._itens = this._itens.filter(i => !i.isMesmoProduto(item));
      const novaQuantidade = itemExistente.quantidade + item.quantidade;
      const itemAtualizado = itemExistente.alterarQuantidade(novaQuantidade);
      this._itens.push(itemAtualizado);
    } else {
      this._itens.push(item);
    }

    this.updateDataAtualizacao();
    this.addDomainEvent({
      eventType: 'ItemAdicionado',
      aggregateId: this._id,
      payload: { 
        pedidoId: this._id, 
        item: item.toJSON(),
        novoTotal: this.calcularTotal().toJSON()
      }
    });
  }

  removerItem(produtoId: string): void {
    this.validateCanModifyItens();
    
    const itemIndex = this._itens.findIndex(item => item.produto.id === produtoId);
    if (itemIndex === -1) {
      throw new Error(`Item com produto ID ${produtoId} não encontrado no pedido`);
    }

    const itemRemovido = this._itens[itemIndex];
    if (!itemRemovido) {
      throw new Error(`Item não encontrado no índice ${itemIndex}`);
    }

    this._itens.splice(itemIndex, 1);
    
    this.updateDataAtualizacao();
    this.addDomainEvent({
      eventType: 'ItemRemovido',
      aggregateId: this._id,
      payload: { 
        pedidoId: this._id, 
        itemRemovido: itemRemovido.toJSON(),
        novoTotal: this.calcularTotal().toJSON()
      }
    });
  }

  alterarQuantidadeItem(produtoId: string, novaQuantidade: number): void {
    this.validateCanModifyItens();
    
    const itemIndex = this._itens.findIndex(item => item.produto.id === produtoId);
    if (itemIndex === -1) {
      throw new Error(`Item com produto ID ${produtoId} não encontrado no pedido`);
    }

    const itemAtual = this._itens[itemIndex];
    if (!itemAtual) {
      throw new Error(`Item não encontrado no índice ${itemIndex}`);
    }

    const itemAtualizado = itemAtual.alterarQuantidade(novaQuantidade);
    this._itens[itemIndex] = itemAtualizado;
    
    this.updateDataAtualizacao();
    this.addDomainEvent({
      eventType: 'QuantidadeItemAlterada',
      aggregateId: this._id,
      payload: { 
        pedidoId: this._id, 
        produtoId,
        quantidadeAnterior: itemAtual.quantidade,
        novaQuantidade,
        novoTotal: this.calcularTotal().toJSON()
      }
    });
  }

  alterarStatus(novoStatus: StatusPedido): void {
    if (!this._status.canTransitionTo(novoStatus)) {
      throw new Error(
        `Transição inválida de ${this._status.status} para ${novoStatus}. ` +
        `Transições válidas: ${this._status.getValidTransitions().join(', ')}`
      );
    }

    const statusAnterior = this._status.status;
    this._status = new StatusPedidoVO(novoStatus);
    this.updateDataAtualizacao();
    
    this.addDomainEvent({
      eventType: 'StatusAlterado',
      aggregateId: this._id,
      payload: { 
        pedidoId: this._id, 
        statusAnterior,
        novoStatus
      }
    });

    // Eventos específicos para alguns status
    if (novoStatus === StatusPedido.CONFIRMADO) {
      this.addDomainEvent({
        eventType: 'PedidoConfirmado',
        aggregateId: this._id,
        payload: { 
          pedidoId: this._id,
          clienteId: this._clienteId,
          total: this.calcularTotal().toJSON(),
          itens: this._itens.map(item => item.toJSON())
        }
      });
    }

    if (novoStatus === StatusPedido.ENTREGUE) {
      this.addDomainEvent({
        eventType: 'PedidoEntregue',
        aggregateId: this._id,
        payload: { 
          pedidoId: this._id,
          clienteId: this._clienteId,
          dataEntrega: new Date().toISOString()
        }
      });
    }
  }

  adicionarObservacoes(observacoes: string): void {
    this._observacoes = observacoes?.trim();
    this.updateDataAtualizacao();
  }

  isEmpty(): boolean {
    return this._itens.length === 0;
  }

  isPendente(): boolean {
    return this._status.isPendente();
  }

  isConfirmado(): boolean {
    return this._status.isConfirmado();
  }

  isCancelado(): boolean {
    return this._status.isCancelado();
  }

  isEntregue(): boolean {
    return this._status.isEntregue();
  }

  podeSerCancelado(): boolean {
    return !this._status.isFinalStatus();
  }

  // Validações
  private validateClienteId(clienteId: string): void {
    if (!clienteId || clienteId.trim() === '') {
      throw new Error('Cliente ID é obrigatório');
    }
  }

  private validateCanModifyItens(): void {
    if (this._status.isConfirmado() || this._status.isPreparando() || 
        this._status.isPronto() || this._status.isEnviado() || 
        this._status.isEntregue()) {
      throw new Error(`Não é possível modificar itens com status ${this._status.status}`);
    }
  }

  private validateItemParaAdicionar(item: ItemPedido): void {
    if (!item) {
      throw new Error('Item é obrigatório');
    }
    
    // Validar se todas as moedas são compatíveis
    if (this._itens.length > 0) {
      const primeiroItem = this._itens[0];
      if (!primeiroItem) {
        return; // Se não há primeiro item válido, permite adicionar
      }
      const moedaPedido = primeiroItem.precoTotal.moeda;
      if (item.precoTotal.moeda !== moedaPedido) {
        throw new Error(`Todos os itens devem ter a mesma moeda. Esperado: ${moedaPedido}, Recebido: ${item.precoTotal.moeda}`);
      }
    }
  }

  private validateInvariants(): void {
    // Validar que todos os itens têm a mesma moeda
    if (this._itens.length > 1) {
      const primeiroItem = this._itens[0];
      if (!primeiroItem) {
        return; // Se não há primeiro item válido, não há o que validar
      }
      const primeiraMoeda = primeiroItem.precoTotal.moeda;
      const temMoedasDiferentes = this._itens.some(item => item.precoTotal.moeda !== primeiraMoeda);
      if (temMoedasDiferentes) {
        throw new Error('Todos os itens do pedido devem ter a mesma moeda');
      }
    }
  }

  private updateDataAtualizacao(): void {
    this._dataAtualizacao = new Date();
  }

  private addDomainEvent(eventData: Omit<DomainEvent, 'eventId' | 'occurredOn'>): void {
    const event: DomainEvent = {
      eventId: uuidv4(),
      eventType: eventData.eventType,
      aggregateId: eventData.aggregateId,
      occurredOn: new Date(),
      payload: eventData.payload
    };
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // Métodos estáticos
  static criar(clienteId: string, observacoes?: string): Pedido {
    const pedido = new Pedido({ clienteId, observacoes });
    
    pedido.addDomainEvent({
      eventType: 'PedidoCriado',
      aggregateId: pedido.id,
      payload: { 
        pedidoId: pedido.id,
        clienteId,
        dataCriacao: pedido.dataCriacao.toISOString(),
        observacoes
      }
    });

    return pedido;
  }

  // Serialização
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      clienteId: this._clienteId,
      itens: this._itens.map(item => item.toJSON()),
      status: this._status.toJSON(),
      dataCriacao: this._dataCriacao.toISOString(),
      dataAtualizacao: this._dataAtualizacao.toISOString(),
      observacoes: this._observacoes,
      total: this.calcularTotal().toJSON(),
      quantidadeItens: this.calcularQuantidadeItens()
    };
  }
}
