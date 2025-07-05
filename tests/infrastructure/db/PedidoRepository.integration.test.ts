import { PrismaClient } from '@prisma/client';
import { PedidoRepository } from '../../../src/infrastructure/db/PedidoRepository.js';
import { Pedido } from '../../../src/domain/entities/Pedido.js';
import { ItemPedido } from '../../../src/domain/value-objects/ItemPedido.js';
import { Money } from '../../../src/domain/value-objects/Money.js';
import { StatusPedidoVO } from '../../../src/domain/value-objects/StatusPedido.js';
import { logger } from '../../../src/infrastructure/logger/Logger.js';

describe('PedidoRepository Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PedidoRepository;

  beforeAll(async () => {
    // Use test database
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/hexag_test';
    
    prisma = new PrismaClient();
    repository = new PedidoRepository(prisma, logger);

    // Connect to database
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.itemPedido.deleteMany();
    await prisma.pedido.deleteMany();
  });

  describe('save', () => {
    it('should save a new pedido with items', async () => {
      // Arrange
      const produto = { id: 'produto-1', nome: 'Produto Teste' };
      const item = new ItemPedido(produto, 2, new Money(10.50, 'BRL'));
      
      const pedido = new Pedido({
        clienteId: 'cliente-1',
        itens: [item],
        observacoes: 'Teste de observação'
      });

      // Act
      await repository.save(pedido);

      // Assert
      const savedPedido = await prisma.pedido.findUnique({
        where: { id: pedido.id },
        include: { itens: true }
      });

      expect(savedPedido).toBeTruthy();
      expect(savedPedido!.clienteId).toBe('cliente-1');
      expect(savedPedido!.observacoes).toBe('Teste de observação');
      expect(savedPedido!.itens).toHaveLength(1);
      
      const firstItem = savedPedido!.itens[0];
      expect(firstItem).toBeTruthy();
      expect(firstItem!.produtoId).toBe('produto-1');
      expect(firstItem!.quantidade).toBe(2);
      expect(Number(firstItem!.precoUnitario)).toBe(10.50);
      expect(firstItem!.moeda).toBe('BRL');
    });

    it('should save a pedido without items', async () => {
      // Arrange
      const pedido = new Pedido({
        clienteId: 'cliente-2'
      });

      // Act
      await repository.save(pedido);

      // Assert
      const savedPedido = await prisma.pedido.findUnique({
        where: { id: pedido.id },
        include: { itens: true }
      });

      expect(savedPedido).toBeTruthy();
      expect(savedPedido!.clienteId).toBe('cliente-2');
      expect(savedPedido!.itens).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return pedido when found', async () => {
      // Arrange
      const produto = { id: 'produto-1', nome: 'Produto Teste' };
      const item = new ItemPedido(produto, 1, new Money(25.00, 'USD'));
      
      const originalPedido = new Pedido({
        clienteId: 'cliente-1',
        itens: [item]
      });

      await repository.save(originalPedido);

      // Act
      const foundPedido = await repository.findById(originalPedido.id);

      // Assert
      expect(foundPedido).toBeTruthy();
      expect(foundPedido!.id).toBe(originalPedido.id);
      expect(foundPedido!.clienteId).toBe('cliente-1');
      expect(foundPedido!.itens).toHaveLength(1);
      
      const firstItem = foundPedido!.itens[0];
      expect(firstItem).toBeTruthy();
      expect(firstItem!.produto.id).toBe('produto-1');
      expect(firstItem!.quantidade).toBe(1);
      expect(firstItem!.precoUnitario.valor).toBe(25.00);
      expect(firstItem!.precoUnitario.moeda).toBe('USD');
    });

    it('should return null when pedido not found', async () => {
      // Act
      const foundPedido = await repository.findById('non-existent-id');

      // Assert
      expect(foundPedido).toBeNull();
    });
  });

  describe('findByClienteId', () => {
    it('should return all pedidos for a cliente', async () => {
      // Arrange
      const produto = { id: 'produto-1', nome: 'Produto Teste' };
      const item1 = new ItemPedido(produto, 1, new Money(10.00, 'BRL'));
      const item2 = new ItemPedido(produto, 2, new Money(15.00, 'BRL'));

      const pedido1 = new Pedido({
        clienteId: 'cliente-1',
        itens: [item1]
      });

      const pedido2 = new Pedido({
        clienteId: 'cliente-1',
        itens: [item2]
      });

      const pedido3 = new Pedido({
        clienteId: 'cliente-2',
        itens: [item1]
      });

      await repository.save(pedido1);
      await repository.save(pedido2);
      await repository.save(pedido3);

      // Act
      const pedidos = await repository.findByClienteId('cliente-1');

      // Assert
      expect(pedidos).toHaveLength(2);
      expect(pedidos.map(p => p.id)).toContain(pedido1.id);
      expect(pedidos.map(p => p.id)).toContain(pedido2.id);
      expect(pedidos.map(p => p.id)).not.toContain(pedido3.id);
    });

    it('should return empty array when no pedidos found', async () => {
      // Act
      const pedidos = await repository.findByClienteId('non-existent-cliente');

      // Assert
      expect(pedidos).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update pedido status and observacoes', async () => {
      // Arrange
      const produto = { id: 'produto-1', nome: 'Produto Teste' };
      const item = new ItemPedido(produto, 1, new Money(10.00, 'BRL'));
      
      const pedido = new Pedido({
        clienteId: 'cliente-1',
        itens: [item],
        observacoes: 'Observação original'
      });

      await repository.save(pedido);

      // Update the pedido
      const updatedPedido = new Pedido({
        id: pedido.id,
        clienteId: pedido.clienteId,
        itens: pedido.itens,
        status: StatusPedidoVO.confirmado(),
        dataCriacao: pedido.dataCriacao,
        dataAtualizacao: new Date(),
        observacoes: 'Observação atualizada'
      });

      // Act
      await repository.update(updatedPedido);

      // Assert
      const foundPedido = await repository.findById(pedido.id);
      expect(foundPedido).toBeTruthy();
      expect(foundPedido!.status.toString()).toBe('CONFIRMADO');
      expect(foundPedido!.observacoes).toBe('Observação atualizada');
    });
  });

  describe('delete', () => {
    it('should delete pedido and its items', async () => {
      // Arrange
      const produto = { id: 'produto-1', nome: 'Produto Teste' };
      const item = new ItemPedido(produto, 1, new Money(10.00, 'BRL'));
      
      const pedido = new Pedido({
        clienteId: 'cliente-1',
        itens: [item]
      });

      await repository.save(pedido);

      // Verify it exists
      let foundPedido = await repository.findById(pedido.id);
      expect(foundPedido).toBeTruthy();

      // Act
      await repository.delete(pedido.id);

      // Assert
      foundPedido = await repository.findById(pedido.id);
      expect(foundPedido).toBeNull();

      // Verify items are also deleted
      const items = await prisma.itemPedido.findMany({
        where: { pedidoId: pedido.id }
      });
      expect(items).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('should return true when pedido exists', async () => {
      // Arrange
      const pedido = new Pedido({
        clienteId: 'cliente-1'
      });

      await repository.save(pedido);

      // Act
      const exists = await repository.exists(pedido.id);

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false when pedido does not exist', async () => {
      // Act
      const exists = await repository.exists('non-existent-id');

      // Assert
      expect(exists).toBe(false);
    });
  });
});
