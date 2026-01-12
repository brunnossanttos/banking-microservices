import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banking Transactions Service API',
      version: '1.0.0',
      description: `
API do microsserviço de transações da plataforma bancária.

## Autenticação

Todos os endpoints requerem autenticação via JWT Bearer Token.
O token deve ser obtido através do Clients Service (\`POST /api/auth/login\`).

## Tipos de Transação

| Tipo | Descrição |
|------|-----------|
| transfer | Transferência entre usuários |
| deposit | Depósito na conta |
| withdrawal | Saque da conta |

## Status das Transações

| Status | Descrição |
|--------|-----------|
| pending | Transação criada, aguardando processamento |
| processing | Transação em processamento |
| completed | Transação concluída com sucesso |
| failed | Transação falhou |
| reversed | Transação revertida |

## Comunicação Assíncrona

Este serviço se comunica com o Clients Service de forma:
- **Síncrona (HTTP)**: Para validação de usuários e atualização de saldos
- **Assíncrona (RabbitMQ)**: Para publicação de eventos de transação
      `,
      contact: {
        name: 'Suporte API',
        email: 'api@banking.com',
      },
      license: {
        name: 'Proprietário',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.banking.com',
        description: 'Servidor de Produção',
      },
    ],
    tags: [
      {
        name: 'Transactions',
        description: 'Operações de transferência entre contas',
      },
      {
        name: 'Health',
        description: 'Verificação de saúde do serviço',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do Clients Service /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            senderUserId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            receiverUserId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 150.5,
            },
            type: {
              type: 'string',
              enum: ['transfer', 'deposit', 'withdrawal'],
              example: 'transfer',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'reversed'],
              example: 'completed',
            },
            description: {
              type: 'string',
              nullable: true,
              maxLength: 255,
              example: 'Pagamento de aluguel',
            },
            failureReason: {
              type: 'string',
              nullable: true,
              example: null,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:05Z',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:30:05Z',
            },
          },
        },
        CreateTransactionRequest: {
          type: 'object',
          required: ['senderUserId', 'receiverUserId', 'amount'],
          properties: {
            senderUserId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário remetente',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            receiverUserId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do usuário destinatário',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            amount: {
              type: 'number',
              minimum: 0.01,
              maximum: 1000000,
              description: 'Valor da transferência (máximo R$ 1.000.000,00)',
              example: 150.5,
            },
            description: {
              type: 'string',
              maxLength: 255,
              description: 'Descrição opcional da transferência',
              example: 'Pagamento de aluguel',
            },
          },
        },
        TransactionListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Transaction',
                  },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      example: 1,
                    },
                    limit: {
                      type: 'integer',
                      example: 20,
                    },
                    total: {
                      type: 'integer',
                      example: 150,
                    },
                    totalPages: {
                      type: 'integer',
                      example: 8,
                    },
                  },
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              example: 'healthy',
            },
            service: {
              type: 'string',
              example: 'transactions-service',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            dependencies: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                },
                rabbitmq: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                },
                'clients-service': {
                  type: 'string',
                  enum: ['reachable', 'unreachable'],
                },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de autenticação ausente ou inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Invalid or expired token',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Acesso negado ao recurso',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Access denied to this resource',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Transaction not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Erro de validação nos dados enviados',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: [
                    {
                      field: 'amount',
                      message: 'Amount must be positive',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/api/transactions': {
        post: {
          tags: ['Transactions'],
          summary: 'Criar transferência',
          description: `
Cria uma nova transferência entre dois usuários.

**Validações realizadas:**
- Usuário remetente deve existir e ter saldo suficiente
- Usuário destinatário deve existir
- Usuário autenticado deve ser o remetente
- Valor deve estar entre R$ 0,01 e R$ 1.000.000,00

**Fluxo:**
1. Valida dados de entrada
2. Verifica existência dos usuários (via Clients Service)
3. Debita valor do remetente
4. Credita valor no destinatário
5. Registra transação
6. Publica evento no RabbitMQ
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateTransactionRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Transferência criada com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/Transaction',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Saldo insuficiente ou transferência para si mesmo',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  examples: {
                    insufficientBalance: {
                      summary: 'Saldo insuficiente',
                      value: {
                        success: false,
                        error: {
                          code: 'INSUFFICIENT_BALANCE',
                          message: 'Sender does not have sufficient balance',
                        },
                      },
                    },
                    sameUser: {
                      summary: 'Transferência para si mesmo',
                      value: {
                        success: false,
                        error: {
                          code: 'INVALID_TRANSFER',
                          message: 'Cannot transfer to yourself',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              description: 'Usuário não encontrado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'USER_NOT_FOUND',
                      message: 'Sender or receiver not found',
                    },
                  },
                },
              },
            },
            '422': {
              $ref: '#/components/responses/ValidationError',
            },
          },
        },
      },
      '/api/transactions/{transactionId}': {
        get: {
          tags: ['Transactions'],
          summary: 'Obter transação por ID',
          description:
            'Retorna detalhes de uma transação específica. O usuário autenticado deve ser participante da transação (remetente ou destinatário).',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'transactionId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'ID único da transação',
            },
          ],
          responses: {
            '200': {
              description: 'Detalhes da transação',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/Transaction',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/transactions/user/{userId}': {
        get: {
          tags: ['Transactions'],
          summary: 'Listar transações do usuário',
          description: `
Retorna histórico de transações de um usuário com paginação e filtros.

**Filtros disponíveis:**
- \`status\`: Filtrar por status da transação
- \`type\`: Filtrar por tipo (transfer, deposit, withdrawal)
- \`startDate\` / \`endDate\`: Filtrar por período

**Ordenação:**
Transações são ordenadas por data de criação (mais recentes primeiro).
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'ID do usuário',
            },
            {
              name: 'page',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                default: 1,
              },
              description: 'Número da página',
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              description: 'Itens por página (máximo 100)',
            },
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed', 'reversed'],
              },
              description: 'Filtrar por status',
            },
            {
              name: 'type',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['transfer', 'deposit', 'withdrawal'],
              },
              description: 'Filtrar por tipo',
            },
            {
              name: 'startDate',
              in: 'query',
              schema: {
                type: 'string',
                format: 'date-time',
              },
              description: 'Data inicial (ISO 8601)',
            },
            {
              name: 'endDate',
              in: 'query',
              schema: {
                type: 'string',
                format: 'date-time',
              },
              description: 'Data final (ISO 8601)',
            },
          ],
          responses: {
            '200': {
              description: 'Lista de transações',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TransactionListResponse',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Verificar saúde do serviço',
          description:
            'Retorna status do serviço e suas dependências (banco de dados, RabbitMQ, Clients Service)',
          responses: {
            '200': {
              description: 'Serviço saudável',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
            '503': {
              description: 'Serviço degradado ou indisponível',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
