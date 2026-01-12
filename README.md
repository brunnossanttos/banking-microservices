# Banking Microservices Platform

Sistema bancario modular construido com arquitetura de microsservicos, projetado para escalabilidade, resiliencia e manutencao independente dos componentes.

## Visao Geral

Este projeto implementa uma plataforma bancaria digital composta por dois microsservicos principais que se comunicam de forma assincrona via message broker, seguindo os principios de arquitetura orientada a eventos.

### Arquitetura

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                      API Gateway / Load Balancer             │
                                    └───────────────────────────────┬─────────────────────────────┘
                                                                    │
                                    ┌───────────────────────────────┴─────────────────────────────┐
                                    │                                                              │
                            ┌───────▼───────┐                                          ┌──────────▼──────────┐
                            │               │         HTTP (sync)                      │                     │
                            │    Clients    │◄─────────────────────────────────────────│    Transactions     │
                            │    Service    │                                          │       Service       │
                            │    :3001      │                                          │        :3002        │
                            │               │                                          │                     │
                            └───────┬───────┘                                          └──────────┬──────────┘
                                    │                                                              │
                    ┌───────────────┼───────────────┐                              ┌───────────────┴───────────────┐
                    │               │               │                              │                               │
            ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐              ┌─────────▼─────────┐                     │
            │  PostgreSQL   │ │   Redis   │ │  RabbitMQ   │◄─────────────│     RabbitMQ      │                     │
            │  clients_db   │ │   Cache   │ │  (publish)  │              │    (publish)      │                     │
            └───────────────┘ └───────────┘ └──────┬──────┘              └───────────────────┘                     │
                                                   │                                                               │
                                                   │              Events                                           │
                                                   │    ┌─────────────────────────┐                               │
                                                   └───►│  - user.created         │                               │
                                                        │  - user.updated         │                               │
                                                        │  - transaction.created  │◄──────────────────────────────┘
                                                        │  - transaction.completed│
                                                        │  - notification.send    │
                                                        └─────────────────────────┘
```

## Tecnologias

| Categoria | Tecnologia | Versao |
|-----------|------------|--------|
| Runtime | Node.js | 20.x |
| Linguagem | TypeScript | 5.3 |
| Framework | Express.js | 4.18 |
| Banco de Dados | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Message Broker | RabbitMQ | 3.12 |
| Autenticacao | JWT | - |
| Validacao | Zod | 3.22 |
| Testes | Jest | 29.7 |
| Containerizacao | Docker | - |
| IaC | Terraform | 1.0+ |

## Estrutura do Projeto

```
banking-microservices/
├── packages/
│   ├── clients-service/      # Microsservico de clientes
│   │   ├── src/
│   │   │   ├── config/       # Configuracoes (DB, Redis, RabbitMQ)
│   │   │   ├── controllers/  # Handlers HTTP
│   │   │   ├── services/     # Logica de negocio
│   │   │   ├── repositories/ # Acesso a dados
│   │   │   ├── routes/       # Definicao de rotas
│   │   │   ├── schemas/      # Validacao Zod
│   │   │   ├── middlewares/  # Auth, error handling
│   │   │   ├── types/        # TypeScript types
│   │   │   └── utils/        # Utilitarios
│   │   └── tests/            # Testes de integracao
│   │
│   ├── transactions-service/ # Microsservico de transacoes
│   │   └── src/              # (mesma estrutura)
│   │
│   └── shared/               # Codigo compartilhado
│       └── src/
│           ├── errors/       # AppError, error codes
│           ├── types/        # Tipos compartilhados
│           ├── middlewares/  # Middlewares reutilizaveis
│           └── utils/        # Logger, helpers
│
├── docker/
│   ├── docker-compose.yml    # Ambiente de desenvolvimento
│   └── init-scripts/         # Scripts SQL de inicializacao
│
├── infrastructure/
│   └── terraform/            # IaC para AWS
│
├── docs/
│   ├── AWS_DEPLOYMENT.md     # Guia de deploy AWS
│   ├── API.md                # Documentacao da API
│   ├── ARCHITECTURE.md       # Detalhes de arquitetura
│   └── AI_USAGE.md           # Uso de ferramentas de IA
│
└── scripts/                  # Scripts de automacao
```

## Quick Start

### Pre-requisitos

- Node.js 20+
- Docker e Docker Compose
- Git

### 1. Clonar o repositorio

```bash
git clone https://github.com/seu-usuario/banking-microservices.git
cd banking-microservices
```

### 2. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

### 3. Iniciar infraestrutura (Docker)

```bash
# Subir PostgreSQL, Redis e RabbitMQ
npm run docker:infra

# Aguardar servicos ficarem saudaveis (~30s)
docker ps
```

### 4. Instalar dependencias e executar

```bash
# Instalar dependencias
npm install

# Executar em modo desenvolvimento
npm run dev:all
```

### 5. Verificar saude dos servicos

```bash
# Clients Service
curl http://localhost:3001/health

# Transactions Service
curl http://localhost:3002/health
```

## Documentacao da API

A documentacao completa da API esta disponivel via Swagger UI:

- **Clients Service**: http://localhost:3001/api-docs
- **Transactions Service**: http://localhost:3002/api-docs

### Endpoints Principais

#### Clients Service (`:3001`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/users` | Criar novo usuario |
| GET | `/api/users/:userId` | Obter dados do usuario |
| PATCH | `/api/users/:userId` | Atualizar usuario |
| PATCH | `/api/users/:userId/profile-picture` | Atualizar foto de perfil |
| POST | `/api/users/:userId/deposit` | Realizar deposito |
| POST | `/api/users/:userId/withdraw` | Realizar saque |
| POST | `/api/auth/login` | Autenticar usuario |
| POST | `/api/auth/refresh` | Renovar token |
| POST | `/api/auth/logout` | Encerrar sessao |
| GET | `/api/auth/me` | Dados do usuario autenticado |

#### Transactions Service (`:3002`)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/transactions` | Criar transferencia |
| GET | `/api/transactions/:transactionId` | Obter transacao |
| GET | `/api/transactions/user/:userId` | Listar transacoes do usuario |

## Testes

```bash
# Executar todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Apenas testes unitarios
npm run test:unit

# Apenas testes de integracao
npm run test:integration
```

### Cobertura de Testes

O projeto possui testes unitarios e de integracao cobrindo:

- Controllers (unit)
- Services (unit)
- Repositories (unit)
- Fluxos completos de API (integration)
- Autenticacao e autorizacao (integration)

## Arquitetura e Decisoes Tecnicas

### Comunicacao entre Servicos

- **Sincrona (HTTP)**: Transactions Service consulta Clients Service para validar usuarios e atualizar saldos
- **Assincrona (RabbitMQ)**: Eventos de dominio publicados para processamento desacoplado

### Estrategia de Cache

Redis utilizado para cache de dados de usuario com TTL de 5 minutos. Invalidacao automatica em operacoes de escrita.

### Seguranca

- Senhas hasheadas com bcrypt (salt rounds: 12)
- JWT para autenticacao stateless
- Refresh tokens armazenados em banco com revogacao
- Validacao de entrada com Zod
- Principio do menor privilegio nos Security Groups

### Tratamento de Erros

Classe `AppError` centralizada com codigos HTTP apropriados e logging estruturado via Winston.

## Deploy

### Desenvolvimento Local

```bash
npm run dev:local  # Sobe tudo (Docker + servicos Node)
```

### Producao (AWS)

Consulte [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) para o guia completo de deploy na AWS incluindo:

- Arquitetura de infraestrutura
- Configuracao de Security Groups
- Terraform para IaC
- Scripts de deploy

## Scripts Disponiveis

| Script | Descricao |
|--------|-----------|
| `npm run dev:all` | Inicia ambos servicos em desenvolvimento |
| `npm run build:all` | Compila TypeScript |
| `npm run test` | Executa todos os testes |
| `npm run lint` | Verifica codigo com ESLint |
| `npm run format` | Formata codigo com Prettier |
| `npm run docker:up` | Sobe todos os containers |
| `npm run docker:down` | Para todos os containers |
| `npm run docker:infra` | Sobe apenas infraestrutura |

## Contribuicao

1. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
2. Commit suas mudancas (`git commit -m 'feat: adiciona nova feature'`)
3. Push para a branch (`git push origin feature/nova-feature`)
4. Abra um Pull Request

## Licenca

Este projeto foi desenvolvido como parte de um desafio tecnico.

---

**Documentacao adicional:**
- [Documentacao da API](docs/API.md)
- [Arquitetura Detalhada](docs/ARCHITECTURE.md)
- [Deploy AWS](docs/AWS_DEPLOYMENT.md)
- [Uso de Ferramentas de IA](docs/AI_USAGE.md)
