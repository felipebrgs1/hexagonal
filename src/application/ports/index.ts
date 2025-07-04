// Ports (Interfaces)

// Primary Ports (Use Case interfaces)
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

// ==== SECONDARY PORTS ====

import { Pedido } from '../../domain/entities/Pedido.js';
import { DomainEvent } from '../../domain/events/DomainEvent.js';
import { Money } from '../../domain/value-objects/Money.js';

// Repository Port
export interface IPedidoRepository {
  save(pedido: Pedido): Promise<void>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

// Event Publisher Port
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

// Notification Service Port
export interface INotificacaoService {
  enviarEmailPedidoCriado(clienteId: string, pedidoId: string): Promise<void>;
  enviarSMSStatusAlterado(clienteId: string, pedidoId: string, novoStatus: string): Promise<void>;
  notificarEstoque(produtoId: string, quantidade: number): Promise<void>;
}

// Discount Calculator Port
export interface ICalculadoraDesconto {
  calcularDescontoPorQuantidade(quantidade: number, precoUnitario: Money): Promise<Money>;
  calcularDescontoPorValorTotal(valorTotal: Money): Promise<Money>;
  aplicarCupomDesconto(cupom: string, valorTotal: Money): Promise<Money>;
  calcularDescontoTotal(pedido: Pedido, cupom?: string): Promise<Money>;
}

// Data Transfer Objects for Use Cases
export interface CriarPedidoRequest {
  clienteId: string;
  observacoes?: string;
}

export interface CriarPedidoResponse {
  pedidoId: string;
  clienteId: string;
  status: string;
  dataCriacao: Date;
}

export interface AdicionarItemRequest {
  pedidoId: string;
  produtoId: string;
  nomeProduto: string;
  descricaoProduto?: string;
  quantidade: number;
  precoUnitario: number;
  moeda: string;
}

export interface AdicionarItemResponse {
  pedidoId: string;
  itemAdicionado: {
    produtoId: string;
    nomeProduto: string;
    quantidade: number;
    precoUnitario: number;
    precoTotal: number;
    moeda: string;
  };
  novoTotal: number;
}

export interface AtualizarStatusRequest {
  pedidoId: string;
  novoStatus: string;
  observacoes?: string;
}

export interface AtualizarStatusResponse {
  pedidoId: string;
  statusAnterior: string;
  novoStatus: string;
  dataAtualizacao: Date;
}

export interface CalcularTotalRequest {
  pedidoId: string;
  cupomDesconto?: string;
}

export interface CalcularTotalResponse {
  pedidoId: string;
  subtotal: number;
  desconto: number;
  total: number;
  moeda: string;
}

// ==== PRIMARY PORTS (Use Case Interfaces) ====

export type ICriarPedidoUseCase = UseCase<CriarPedidoRequest, CriarPedidoResponse>;

export type IAdicionarItemUseCase = UseCase<AdicionarItemRequest, AdicionarItemResponse>;

export type IAtualizarStatusUseCase = UseCase<AtualizarStatusRequest, AtualizarStatusResponse>;

export type ICalcularTotalUseCase = UseCase<CalcularTotalRequest, CalcularTotalResponse>;
