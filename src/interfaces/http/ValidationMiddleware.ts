import { Request, Response, NextFunction } from 'express';
import { StatusPedido } from '@/domain/value-objects/StatusPedido.js';
import type { ILogger } from '@/infrastructure/logger/Logger.js';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationMiddleware {
  constructor(private readonly logger: ILogger) {}

  // Middleware para validar criação de pedido
  validateCreatePedido = (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const { clienteId, observacoes } = req.body;

    // Validar clienteId
    if (!clienteId) {
      errors.push({
        field: 'clienteId',
        message: 'ClienteId é obrigatório'
      });
    } else if (typeof clienteId !== 'string' || clienteId.trim() === '') {
      errors.push({
        field: 'clienteId',
        message: 'ClienteId deve ser uma string não vazia',
        value: clienteId
      });
    }

    // Validar observacoes (opcional)
    if (observacoes !== undefined && typeof observacoes !== 'string') {
      errors.push({
        field: 'observacoes',
        message: 'Observações deve ser uma string',
        value: observacoes
      });
    }

    if (errors.length > 0) {
      this.logger.warn('Validation failed for create pedido request', {
        errors,
        body: req.body
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: errors
        }
      });
      return;
    }

    next();
  };

  // Middleware para validar adição de item
  validateAddItem = (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const { produtoId, nomeProduto, quantidade, precoUnitario, moeda } = req.body;

    // Validar produtoId
    if (!produtoId) {
      errors.push({
        field: 'produtoId',
        message: 'ProdutoId é obrigatório'
      });
    } else if (typeof produtoId !== 'string' || produtoId.trim() === '') {
      errors.push({
        field: 'produtoId',
        message: 'ProdutoId deve ser uma string não vazia',
        value: produtoId
      });
    }

    // Validar nomeProduto
    if (!nomeProduto) {
      errors.push({
        field: 'nomeProduto',
        message: 'Nome do produto é obrigatório'
      });
    } else if (typeof nomeProduto !== 'string' || nomeProduto.trim() === '') {
      errors.push({
        field: 'nomeProduto',
        message: 'Nome do produto deve ser uma string não vazia',
        value: nomeProduto
      });
    }

    // Validar quantidade
    if (quantidade === undefined || quantidade === null) {
      errors.push({
        field: 'quantidade',
        message: 'Quantidade é obrigatória'
      });
    } else if (!Number.isInteger(quantidade) || quantidade <= 0) {
      errors.push({
        field: 'quantidade',
        message: 'Quantidade deve ser um número inteiro positivo',
        value: quantidade
      });
    } else if (quantidade > 1000) {
      errors.push({
        field: 'quantidade',
        message: 'Quantidade não pode ser maior que 1000',
        value: quantidade
      });
    }

    // Validar precoUnitario
    if (precoUnitario === undefined || precoUnitario === null) {
      errors.push({
        field: 'precoUnitario',
        message: 'Preço unitário é obrigatório'
      });
    } else if (typeof precoUnitario !== 'number' || precoUnitario <= 0) {
      errors.push({
        field: 'precoUnitario',
        message: 'Preço unitário deve ser um número positivo',
        value: precoUnitario
      });
    }

    // Validar moeda (opcional)
    if (moeda !== undefined) {
      const moedasValidas = ['BRL', 'USD', 'EUR'];
      if (!moedasValidas.includes(moeda)) {
        errors.push({
          field: 'moeda',
          message: 'Moeda deve ser uma das opções: BRL, USD, EUR',
          value: moeda
        });
      }
    }

    if (errors.length > 0) {
      this.logger.warn('Validation failed for add item request', {
        errors,
        body: req.body
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: errors
        }
      });
      return;
    }

    next();
  };

  // Middleware para validar atualização de status
  validateUpdateStatus = (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const { novoStatus } = req.body;

    // Validar novoStatus
    if (!novoStatus) {
      errors.push({
        field: 'novoStatus',
        message: 'Novo status é obrigatório'
      });
    } else if (!Object.values(StatusPedido).includes(novoStatus as StatusPedido)) {
      errors.push({
        field: 'novoStatus',
        message: `Status deve ser um dos valores: ${Object.values(StatusPedido).join(', ')}`,
        value: novoStatus
      });
    }

    if (errors.length > 0) {
      this.logger.warn('Validation failed for update status request', {
        errors,
        body: req.body
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: errors
        }
      });
      return;
    }

    next();
  };

  // Middleware para capturar erros gerais
  errorHandler = (error: Error, req: Request, res: Response): void => {
    this.logger.error('Unhandled error in request', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        ...(isDevelopment && { details: error.message, stack: error.stack })
      }
    });
  };

  // Middleware para log de requisições
  requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.info('HTTP Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('content-length')
      });
    });

    this.logger.info('HTTP Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      contentType: req.get('content-type')
    });

    next();
  };
}
