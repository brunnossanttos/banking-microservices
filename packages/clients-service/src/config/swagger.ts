import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banking Clients Service API',
      version: '1.0.0',
      description: `
API do microsserviço de clientes da plataforma bancária.

## Autenticação

A maioria dos endpoints requer autenticação via JWT Bearer Token.
Para obter um token, utilize o endpoint \`POST /api/auth/login\`.

## Rate Limiting

- 100 requisições por minuto por IP em ambiente de produção
- Endpoints de autenticação têm limite adicional de 10 requisições por minuto

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 403 | Forbidden - Sem permissão para o recurso |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Recurso já existe |
| 422 | Unprocessable Entity - Erro de validação |
| 500 | Internal Server Error - Erro interno |
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
        url: 'http://localhost:3001',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.banking.com',
        description: 'Servidor de Produção',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints de autenticação e autorização',
      },
      {
        name: 'Users',
        description: 'Gerenciamento de usuários e contas',
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
          description: 'Token JWT obtido através do endpoint /api/auth/login',
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
        Address: {
          type: 'object',
          properties: {
            street: {
              type: 'string',
              maxLength: 255,
              example: 'Rua das Flores',
            },
            number: {
              type: 'string',
              maxLength: 20,
              example: '123',
            },
            complement: {
              type: 'string',
              maxLength: 100,
              example: 'Apto 456',
            },
            neighborhood: {
              type: 'string',
              maxLength: 100,
              example: 'Centro',
            },
            city: {
              type: 'string',
              maxLength: 100,
              example: 'São Paulo',
            },
            state: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
              example: 'SP',
            },
            zipCode: {
              type: 'string',
              pattern: '^\\d{5}-?\\d{3}$',
              example: '01234-567',
            },
          },
        },
        BankingDetails: {
          type: 'object',
          required: ['agency', 'account', 'accountType'],
          properties: {
            agency: {
              type: 'string',
              minLength: 1,
              maxLength: 10,
              example: '0001',
            },
            account: {
              type: 'string',
              minLength: 1,
              maxLength: 20,
              example: '12345-6',
            },
            accountType: {
              type: 'string',
              enum: ['checking', 'savings'],
              example: 'checking',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@email.com',
            },
            name: {
              type: 'string',
              example: 'João Silva',
            },
            cpf: {
              type: 'string',
              example: '12345678901',
            },
            profilePictureUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/photo.jpg',
            },
            balance: {
              type: 'number',
              format: 'decimal',
              example: 1500.5,
            },
            address: {
              $ref: '#/components/schemas/Address',
            },
            bankingDetails: {
              $ref: '#/components/schemas/BankingDetails',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['email', 'password', 'name', 'cpf', 'bankingDetails'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@email.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'senhaSegura123',
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 255,
              example: 'João Silva',
            },
            cpf: {
              type: 'string',
              pattern: '^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$',
              example: '123.456.789-01',
            },
            address: {
              $ref: '#/components/schemas/Address',
            },
            bankingDetails: {
              $ref: '#/components/schemas/BankingDetails',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 255,
              example: 'João Silva',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'novo@email.com',
            },
            address: {
              $ref: '#/components/schemas/Address',
            },
            bankingDetails: {
              type: 'object',
              properties: {
                agency: {
                  type: 'string',
                },
                account: {
                  type: 'string',
                },
                accountType: {
                  type: 'string',
                  enum: ['checking', 'savings'],
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@email.com',
            },
            password: {
              type: 'string',
              example: 'senhaSegura123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
                },
                expiresIn: {
                  type: 'integer',
                  example: 900,
                  description: 'Tempo de expiração em segundos',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
            },
          },
        },
        DepositRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'number',
              minimum: 0.01,
              example: 500.0,
            },
          },
        },
        WithdrawRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'number',
              minimum: 0.01,
              example: 100.0,
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
              example: 'clients-service',
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
                redis: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
                },
                rabbitmq: {
                  type: 'string',
                  enum: ['connected', 'disconnected'],
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
                  message: 'Resource not found',
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
                      field: 'email',
                      message: 'Invalid email format',
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
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autenticar usuário',
          description: 'Realiza login e retorna tokens de acesso',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login realizado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LoginResponse',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '422': {
              $ref: '#/components/responses/ValidationError',
            },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renovar token de acesso',
          description: 'Utiliza refresh token para obter novo access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RefreshTokenRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Token renovado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' },
                          expiresIn: { type: 'integer' },
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
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Encerrar sessão',
          description: 'Invalida o refresh token especificado',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RefreshTokenRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Logout realizado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string', example: 'Logged out successfully' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/logout-all': {
        post: {
          tags: ['Auth'],
          summary: 'Encerrar todas as sessões',
          description: 'Invalida todos os refresh tokens do usuário autenticado',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Todas as sessões encerradas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string', example: 'All sessions terminated' },
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
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Obter dados do usuário autenticado',
          description: 'Retorna informações do usuário baseado no token JWT',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Dados do usuário',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
          },
        },
      },
      '/api/users': {
        post: {
          tags: ['Users'],
          summary: 'Criar novo usuário',
          description: 'Registra um novo usuário na plataforma',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Usuário criado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Email ou CPF já cadastrado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
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
      '/api/users/{userId}': {
        get: {
          tags: ['Users'],
          summary: 'Obter dados do usuário',
          description: 'Retorna informações completas de um usuário específico',
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
              description: 'ID único do usuário',
            },
          ],
          responses: {
            '200': {
              description: 'Dados do usuário',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/User',
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
        patch: {
          tags: ['Users'],
          summary: 'Atualizar dados do usuário',
          description: 'Atualiza informações parciais do usuário',
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
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateUserRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Usuário atualizado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/User',
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
            '422': {
              $ref: '#/components/responses/ValidationError',
            },
          },
        },
      },
      '/api/users/{userId}/profile-picture': {
        patch: {
          tags: ['Users'],
          summary: 'Atualizar foto de perfil',
          description: 'Atualiza a URL da foto de perfil do usuário',
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
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['profilePictureUrl'],
                  properties: {
                    profilePictureUrl: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://example.com/photo.jpg',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Foto atualizada',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/User',
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
          },
        },
      },
      '/api/users/{userId}/deposit': {
        post: {
          tags: ['Users'],
          summary: 'Realizar depósito',
          description: 'Adiciona valor ao saldo do usuário',
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
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DepositRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Depósito realizado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            $ref: '#/components/schemas/User',
                          },
                          transaction: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              type: { type: 'string', example: 'deposit' },
                              amount: { type: 'number', example: 500.0 },
                              status: { type: 'string', example: 'completed' },
                            },
                          },
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
            '422': {
              $ref: '#/components/responses/ValidationError',
            },
          },
        },
      },
      '/api/users/{userId}/withdraw': {
        post: {
          tags: ['Users'],
          summary: 'Realizar saque',
          description: 'Remove valor do saldo do usuário',
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
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WithdrawRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Saque realizado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            $ref: '#/components/schemas/User',
                          },
                          transaction: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              type: { type: 'string', example: 'withdrawal' },
                              amount: { type: 'number', example: 100.0 },
                              status: { type: 'string', example: 'completed' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Saldo insuficiente',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  example: {
                    success: false,
                    error: {
                      code: 'INSUFFICIENT_BALANCE',
                      message: 'Insufficient balance for withdrawal',
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
          },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Verificar saúde do serviço',
          description: 'Retorna status do serviço e suas dependências',
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
