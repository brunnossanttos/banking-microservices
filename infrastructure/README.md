# Infrastructure as Code - Banking Microservices

Este diretorio contem a definicao de toda a infraestrutura AWS usando **Terraform**.

## Estrutura

```
infrastructure/
├── README.md                    # Este arquivo
└── terraform/
    ├── main.tf                  # Recursos principais
    ├── variables.tf             # Definicao de variaveis
    ├── outputs.tf               # Outputs da infraestrutura
    ├── terraform.tfvars.example # Exemplo de variaveis
    └── templates/
        └── user-data.sh         # Script de inicializacao EC2
```

## Pre-requisitos

1. **Terraform** >= 1.0
   ```bash
   # Linux/MacOS
   brew install terraform

   # Ou download direto
   # https://www.terraform.io/downloads
   ```

2. **AWS CLI** configurado
   ```bash
   aws configure
   ```

3. **Chave SSH** para acesso EC2
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/banking-key
   ```

## Como Usar

### 1. Configurar Variaveis

```bash
cd infrastructure/terraform

# Copiar exemplo
cp terraform.tfvars.example terraform.tfvars

# Editar com seus valores
nano terraform.tfvars
```

### 2. Inicializar Terraform

```bash
terraform init
```

### 3. Verificar Plano

```bash
terraform plan
```

### 4. Aplicar Infraestrutura

```bash
terraform apply
```

### 5. Obter Outputs

```bash
# Ver todos os outputs
terraform output

# Output especifico
terraform output alb_dns_name
terraform output application_config
```

## Recursos Criados

| Recurso | Descricao |
|---------|-----------|
| VPC | Rede virtual isolada |
| Subnets | 2 publicas + 2 privadas |
| Internet Gateway | Acesso internet para subnets publicas |
| NAT Gateway | Acesso internet para subnets privadas |
| Security Groups | Firewall para ALB, App e Database |
| EC2 | Servidor de aplicacao |
| RDS PostgreSQL | 2 instancias (clients + transactions) |
| ElastiCache Redis | Cache |
| ALB | Load Balancer |
| CloudWatch Logs | Centralizacao de logs |
| Secrets Manager | Armazenamento seguro de credenciais |
| IAM Role | Permissoes para EC2 |

## Security Groups

```
Internet --> ALB (443/80) --> App (3001/3002) --> Data (5432/5671/6379)
                                    ^
                                    |
                              SSH (22) [Admin IP only]
```

## Custos Estimados

| Servico | Especificacao | Custo/mes |
|---------|---------------|-----------|
| EC2 | t3.medium | ~$30 |
| RDS | db.t3.micro x2 | ~$50 |
| ALB | Application LB | ~$20 |
| NAT Gateway | - | ~$35 |
| ElastiCache | cache.t3.micro | ~$15 |
| CloudWatch | Logs | ~$10 |
| **Total** | | **~$160** |

## Comandos Uteis

```bash
# Ver estado atual
terraform show

# Destruir infraestrutura (CUIDADO!)
terraform destroy

# Refresh do estado
terraform refresh

# Importar recurso existente
terraform import aws_instance.app i-1234567890abcdef0

# Formatar arquivos
terraform fmt

# Validar configuracao
terraform validate
```

## Seguranca

- **NUNCA** commite `terraform.tfvars` com dados sensiveis
- Use **Secrets Manager** para credenciais
- Mantenha Security Groups com **minimo privilegio**
- Habilite **encryption at rest** para RDS e EBS
- Use **Multi-AZ** para RDS em producao

## Proximos Passos

1. [ ] Configurar backend remoto S3 para state
2. [ ] Implementar Auto Scaling Group
3. [ ] Adicionar WAF rules
4. [ ] Configurar Route 53 para dominio customizado
5. [ ] Implementar CI/CD com GitHub Actions
