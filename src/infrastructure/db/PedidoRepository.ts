import { PrismaClient, Prisma } from '@prisma/client';
import { IPedidoRepository } from '../../application/ports/index.js';
import { Pedido } from '../../domain/entities/Pedido.js';
import { ItemPedido, ProdutoInfo } from '../../domain/value-objects/ItemPedido.js';
import { Money, Moeda } from '../../domain/value-objects/Money.js';
import { StatusPedido, StatusPedidoVO } from '../../domain/value-objects/StatusPedido.js';
import type { ILogger } from '../logger/Logger.js';

type PedidoWithItens = Prisma.PedidoGetPayload<{
  include: { itens: true }
}>;

type ItemPedidoData = {
  id: string;
  pedidoId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: Prisma.Decimal;
  moeda: string;
};

export class PedidoRepository implements IPedidoRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  async save(pedido: Pedido): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Criar o pedido
        await tx.pedido.create({
          data: {
            id: pedido.id,
            clienteId: pedido.clienteId,
            status: pedido.status.toString(),
            dataCriacao: pedido.dataCriacao,
            dataAtualizacao: pedido.dataAtualizacao,
            observacoes: pedido.observacoes,
            itens: {
              create: pedido.itens.map(item => ({
                produtoId: item.produto.id,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario.valor,
                moeda: item.precoUnitario.moeda
              }))
            }
          }
        });
      });

      this.logger.info('Pedido saved successfully', { pedidoId: pedido.id });
    } catch (error) {
      this.logger.error('Error saving pedido', { 
        pedidoId: pedido.id, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to save pedido: ${(error as Error).message}`);
    }
  }

  async findById(id: string): Promise<Pedido | null> {
    try {
      const pedidoData = await this.prisma.pedido.findUnique({
        where: { id },
        include: {
          itens: true
        }
      });

      if (!pedidoData) {
        return null;
      }

      return this.toDomainEntity(pedidoData);
    } catch (error) {
      this.logger.error('Error finding pedido by id', { 
        id, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to find pedido: ${(error as Error).message}`);
    }
  }

  async findByClienteId(clienteId: string): Promise<Pedido[]> {
    try {
      const pedidosData = await this.prisma.pedido.findMany({
        where: { clienteId },
        include: {
          itens: true
        },
        orderBy: {
          dataCriacao: 'desc'
        }
      });

      return pedidosData.map((data: PedidoWithItens) => this.toDomainEntity(data));
    } catch (error) {
      this.logger.error('Error finding pedidos by cliente id', { 
        clienteId, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to find pedidos by cliente: ${(error as Error).message}`);
    }
  }

  async update(pedido: Pedido): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Atualizar o pedido
        await tx.pedido.update({
          where: { id: pedido.id },
          data: {
            status: pedido.status.toString(),
            dataAtualizacao: pedido.dataAtualizacao,
            observacoes: pedido.observacoes
          }
        });

        // Remover itens existentes
        await tx.itemPedido.deleteMany({
          where: { pedidoId: pedido.id }
        });

        // Criar novos itens
        if (pedido.itens.length > 0) {
          await tx.itemPedido.createMany({
            data: pedido.itens.map(item => ({
              pedidoId: pedido.id,
              produtoId: item.produto.id,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario.valor,
              moeda: item.precoUnitario.moeda
            }))
          });
        }
      });

      this.logger.info('Pedido updated successfully', { pedidoId: pedido.id });
    } catch (error) {
      this.logger.error('Error updating pedido', { 
        pedidoId: pedido.id, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to update pedido: ${(error as Error).message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.pedido.delete({
        where: { id }
      });

      this.logger.info('Pedido deleted successfully', { pedidoId: id });
    } catch (error) {
      this.logger.error('Error deleting pedido', { 
        id, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to delete pedido: ${(error as Error).message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.prisma.pedido.count({
        where: { id }
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking if pedido exists', { 
        id, 
        error: (error as Error).message 
      });
      throw new Error(`Failed to check pedido existence: ${(error as Error).message}`);
    }
  }

  private toDomainEntity(data: PedidoWithItens): Pedido {
    const itens = data.itens.map((item: ItemPedidoData) => {
      const produto: ProdutoInfo = {
        id: item.produtoId,
        nome: `Produto ${item.produtoId}`, // In a real app, this would come from a products service
      };
      
      return new ItemPedido(
        produto,
        item.quantidade,
        new Money(Number(item.precoUnitario), this.validateMoeda(item.moeda))
      );
    });

    return new Pedido({
      id: data.id,
      clienteId: data.clienteId,
      itens,
      status: this.statusFromString(data.status),
      dataCriacao: data.dataCriacao,
      dataAtualizacao: data.dataAtualizacao,
      observacoes: data.observacoes || undefined
    });
  }

  private validateMoeda(moeda: string): 'BRL' | 'USD' | 'EUR' {
    if (moeda === 'BRL' || moeda === 'USD' || moeda === 'EUR') {
      return moeda;
    }
    return 'BRL'; // Default fallback
  }

  private statusFromString(status: string): StatusPedidoVO {
    switch (status) {
      case StatusPedido.PENDENTE:
        return StatusPedidoVO.pendente();
      case StatusPedido.CONFIRMADO:
        return StatusPedidoVO.confirmado();
      case StatusPedido.PREPARANDO:
        return StatusPedidoVO.preparando();
      case StatusPedido.PRONTO:
        return StatusPedidoVO.pronto();
      case StatusPedido.ENVIADO:
        return StatusPedidoVO.enviado();
      case StatusPedido.ENTREGUE:
        return StatusPedidoVO.entregue();
      case StatusPedido.CANCELADO:
        return StatusPedidoVO.cancelado();
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }
}
