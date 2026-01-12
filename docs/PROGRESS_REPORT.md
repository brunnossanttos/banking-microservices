# Relatorio de Progresso

Documento descrevendo a organizacao, priorizacao e execucao do desafio tecnico de microsservicos bancarios.

---

## Plataforma de Gestao

**Notion Board**: [Desafio Tecnico Loomi](https://www.notion.so/Desafio-T-cnico-Loomi-2e2f187ddb90807f9dc4c8c9ea59d3c4?source=copy_link)

---

## Organizacao das Demandas

### Metodologia Utilizada

Adotei uma abordagem baseada em **Kanban** com colunas:
- **Backlog**: Requisitos identificados do desafio
- **Em Progresso**: Task atual em desenvolvimento
- **Em Revisao**: Aguardando PR review/merge
- **Concluido**: Tasks finalizadas e mergeadas

### Estrutura de Trabalho

O projeto foi dividido em **epicos** que representam os grandes blocos do desafio:

```
1. Infraestrutura Base
   ├── Setup monorepo (npm workspaces)
   ├── Configuracao Docker Compose
   ├── Shared package (tipos, utils, errors)
   └── Configuracao ESLint/Prettier

2. Microsservico de Clientes
   ├── CRUD de usuarios
   ├── Sistema de autenticacao
   ├── Cache Redis
   └── Testes unitarios/integracao

3. Microsservico de Transacoes
   ├── Endpoints de transferencia
   ├── Comunicacao com Clients Service
   ├── Integracao RabbitMQ
   └── Testes

4. Comunicacao Assincrona
   ├── Setup RabbitMQ
   ├── Publishers (eventos)
   ├── Consumers
   └── Interface de notificacoes

5. Documentacao e Deploy
   ├── README e docs
   ├── Swagger/OpenAPI
   ├── Terraform AWS
   └── Scripts de deploy
```

### Git Flow Adotado

- **Branch principal**: `development`
- **Feature branches**: `feat/<nome-da-feature>`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Pull Requests**: Uma PR por feature, mergeada apos conclusao

---

## Priorizacao das Entregas

### Criterios de Priorizacao

1. **Dependencias tecnicas**: O que precisa existir para outras features funcionarem
2. **Requisitos obrigatorios**: Endpoints minimos exigidos no desafio
3. **Requisitos de avaliacao**: Itens listados em "Pontos Avaliados"
4. **Diferenciais**: Features extras que agregam valor

### Ordem de Execucao

| Fase | Entrega | Justificativa |
|------|---------|---------------|
| 1 | Setup inicial + Docker | Base necessaria para todo desenvolvimento |
| 2 | Shared package | Tipos e utils reutilizaveis entre servicos |
| 3 | Clients Service - CRUD | Endpoint obrigatorio + base para auth |
| 4 | Testes Clients Service | Garantir qualidade antes de prosseguir |
| 5 | Autenticacao JWT | Requisito de seguranca |
| 6 | Cache Redis | Requisito explicito do desafio |
| 7 | Transactions Service | Segundo microsservico obrigatorio |
| 8 | RabbitMQ | Comunicacao assincrona obrigatoria |
| 9 | Terraform/AWS Docs | Requisito de deploy |
| 10 | Swagger + Docs finais | Documentacao obrigatoria |

### Historico de PRs (Ordem Cronologica)

| PR | Feature | Commits |
|----|---------|---------|
| #1 | feat/create-users | Criacao de usuarios com validacao |
| #2 | feat/create-users-tests | Testes unitarios e integracao |
| #3 | feat/get-user | Endpoint GET user com testes |
| #4 | feat/update-user | PATCH user + profile picture |
| #5 | feat/transactions-service | Microsservico de transacoes completo |
| #6 | feat/rabbitmq | RabbitMQ + Redis cache |
| #7 | feat/auth | Sistema de autenticacao JWT |
| #8 | feat/infra-terraform | Infraestrutura AWS com Terraform |
| #9 | feat/docs | Swagger, README, documentacao |

---

## Dificuldades Enfrentadas

### 1. Comunicacao entre Microsservicos

**Problema**: Definir a melhor estrategia para comunicacao sincrona vs assincrona entre os servicos.

**Solucao**: Adotei uma abordagem hibrida:
- **Sincrona (HTTP)**: Transactions Service consulta Clients Service para validar usuarios e atualizar saldos em tempo real
- **Assincrona (RabbitMQ)**: Eventos publicados apos operacoes para notificacoes e auditoria

**Aprendizado**: A separacao clara de responsabilidades evita acoplamento excessivo.

---

### 2. Gerenciamento de Transacoes Distribuidas

**Problema**: Garantir consistencia quando uma transferencia envolve debito em um usuario e credito em outro, podendo falhar no meio.

**Solucao**: Implementei o padrao de transacao em duas fases:
1. Valida saldo do remetente
2. Debita remetente
3. Credita destinatario
4. Em caso de falha, reverte operacoes

**Trade-off**: Para um sistema real, consideraria implementar o padrao Saga com compensacao.

---

### 3. Cache Invalidation

**Problema**: Manter o cache Redis sincronizado com alteracoes no banco de dados.

**Solucao**: Estrategia de invalidacao proativa:
- Cache-aside pattern para leituras
- Invalidacao explicita em todas operacoes de escrita (create, update, delete)
- TTL de 5 minutos como fallback

---

### 4. Estrutura de Testes

**Problema**: Configurar testes de integracao que dependem de banco de dados sem afetar dados de desenvolvimento.

**Solucao**:
- Banco de dados separado para testes
- Setup/teardown que limpa dados entre testes
- Mocks para servicos externos (RabbitMQ)

---

### 5. Demonstrar Conhecimento AWS sem Acesso

**Problema**: O desafio exige conhecimento de deploy AWS (EC2, Security Groups), mas nao tenho acesso a AWS para este projeto.

**Solucao**: Criei documentacao completa demonstrando conhecimento:
- Terraform IaC completo e funcional
- Documentacao detalhada de arquitetura AWS
- Scripts de deploy prontos para uso
- Diagramas de Security Groups

---

## CI/CD Pipeline

### Implementacao

O projeto possui pipelines de CI/CD configuradas com GitHub Actions:

#### CI Pipeline (`.github/workflows/ci.yml`)

Executada em: **Pull Requests** e **pushes para development**

| Job | Descricao |
|-----|-----------|
| **Lint** | ESLint + Prettier check |
| **Build** | Compilacao TypeScript de todos os pacotes |
| **Unit Tests** | Testes unitarios dos servicos |
| **Integration Tests** | Testes com banco PostgreSQL e Redis |
| **Docker Build** | Validacao dos Dockerfiles |
| **Security** | npm audit para vulnerabilidades |

#### CD Pipeline (`.github/workflows/cd.yml`)

Executada em: **pushes para main** (producao)

| Job | Descricao |
|-----|-----------|
| **Quality Gate** | Executa todos os testes como gate |
| **Build Docker** | Constroi imagens com tags versionadas |
| **Terraform Validate** | Valida configuracao de infraestrutura |
| **Deploy Simulation** | Simula passos de deploy (sem AWS real) |
| **Create Release** | Cria release no GitHub com changelog |

### Nota sobre Deploy

Como nao temos acesso a AWS para este desafio, a pipeline de producao:
- Constroi e valida imagens Docker
- Valida configuracao Terraform
- Simula os passos que seriam executados em producao
- Cria releases no GitHub para versionamento

Em um ambiente real, os passos adicionais seriam:
1. Push das imagens para ECR
2. Atualizacao dos servicos EC2/ECS
3. Health checks automaticos
4. Rollback automatico em caso de falha

---

## O Que Faria Diferente

### Com Mais Tempo

1. **Implementar API Gateway**
   - Centralizacao de autenticacao
   - Rate limiting global
   - Request logging unificado

2. **Testes E2E**
   - Fluxo completo de transferencia
   - Testes de carga com k6 ou Artillery

3. **Observabilidade**
   - Distributed tracing com OpenTelemetry
   - Metricas com Prometheus
   - Dashboards Grafana

4. **Circuit Breaker**
   - Implementar padrao circuit breaker para chamadas HTTP entre servicos
   - Fallback gracioso quando servico indisponivel

5. **Database Migrations**
   - Substituir init-scripts por ferramenta de migrations (Prisma, Flyway)
   - Versionamento de schema

### Em Contexto Real de Projeto

1. **CI/CD Pipeline**
   - GitHub Actions para build, test, deploy
   - Ambientes de staging e producao separados
   - Deploy automatizado com rollback

2. **Seguranca Adicional**
   - Rate limiting por endpoint
   - Input sanitization (XSS)
   - Audit logging

3. **Event Sourcing**
   - Para transacoes financeiras, consideraria event sourcing
   - Historico completo e auditavel de todas operacoes

4. **Multi-tenancy**
   - Preparar arquitetura para multiplos clientes/bancos

5. **Documentacao de ADRs**
   - Architecture Decision Records para decisoes importantes

---

## Metricas do Projeto

### Codigo

| Metrica | Valor |
|---------|-------|
| Arquivos TypeScript | 91 |
| Testes | 61 (100% passando) |
| Cobertura estimada | ~75% |
| PRs mergeadas | 9 |
| Commits totais | 24 |

### Dependencias Principais

| Categoria | Tecnologia |
|-----------|------------|
| Runtime | Node.js 20 |
| Linguagem | TypeScript 5.3 |
| Framework | Express.js 4.18 |
| Banco de Dados | PostgreSQL 15 |
| Cache | Redis 7 |
| Mensageria | RabbitMQ 3.12 |
| Validacao | Zod 3.22 |
| Testes | Jest 29.7 |
| Documentacao | Swagger/OpenAPI 3.0 |

---

## Conclusao

O projeto foi desenvolvido seguindo uma abordagem estruturada, priorizando os requisitos obrigatorios e garantindo qualidade atraves de testes. A arquitetura foi desenhada pensando em escalabilidade e manutencibilidade, aplicando principios SOLID e boas praticas de desenvolvimento.

As principais entregas foram:
- Dois microsservicos funcionais e testados
- Comunicacao assincrona via RabbitMQ
- Cache com Redis
- Sistema de autenticacao JWT completo
- Documentacao abrangente (API, Arquitetura, Deploy)
- Infraestrutura como codigo (Terraform)

O codigo esta pronto para ser executado localmente com Docker Compose e a documentacao de deploy permite reproducao em ambiente AWS.

---

*Relatorio gerado em 12/01/2026*
