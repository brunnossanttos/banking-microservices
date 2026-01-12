# API Documentation

Documentacao completa da API REST da plataforma Banking Microservices.

## Indice

- [Visao Geral](#visao-geral)
- [Autenticacao](#autenticacao)
- [Endpoints](#endpoints)
  - [Clients Service](#clients-service)
  - [Transactions Service](#transactions-service)
- [Codigos de Erro](#codigos-de-erro)
- [Exemplos](#exemplos)

---

## Visao Geral

### Base URLs

| Ambiente | Clients Service | Transactions Service |
|----------|-----------------|----------------------|
| Desenvolvimento | `http://localhost:3001` | `http://localhost:3002` |
| Producao | `https://api.banking.com` | `https://api.banking.com` |

### Swagger UI

Documentacao interativa disponivel em:

- **Clients Service**: `http://localhost:3001/api-docs`
- **Transactions Service**: `http://localhost:3002/api-docs`

### Formato de Resposta

Todas as respostas seguem o padrao:

```json
{
  "success": true,
  "data": { ... }
}
```

Em caso de erro:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

### Headers Obrigatorios

| Header | Valor | Obrigatorio |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `Authorization` | `Bearer <token>` | Para rotas protegidas |

---

## Autenticacao

A API utiliza JWT (JSON Web Tokens) para autenticacao.

### Obtendo Tokens

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senhaSegura123"
}
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "usuario@email.com",
      "name": "Joao Silva"
    }
  }
}
```

### Usando o Token

Inclua o access token no header `Authorization`:

```http
GET /api/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Renovando o Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

### Expiracao

| Token | Duracao |
|-------|---------|
| Access Token | 15 minutos |
| Refresh Token | 7 dias |

---

## Endpoints

### Clients Service

Base URL: `http://localhost:3001`

#### Autenticacao

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/login` | Autenticar usuario | Nao |
| POST | `/api/auth/refresh` | Renovar access token | Nao |
| POST | `/api/auth/logout` | Encerrar sessao | Nao |
| POST | `/api/auth/logout-all` | Encerrar todas sessoes | Sim |
| GET | `/api/auth/me` | Dados do usuario autenticado | Sim |

#### Usuarios

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/api/users` | Criar usuario | Nao |
| GET | `/api/users/:userId` | Obter usuario | Sim |
| PATCH | `/api/users/:userId` | Atualizar usuario | Sim |
| PATCH | `/api/users/:userId/profile-picture` | Atualizar foto | Sim |
| POST | `/api/users/:userId/deposit` | Depositar | Sim |
| POST | `/api/users/:userId/withdraw` | Sacar | Sim |

#### Health

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| GET | `/health` | Status do servico | Nao |

---

### Detalhes dos Endpoints - Clients Service

#### POST /api/users

Cria um novo usuario.

**Request Body:**

```json
{
  "email": "usuario@email.com",
  "password": "senhaSegura123",
  "name": "Joao Silva",
  "cpf": "123.456.789-01",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 456",
    "neighborhood": "Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "bankingDetails": {
    "agency": "0001",
    "account": "12345-6",
    "accountType": "checking"
  }
}
```

**Validacoes:**

| Campo | Regras |
|-------|--------|
| email | Formato valido de email |
| password | Minimo 8 caracteres |
| name | 2-255 caracteres |
| cpf | Formato XXX.XXX.XXX-XX ou XXXXXXXXXXX |
| address.state | Exatamente 2 caracteres |
| address.zipCode | Formato XXXXX-XXX |
| bankingDetails.accountType | `checking` ou `savings` |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@email.com",
    "name": "Joao Silva",
    "cpf": "12345678901",
    "balance": 0,
    "profilePictureUrl": null,
    "address": { ... },
    "bankingDetails": { ... },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### GET /api/users/:userId

Obtem dados de um usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@email.com",
    "name": "Joao Silva",
    "cpf": "12345678901",
    "balance": 1500.50,
    "profilePictureUrl": "https://example.com/photo.jpg",
    "address": { ... },
    "bankingDetails": { ... },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### PATCH /api/users/:userId

Atualiza dados do usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (todos os campos opcionais):**

```json
{
  "name": "Joao Silva Junior",
  "email": "novoemail@email.com",
  "address": {
    "city": "Rio de Janeiro",
    "state": "RJ"
  }
}
```

---

#### POST /api/users/:userId/deposit

Realiza deposito na conta.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "amount": 500.00
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "balance": 2000.50
    },
    "transaction": {
      "id": "...",
      "type": "deposit",
      "amount": 500.00,
      "status": "completed"
    }
  }
}
```

---

#### POST /api/users/:userId/withdraw

Realiza saque da conta.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "amount": 100.00
}
```

**Erros Possiveis:**

- `400 INSUFFICIENT_BALANCE`: Saldo insuficiente

---

### Transactions Service

Base URL: `http://localhost:3002`

#### Transacoes

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| POST | `/api/transactions` | Criar transferencia | Sim |
| GET | `/api/transactions/:transactionId` | Obter transacao | Sim |
| GET | `/api/transactions/user/:userId` | Listar transacoes | Sim |

#### Health

| Metodo | Endpoint | Descricao | Auth |
|--------|----------|-----------|------|
| GET | `/health` | Status do servico | Nao |

---

### Detalhes dos Endpoints - Transactions Service

#### POST /api/transactions

Cria uma transferencia entre usuarios.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "senderUserId": "550e8400-e29b-41d4-a716-446655440001",
  "receiverUserId": "550e8400-e29b-41d4-a716-446655440002",
  "amount": 150.50,
  "description": "Pagamento de aluguel"
}
```

**Validacoes:**

| Campo | Regras |
|-------|--------|
| senderUserId | UUID valido, deve ser o usuario autenticado |
| receiverUserId | UUID valido, deve ser diferente do sender |
| amount | Entre 0.01 e 1.000.000,00 |
| description | Maximo 255 caracteres (opcional) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "senderUserId": "550e8400-e29b-41d4-a716-446655440001",
    "receiverUserId": "550e8400-e29b-41d4-a716-446655440002",
    "amount": 150.50,
    "type": "transfer",
    "status": "completed",
    "description": "Pagamento de aluguel",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:30:05Z"
  }
}
```

**Erros Possiveis:**

| Codigo | HTTP | Descricao |
|--------|------|-----------|
| INSUFFICIENT_BALANCE | 400 | Saldo insuficiente |
| INVALID_TRANSFER | 400 | Transferencia para si mesmo |
| USER_NOT_FOUND | 404 | Usuario nao encontrado |

---

#### GET /api/transactions/user/:userId

Lista transacoes de um usuario com paginacao e filtros.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parametro | Tipo | Default | Descricao |
|-----------|------|---------|-----------|
| page | number | 1 | Pagina atual |
| limit | number | 20 | Itens por pagina (max 100) |
| status | string | - | Filtrar por status |
| type | string | - | Filtrar por tipo |
| startDate | ISO8601 | - | Data inicial |
| endDate | ISO8601 | - | Data final |

**Valores de Status:**
- `pending`
- `processing`
- `completed`
- `failed`
- `reversed`

**Valores de Type:**
- `transfer`
- `deposit`
- `withdrawal`

**Exemplo:**

```http
GET /api/transactions/user/550e8400-e29b-41d4-a716-446655440001?page=1&limit=10&status=completed&type=transfer
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "...",
        "senderUserId": "...",
        "receiverUserId": "...",
        "amount": 150.50,
        "type": "transfer",
        "status": "completed",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

## Codigos de Erro

### Codigos HTTP

| Codigo | Descricao |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisicao invalida |
| 401 | Nao autenticado |
| 403 | Acesso negado |
| 404 | Nao encontrado |
| 409 | Conflito (recurso ja existe) |
| 422 | Erro de validacao |
| 500 | Erro interno |

### Codigos de Erro da Aplicacao

| Codigo | HTTP | Descricao |
|--------|------|-----------|
| VALIDATION_ERROR | 422 | Dados de entrada invalidos |
| UNAUTHORIZED | 401 | Token invalido ou expirado |
| FORBIDDEN | 403 | Sem permissao para o recurso |
| NOT_FOUND | 404 | Recurso nao encontrado |
| USER_NOT_FOUND | 404 | Usuario nao encontrado |
| EMAIL_IN_USE | 409 | Email ja cadastrado |
| CPF_IN_USE | 409 | CPF ja cadastrado |
| INSUFFICIENT_BALANCE | 400 | Saldo insuficiente |
| INVALID_TRANSFER | 400 | Transferencia invalida |
| INVALID_CREDENTIALS | 401 | Credenciais invalidas |
| TOKEN_EXPIRED | 401 | Token expirado |
| INTERNAL_ERROR | 500 | Erro interno do servidor |

---

## Exemplos

### Fluxo Completo de Registro e Transacao

#### 1. Criar Usuario

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "password": "senha12345",
    "name": "Joao Silva",
    "cpf": "123.456.789-01",
    "bankingDetails": {
      "agency": "0001",
      "account": "12345-6",
      "accountType": "checking"
    }
  }'
```

#### 2. Fazer Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "password": "senha12345"
  }'
```

#### 3. Realizar Deposito

```bash
curl -X POST http://localhost:3001/api/users/USER_ID/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "amount": 1000.00
  }'
```

#### 4. Criar Transferencia

```bash
curl -X POST http://localhost:3002/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "senderUserId": "USER_ID",
    "receiverUserId": "OTHER_USER_ID",
    "amount": 150.50,
    "description": "Pagamento"
  }'
```

#### 5. Consultar Historico

```bash
curl -X GET "http://localhost:3002/api/transactions/user/USER_ID?page=1&limit=10" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Rate Limiting

| Ambiente | Limite |
|----------|--------|
| Desenvolvimento | Sem limite |
| Producao | 100 req/min por IP |
| Auth endpoints | 10 req/min por IP |

---

## Versionamento

A API atual e a versao 1.0. Futuras versoes serao indicadas na URL base (ex: `/api/v2/`).

---

## Suporte

Para duvidas ou problemas:

- **Email**: api@banking.com
- **Documentacao Swagger**: `/api-docs`
