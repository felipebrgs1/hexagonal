import express, { Router } from 'express';
import { PedidoController } from './PedidoController.js';
import { ValidationMiddleware } from './ValidationMiddleware.js';

export function createPedidoRoutes(
  controller: PedidoController,
  validation: ValidationMiddleware
): Router {
  const router = Router();

  // Middleware para parsing JSON
  router.use(express.json());

  // Middleware para log de requisições
  router.use(validation.requestLogger);

  // POST /pedidos - Criar novo pedido
  router.post(
    '/',
    validation.validateCreatePedido,
    controller.criarPedido.bind(controller)
  );

  // POST /pedidos/:id/itens - Adicionar item ao pedido
  router.post(
    '/:id/itens',
    validation.validateAddItem,
    controller.adicionarItem.bind(controller)
  );

  // PUT /pedidos/:id/status - Atualizar status do pedido
  router.put(
    '/:id/status',
    validation.validateUpdateStatus,
    controller.atualizarStatus.bind(controller)
  );

  // GET /pedidos/:id - Buscar pedido por ID
  router.get(
    '/:id',
    controller.buscarPedido.bind(controller)
  );

  // Middleware para tratamento de erros
  router.use(validation.errorHandler);

  return router;
}
