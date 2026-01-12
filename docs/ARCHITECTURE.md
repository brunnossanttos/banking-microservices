# Arquitetura do Sistema

Este documento detalha as decisoes arquiteturais, padroes utilizados e o fluxo de comunicacao entre os componentes do sistema Banking Microservices.

## Visao Geral

O sistema e composto por dois microsservicos independentes que se comunicam de forma sincrona (HTTP) e assincrona (mensageria), seguindo uma arquitetura orientada a eventos.

## Diagrama de Arquitetura

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                      CLIENTES                                           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         │ HTTPS
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LOAD BALANCER                                  │
│                                   (SSL Termination)                                     │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│       CLIENTS SERVICE             │       │     TRANSACTIONS SERVICE          │
│           :3001                   │       │           :3002                   │
│                                   │       │                                   │
│  ┌─────────────────────────────┐  │       │  ┌─────────────────────────────┐  │
│  │        Controllers          │  │       │  │        Controllers          │  │
│  │  - authController           │  │       │  │  - transactionController    │  │
│  │  - userController           │  │       │  │  - healthController         │  │
│  │  - healthController         │  │       │  └─────────────────────────────┘  │
│  └─────────────────────────────┘  │       │                                   │
│               │                   │       │               │                   │
│               ▼                   │       │               ▼                   │
│  ┌─────────────────────────────┐  │       │  ┌─────────────────────────────┐  │
│  │         Services            │  │       │  │         Services            │  │
│  │  - authService              │  │◄──────┼──│  - transactionService       │  │
│  │  - userService              │  │  HTTP │  │  - eventService             │  │
│  │  - cacheService             │  │       │  └─────────────────────────────┘  │
│  │  - eventService             │  │       │               │                   │
│  └─────────────────────────────┘  │       │               ▼                   │
│               │                   │       │  ┌─────────────────────────────┐  │
│               ▼                   │       │  │       Repositories          │  │
│  ┌─────────────────────────────┐  │       │  │  - transactionRepository    │  │
│  │       Repositories          │  │       │  └─────────────────────────────┘  │
│  │  - userRepository           │  │       │               │                   │
│  │  - authRepository           │  │       │               │                   │
│  └─────────────────────────────┘  │       └───────────────┼───────────────────┘
│               │                   │                       │
└───────────────┼───────────────────┘                       │
                │                                           │
    ┌───────────┼───────────┬───────────────────────────────┘
    │           │           │
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌──────────┐
│ Redis │  │ Postgr│  │ PostgreSQL│
│ Cache │  │ esSQL │  │  trans_db │
│       │  │clients│  │           │
└───────┘  │  _db  │  └──────────┘
           └───────┘

                         │
                         │ Publish Events
                         ▼
              ┌─────────────────────┐
              │      RabbitMQ       │
              │                     │
              │  Exchanges:         │
              │  - clients.exchange │
              │  - transactions.exc │
              │  - notifications.exc│
              └─────────────────────┘
```

## Fluxo de Comunicacao

### 1. Fluxo de Autenticacao

```
┌──────────┐      ┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  Client  │      │ Auth Controller │      │ Auth Service │      │ User Repo   │
└────┬─────┘      └────────┬────────┘      └──────┬───────┘      └──────┬──────┘
     │                     │                      │                     │
     │  POST /auth/login   │                      │                     │
     │────────────────────►│                      │                     │
     │                     │                      │                     │
     │                     │   login(email, pwd)  │                     │
     │                     │─────────────────────►│                     │
     │                     │                      │                     │
     │                     │                      │  findByEmail()      │
     │                     │                      │────────────────────►│
     │                     │                      │                     │
     │                     │                      │◄────────────────────│
     │                     │                      │     user data       │
     │                     │                      │                     │
     │                     │                      │  bcrypt.compare()   │
     │                     │                      │─────────┐           │
     │                     │                      │         │           │
     │                     │                      │◄────────┘           │
     │                     │                      │                     │
     │                     │                      │  generateTokens()   │
     │                     │                      │─────────┐           │
     │                     │                      │         │           │
     │                     │                      │◄────────┘           │
     │                     │                      │                     │
     │                     │◄─────────────────────│                     │
     │                     │   { accessToken,     │                     │
     │                     │     refreshToken }   │                     │
     │                     │                      │                     │
     │◄────────────────────│                      │                     │
     │   200 OK + tokens   │                      │                     │
     │                     │                      │                     │
```

### 2. Fluxo de Transferencia

```
┌──────────┐   ┌───────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────┐
│  Client  │   │  Transaction  │   │  Transaction │   │   Clients   │   │ RabbitMQ │
│          │   │  Controller   │   │   Service    │   │   Service   │   │          │
└────┬─────┘   └───────┬───────┘   └──────┬───────┘   └──────┬──────┘   └────┬─────┘
     │                 │                  │                  │               │
     │ POST /transactions                 │                  │               │
     │ {sender, receiver, amount}         │                  │               │
     │────────────────►│                  │                  │               │
     │                 │                  │                  │               │
     │                 │  createTransfer()│                  │               │
     │                 │─────────────────►│                  │               │
     │                 │                  │                  │               │
     │                 │                  │  GET /users/:id  │               │
     │                 │                  │─────────────────►│               │
     │                 │                  │  (validate sender)               │
     │                 │                  │◄─────────────────│               │
     │                 │                  │                  │               │
     │                 │                  │  GET /users/:id  │               │
     │                 │                  │─────────────────►│               │
     │                 │                  │  (validate receiver)             │
     │                 │                  │◄─────────────────│               │
     │                 │                  │                  │               │
     │                 │                  │  Check balance   │               │
     │                 │                  │─────────┐        │               │
     │                 │                  │         │        │               │
     │                 │                  │◄────────┘        │               │
     │                 │                  │                  │               │
     │                 │                  │  Create transaction (pending)    │
     │                 │                  │─────────┐        │               │
     │                 │                  │         │        │               │
     │                 │                  │◄────────┘        │               │
     │                 │                  │                  │               │
     │                 │                  │  Publish: transaction.created    │
     │                 │                  │─────────────────────────────────►│
     │                 │                  │                  │               │
     │                 │                  │  POST /withdraw  │               │
     │                 │                  │─────────────────►│               │
     │                 │                  │◄─────────────────│               │
     │                 │                  │                  │               │
     │                 │                  │  POST /deposit   │               │
     │                 │                  │─────────────────►│               │
     │                 │                  │◄─────────────────│               │
     │                 │                  │                  │               │
     │                 │                  │  Update status: completed        │
     │                 │                  │─────────┐        │               │
     │                 │                  │         │        │               │
     │                 │                  │◄────────┘        │               │
     │                 │                  │                  │               │
     │                 │                  │  Publish: transaction.completed  │
     │                 │                  │─────────────────────────────────►│
     │                 │                  │                  │               │
     │                 │◄─────────────────│                  │               │
     │◄────────────────│                  │                  │               │
     │  201 Created    │                  │                  │               │
     │  {transaction}  │                  │                  │               │
```

### 3. Fluxo de Eventos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RabbitMQ                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      clients.exchange (topic)                        │   │
│  │                                                                      │   │
│  │   Routing Keys:                                                      │   │
│  │   - user.created ─────────────► [notifications queue]               │   │
│  │   - user.updated ─────────────► [audit queue]                       │   │
│  │   - banking.details.updated ──► [transactions queue]                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   transactions.exchange (topic)                      │   │
│  │                                                                      │   │
│  │   Routing Keys:                                                      │   │
│  │   - transaction.created ──────► [audit queue]                       │   │
│  │   - transaction.completed ────► [notifications queue]               │   │
│  │   - transaction.failed ───────► [alerts queue]                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   notifications.exchange (topic)                     │   │
│  │                                                                      │   │
│  │   Routing Keys:                                                      │   │
│  │   - notification.send ────────► [email queue]                       │   │
│  │                                 [sms queue]                          │   │
│  │                                 [push queue]                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Padroes Arquiteturais

### 1. Layered Architecture

Cada microsservico segue uma arquitetura em camadas:

```
┌─────────────────────────────────────────────┐
│              Presentation Layer              │
│            (Controllers, Routes)             │
├─────────────────────────────────────────────┤
│              Business Layer                  │
│                (Services)                    │
├─────────────────────────────────────────────┤
│              Data Access Layer               │
│              (Repositories)                  │
├─────────────────────────────────────────────┤
│              Infrastructure Layer            │
│        (Database, Cache, Message Broker)     │
└─────────────────────────────────────────────┘
```

### 2. Repository Pattern

Abstrai o acesso a dados, permitindo:
- Troca de implementacao de banco sem afetar a logica de negocio
- Facilidade de testes com mocks
- Queries centralizadas e reutilizaveis

### 3. Event-Driven Architecture

Comunicacao assincrona via RabbitMQ para:
- Desacoplamento entre servicos
- Resiliencia a falhas
- Processamento assincrono de tarefas
- Auditoria e logging de eventos

### 4. Cache-Aside Pattern

Estrategia de cache implementada:

```
┌────────────────────────────────────────────────────────────┐
│                      Read Operation                         │
│                                                            │
│   1. Check cache ──► Cache hit? ──► Return cached data    │
│                         │                                  │
│                         ▼ No                               │
│                    Query database                          │
│                         │                                  │
│                         ▼                                  │
│                    Store in cache                          │
│                         │                                  │
│                         ▼                                  │
│                    Return data                             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     Write Operation                         │
│                                                            │
│   1. Update database                                       │
│   2. Invalidate cache                                      │
│   3. Return result                                         │
└────────────────────────────────────────────────────────────┘
```

## Modelo de Dados

### Clients Service

```
┌─────────────────────────────────────────────────────────────┐
│                          users                               │
├─────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                        │
│ email               VARCHAR(255) UNIQUE NOT NULL            │
│ password_hash       VARCHAR(255) NOT NULL                   │
│ name                VARCHAR(255) NOT NULL                   │
│ cpf                 VARCHAR(11) UNIQUE NOT NULL             │
│ address_*           VARCHAR (optional fields)               │
│ banking_agency      VARCHAR(4) NOT NULL                     │
│ banking_account     VARCHAR(20) NOT NULL                    │
│ banking_account_type ENUM('checking','savings')             │
│ balance             DECIMAL(15,2) DEFAULT 0 CHECK >= 0      │
│ profile_picture_url VARCHAR(500)                            │
│ status              ENUM('active','inactive','blocked'...)  │
│ email_verified      BOOLEAN DEFAULT FALSE                   │
│ created_at          TIMESTAMP DEFAULT NOW()                 │
│ updated_at          TIMESTAMP                               │
│ deleted_at          TIMESTAMP (soft delete)                 │
├─────────────────────────────────────────────────────────────┤
│ UNIQUE(banking_agency, banking_account)                     │
│ INDEX(email), INDEX(cpf), INDEX(status)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      refresh_tokens                          │
├─────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                        │
│ user_id             UUID REFERENCES users(id)               │
│ token               VARCHAR(255) UNIQUE NOT NULL            │
│ expires_at          TIMESTAMP NOT NULL                      │
│ revoked_at          TIMESTAMP                               │
│ created_at          TIMESTAMP DEFAULT NOW()                 │
├─────────────────────────────────────────────────────────────┤
│ INDEX(user_id), INDEX(token)                                │
└─────────────────────────────────────────────────────────────┘
```

### Transactions Service

```
┌─────────────────────────────────────────────────────────────┐
│                       transactions                           │
├─────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                        │
│ sender_user_id      UUID NOT NULL                           │
│ receiver_user_id    UUID NOT NULL                           │
│ amount              DECIMAL(15,2) NOT NULL CHECK > 0        │
│ fee                 DECIMAL(15,2) DEFAULT 0                 │
│ type                ENUM('transfer','deposit',...)          │
│ status              ENUM('pending','completed','failed',...)│
│ description         VARCHAR(255)                            │
│ created_at          TIMESTAMP DEFAULT NOW()                 │
│ updated_at          TIMESTAMP                               │
├─────────────────────────────────────────────────────────────┤
│ INDEX(sender_user_id), INDEX(receiver_user_id)              │
│ INDEX(status), INDEX(created_at)                            │
└─────────────────────────────────────────────────────────────┘
```

## Seguranca

### Autenticacao JWT

```
┌─────────────────────────────────────────────────────────────┐
│                     JWT Token Structure                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Header: {                                                  │
│    "alg": "HS256",                                         │
│    "typ": "JWT"                                            │
│  }                                                          │
│                                                             │
│  Payload: {                                                 │
│    "userId": "uuid",                                       │
│    "email": "user@email.com",                              │
│    "iat": 1234567890,                                      │
│    "exp": 1234568790                                       │
│  }                                                          │
│                                                             │
│  Signature: HMACSHA256(                                    │
│    base64UrlEncode(header) + "." +                         │
│    base64UrlEncode(payload),                               │
│    secret                                                   │
│  )                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Token Lifecycle:
- Access Token: 15 minutos
- Refresh Token: 7 dias
- Refresh Token Rotation: novo token a cada refresh
```

### Middlewares de Seguranca

```
Request ──► CORS ──► Helmet ──► Rate Limit ──► Auth ──► Validation ──► Controller
```

## Tratamento de Erros

### Hierarquia de Erros

```
                    ┌─────────────┐
                    │    Error    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  AppError   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────▼─────┐    ┌──────▼──────┐   ┌─────▼─────┐
   │ BadRequest│    │ Unauthorized│   │ NotFound  │
   │   (400)   │    │    (401)    │   │   (404)   │
   └───────────┘    └─────────────┘   └───────────┘
```

### Formato de Resposta de Erro

```json
{
  "success": false,
  "error": "Mensagem de erro legivel",
  "details": [
    {
      "field": "email",
      "message": "Email invalido"
    }
  ],
  "timestamp": "2024-01-12T10:30:00.000Z"
}
```

## Consideracoes de Performance

### Database
- Connection pooling com pg-pool
- Indices em campos frequentemente consultados
- Soft delete para manter integridade referencial

### Cache
- Redis para dados frequentemente acessados
- TTL de 5 minutos
- Invalidacao proativa em writes

### Messaging
- Exchanges duraveis
- Queues persistentes
- Dead letter queues para mensagens com falha

## Escalabilidade

O sistema foi projetado para escalar horizontalmente:

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Service │          │ Service │          │ Service │
   │  Inst 1 │          │  Inst 2 │          │  Inst N │
   └─────────┘          └─────────┘          └─────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared State   │
                    │  (Redis, RDS)   │
                    └─────────────────┘
```

- Stateless services permitem multiplas instancias
- Redis compartilhado para cache e sessoes
- RabbitMQ distribui carga entre consumers
- RDS com read replicas para leitura
