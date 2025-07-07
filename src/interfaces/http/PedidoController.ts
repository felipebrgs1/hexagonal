import { Request, Response, NextFunction } from 'express';
import { CriarPedidoUseCase } from '@/application/use-cases/CriarPedidoUseCase.js';
import { AdicionarItemUseCase } from '@/application/use-cases/AdicionarItemUseCase.js';
import { AtualizarStatusUseCase } from '@/application/use-cases/AtualizarStatusUseCase.js';
import { IPedidoRepository } from '@/application/ports/index.js';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';
import type { ILogger } from '@/infrastructure/logger/Logger.js';

export interface CreatePedidoRequest {
  clienteId: string;
  observacoes?: string;
}

export interface AddItemRequest {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  moeda?: 'BRL' | 'USD' | 'EUR';
}

export interface UpdateStatusRequest {
  novoStatus: StatusPedido;
}

export class PedidoController {
  constructor(
    private readonly criarPedidoUseCase: CriarPedidoUseCase,
    private readonly adicionarItemUseCase: AdicionarItemUseCase,
    private readonly atualizarStatusUseCase: AtualizarStatusUseCase,
    private readonly pedidoRepository: IPedidoRepository,
    private readonly logger: ILogger
  ) {}

  // POST /pedidos
  async criarPedido(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clienteId, observacoes }: CreatePedidoRequest = req.body;

      this.logger.info('Creating new pedido', { clienteId });

      const response = await this.criarPedidoUseCase.execute({
        clienteId,
        observacoes
      });

      this.logger.info('Pedido created successfully', { 
        pedidoId: response.pedidoId,
        clienteId 
      });

      res.status(201).json({
        success: true,
        data: {
          pedidoId: response.pedidoId,
          clienteId: response.clienteId,
          status: response.status,
          dataCriacao: response.dataCriacao
        }
      });
    } catch (error) {
      this.logger.error('Failed to create pedido', {
        error: (error as Error).message,
        body: req.body
      });
      next(error);
    }
  }

  // POST /pedidos/:id/itens
  async adicionarItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PEDIDO_ID',
            message: 'ID do pedido é obrigatório'
          }
        });
        return;
      }

      const pedidoId = id;
      const { produtoId, nomeProduto, quantidade, precoUnitario, moeda }: AddItemRequest = req.body;

      this.logger.info('Adding item to pedido', { 
        pedidoId, 
        produtoId, 
        quantidade 
      });

      const response = await this.adicionarItemUseCase.execute({
        pedidoId,
        produtoId,
        nomeProduto,
        quantidade,
        precoUnitario,
        moeda: moeda || 'BRL'
      });

      this.logger.info('Item added successfully', { 
        pedidoId, 
        produtoId,
        novoTotal: response.novoTotal 
      });

      res.status(200).json({
        success: true,
        data: {
          pedidoId: response.pedidoId,
          itemAdicionado: response.itemAdicionado,
          novoTotal: response.novoTotal
        }
      });
    } catch (error) {
      this.logger.error('Failed to add item to pedido', {
        error: (error as Error).message,
        pedidoId: req.params.id,
        body: req.body
      });
      next(error);
    }
  }

  // PUT /pedidos/:id/status
  async atualizarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PEDIDO_ID',
            message: 'ID do pedido é obrigatório'
          }
        });
        return;
      }

      const pedidoId = id;
      const { novoStatus }: UpdateStatusRequest = req.body;

      this.logger.info('Updating pedido status', { 
        pedidoId, 
        novoStatus 
      });

      const response = await this.atualizarStatusUseCase.execute({
        pedidoId,
        novoStatus
      });

      this.logger.info('Status updated successfully', { 
        pedidoId, 
        statusAnterior: response.statusAnterior,
        novoStatus: response.novoStatus 
      });

      res.status(200).json({
        success: true,
        data: {
          pedidoId: response.pedidoId,
          statusAnterior: response.statusAnterior,
          novoStatus: response.novoStatus,
          dataAtualizacao: response.dataAtualizacao
        }
      });
    } catch (error) {
      this.logger.error('Failed to update pedido status', {
        error: (error as Error).message,
        pedidoId: req.params.id,
        body: req.body
      });
      next(error);
    }
  }

  // GET /pedidos/:id
  async buscarPedido(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PEDIDO_ID',
            message: 'ID do pedido é obrigatório'
          }
        });
        return;
      }

      const pedidoId = id;

      this.logger.info('Fetching pedido', { pedidoId });

      const pedido = await this.pedidoRepository.findById(pedidoId);

      if (!pedido) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PEDIDO_NOT_FOUND',
            message: 'Pedido não encontrado'
          }
        });
        return;
      }

      this.logger.info('Pedido fetched successfully', { pedidoId });

      res.status(200).json({
        success: true,
        data: {
          pedidoId: pedido.id,
          clienteId: pedido.clienteId,
          status: pedido.status.toString(),
          dataCriacao: pedido.dataCriacao,
          dataAtualizacao: pedido.dataAtualizacao,
          observacoes: pedido.observacoes,
          itens: pedido.itens.map(item => ({
            produtoId: item.produto.id,
            nomeProduto: item.produto.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario.valor,
            moeda: item.precoUnitario.moeda,
            precoTotal: item.precoTotal.valor
          })),
          total: {
            valor: pedido.calcularTotal().valor,
            moeda: pedido.calcularTotal().moeda
          },
          quantidadeItens: pedido.calcularQuantidadeItens()
        }
      });
    } catch (error) {
      this.logger.error('Failed to fetch pedido', {
        error: (error as Error).message,
        pedidoId: req.params.id
      });
      next(error);
    }
  }
}
