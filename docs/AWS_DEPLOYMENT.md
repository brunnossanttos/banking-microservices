# AWS Deployment Guide - Banking Microservices

Este documento descreve o processo completo de deploy da aplicacao Banking Microservices na AWS, utilizando EC2, Security Groups, RDS e outros servicos gerenciados.

## Sumario

1. [Arquitetura na AWS](#arquitetura-na-aws)
2. [Pre-requisitos](#pre-requisitos)
3. [Security Groups](#security-groups)
4. [Criacao da Infraestrutura](#criacao-da-infraestrutura)
5. [Deploy via SSH](#deploy-via-ssh)
6. [Configuracao de Producao](#configuracao-de-producao)
7. [Monitoramento e Logs](#monitoramento-e-logs)
8. [Consideracoes de Seguranca](#consideracoes-de-seguranca)

---

## Arquitetura na AWS

```
                                    ┌─────────────────────────────────────────────────────────────────────────┐
                                    │                              AWS Cloud (us-east-1)                       │
                                    │                                                                          │
                                    │    ┌──────────────────────────────────────────────────────────────────┐  │
                                    │    │                         VPC (10.0.0.0/16)                         │  │
                                    │    │                                                                    │  │
    ┌──────────┐                   │    │   ┌────────────────────────────────────────────────────────────┐  │  │
    │          │                   │    │   │                    Public Subnets                          │  │  │
    │  Users   │                   │    │   │                                                            │  │  │
    │          │                   │    │   │   ┌─────────────────┐     ┌─────────────────┐             │  │  │
    └────┬─────┘                   │    │   │   │  NAT Gateway    │     │  NAT Gateway    │             │  │  │
         │                         │    │   │   │  (AZ-a)         │     │  (AZ-b)         │             │  │  │
         │ HTTPS (443)             │    │   │   └────────┬────────┘     └────────┬────────┘             │  │  │
         ▼                         │    │   │            │                       │                      │  │  │
    ┌─────────────┐               │    │   └────────────┼───────────────────────┼──────────────────────┘  │  │
    │   Route 53  │               │    │                │                       │                         │  │
    │   (DNS)     │               │    │   ┌────────────┼───────────────────────┼──────────────────────┐  │  │
    └──────┬──────┘               │    │   │            │   Private Subnets     │                      │  │  │
           │                       │    │   │            │                       │                      │  │  │
           ▼                       │    │   │   ┌────────▼────────┐     ┌────────▼────────┐             │  │  │
    ┌─────────────────────────┐   │    │   │   │                 │     │                 │             │  │  │
    │   Application Load      │   │    │   │   │   EC2 Instance  │     │   EC2 Instance  │             │  │  │
    │   Balancer (ALB)        │───┼────┼───┼──▶│   (AZ-a)        │     │   (AZ-b)        │             │  │  │
    │   - SSL/TLS Termination │   │    │   │   │                 │     │   (Standby)     │             │  │  │
    │   - Health Checks       │   │    │   │   │ ┌─────────────┐ │     │                 │             │  │  │
    └─────────────────────────┘   │    │   │   │ │ Docker      │ │     └─────────────────┘             │  │  │
                                    │    │   │   │ │ Containers │ │                                      │  │  │
                                    │    │   │   │ │            │ │                                      │  │  │
                                    │    │   │   │ │ - Clients  │ │                                      │  │  │
                                    │    │   │   │ │   :3001    │ │                                      │  │  │
                                    │    │   │   │ │ - Trans    │ │                                      │  │  │
                                    │    │   │   │ │   :3002    │ │                                      │  │  │
                                    │    │   │   │ └──────┬─────┘ │                                      │  │  │
                                    │    │   │   └────────┼───────┘                                      │  │  │
                                    │    │   │            │                                               │  │  │
                                    │    │   │   ┌────────▼───────────────────────────────────────────┐  │  │  │
                                    │    │   │   │              Data Layer (Private)                  │  │  │  │
                                    │    │   │   │                                                     │  │  │  │
                                    │    │   │   │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │  │  │
                                    │    │   │   │  │     RDS      │  │  Amazon MQ   │  │ElastiCache│ │  │  │  │
                                    │    │   │   │  │  PostgreSQL  │  │  (RabbitMQ)  │  │  (Redis)  │ │  │  │  │
                                    │    │   │   │  │   :5432      │  │    :5671     │  │   :6379   │ │  │  │  │
                                    │    │   │   │  │  (Multi-AZ)  │  │              │  │           │ │  │  │  │
                                    │    │   │   │  └──────────────┘  └──────────────┘  └───────────┘ │  │  │  │
                                    │    │   │   └─────────────────────────────────────────────────────┘  │  │  │
                                    │    │   │                                                            │  │  │
                                    │    │   └────────────────────────────────────────────────────────────┘  │  │
                                    │    │                                                                    │  │
                                    │    └────────────────────────────────────────────────────────────────────┘  │
                                    │                                                                          │
                                    │    ┌──────────────────────────────────────────────────────────────────┐  │
                                    │    │                     Monitoring & Security                         │  │
                                    │    │                                                                    │  │
                                    │    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
                                    │    │  │ CloudWatch │  │   Secrets  │  │    WAF     │  │    ACM     │  │  │
                                    │    │  │   Logs     │  │   Manager  │  │            │  │ (SSL Cert) │  │  │
                                    │    │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
                                    │    │                                                                    │  │
                                    │    └────────────────────────────────────────────────────────────────────┘  │
                                    │                                                                          │
                                    └─────────────────────────────────────────────────────────────────────────┘
```

### Componentes

| Servico AWS | Funcao | Configuracao |
|-------------|--------|--------------|
| **Route 53** | DNS gerenciado | Dominio: `api.banking.example.com` |
| **ACM** | Certificado SSL/TLS | Certificado wildcard `*.banking.example.com` |
| **ALB** | Load Balancer | Distribui trafego entre instancias |
| **WAF** | Web Application Firewall | Protecao contra ataques comuns |
| **EC2** | Servidores de aplicacao | t3.medium, Amazon Linux 2023 |
| **RDS** | Banco de dados PostgreSQL | db.t3.medium, Multi-AZ |
| **Amazon MQ** | Message Broker | RabbitMQ gerenciado |
| **ElastiCache** | Cache Redis | cache.t3.micro |
| **Secrets Manager** | Gerenciamento de secrets | Credenciais e JWT secret |
| **CloudWatch** | Logs e metricas | Monitoramento centralizado |

---

## Pre-requisitos

### Ferramentas Necessarias

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verificar instalacao
aws --version

# Configurar credenciais
aws configure
# AWS Access Key ID: ****
# AWS Secret Access Key: ****
# Default region name: us-east-1
# Default output format: json
```

### Permissoes IAM Necessarias

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "rds:*",
        "elasticache:*",
        "mq:*",
        "elasticloadbalancing:*",
        "secretsmanager:*",
        "acm:*",
        "route53:*",
        "logs:*",
        "cloudwatch:*",
        "wafv2:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Security Groups

Os Security Groups sao o firewall virtual da AWS. Seguimos o **principio do menor privilegio**.

### Diagrama de Security Groups

```
                    Internet
                        │
                        ▼
            ┌───────────────────────┐
            │   sg-alb              │
            │   Inbound:            │
            │   - 443 from 0.0.0.0/0│
            │   - 80 from 0.0.0.0/0 │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   sg-app              │
            │   Inbound:            │
            │   - 3001 from sg-alb  │
            │   - 3002 from sg-alb  │
            │   - 22 from MY_IP     │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   sg-data             │
            │   Inbound:            │
            │   - 5432 from sg-app  │
            │   - 5671 from sg-app  │
            │   - 6379 from sg-app  │
            └───────────────────────┘
```

### Detalhamento das Regras

#### sg-alb (Application Load Balancer)

| Tipo | Protocolo | Porta | Origem | Descricao |
|------|-----------|-------|--------|-----------|
| HTTPS | TCP | 443 | 0.0.0.0/0 | Trafego HTTPS publico |
| HTTP | TCP | 80 | 0.0.0.0/0 | Redirect para HTTPS |

**Outbound:** Todo trafego permitido para sg-app

#### sg-app (Servidores de Aplicacao)

| Tipo | Protocolo | Porta | Origem | Descricao |
|------|-----------|-------|--------|-----------|
| Custom TCP | TCP | 3001 | sg-alb | Clients Service do ALB |
| Custom TCP | TCP | 3002 | sg-alb | Transactions Service do ALB |
| SSH | TCP | 22 | SEU_IP/32 | Acesso SSH administrativo |

**Outbound:** Todo trafego permitido

#### sg-data (Camada de Dados)

| Tipo | Protocolo | Porta | Origem | Descricao |
|------|-----------|-------|--------|-----------|
| PostgreSQL | TCP | 5432 | sg-app | Banco de dados |
| Custom TCP | TCP | 5671 | sg-app | RabbitMQ (AMQPS) |
| Custom TCP | TCP | 6379 | sg-app | Redis |

**Outbound:** Nenhum (dados nao iniciam conexoes externas)

### Comandos AWS CLI para Security Groups

```bash
# Criar VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=banking-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC criada: $VPC_ID"

# Habilitar DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames

# Criar Security Group - ALB
SG_ALB=$(aws ec2 create-security-group \
  --group-name sg-banking-alb \
  --description "Security group for ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Regras do ALB
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ALB \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ALB \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Criar Security Group - Application
SG_APP=$(aws ec2 create-security-group \
  --group-name sg-banking-app \
  --description "Security group for application servers" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Regras da Aplicacao
aws ec2 authorize-security-group-ingress \
  --group-id $SG_APP \
  --protocol tcp \
  --port 3001 \
  --source-group $SG_ALB

aws ec2 authorize-security-group-ingress \
  --group-id $SG_APP \
  --protocol tcp \
  --port 3002 \
  --source-group $SG_ALB

# SSH apenas do seu IP
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_APP \
  --protocol tcp \
  --port 22 \
  --cidr ${MY_IP}/32

# Criar Security Group - Data
SG_DATA=$(aws ec2 create-security-group \
  --group-name sg-banking-data \
  --description "Security group for databases and message brokers" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Regras de Dados
aws ec2 authorize-security-group-ingress \
  --group-id $SG_DATA \
  --protocol tcp \
  --port 5432 \
  --source-group $SG_APP

aws ec2 authorize-security-group-ingress \
  --group-id $SG_DATA \
  --protocol tcp \
  --port 5671 \
  --source-group $SG_APP

aws ec2 authorize-security-group-ingress \
  --group-id $SG_DATA \
  --protocol tcp \
  --port 6379 \
  --source-group $SG_APP

echo "Security Groups criados:"
echo "  ALB: $SG_ALB"
echo "  APP: $SG_APP"
echo "  DATA: $SG_DATA"
```

---

## Criacao da Infraestrutura

### 1. Criar Key Pair para SSH

```bash
# Criar key pair
aws ec2 create-key-pair \
  --key-name banking-microservices-key \
  --key-type rsa \
  --key-format pem \
  --query 'KeyMaterial' \
  --output text > banking-microservices-key.pem

# Ajustar permissoes (IMPORTANTE para SSH funcionar)
chmod 400 banking-microservices-key.pem

# Mover para local seguro
mv banking-microservices-key.pem ~/.ssh/
```

### 2. Criar Subnets

```bash
# Subnet Publica AZ-a
SUBNET_PUBLIC_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=banking-public-a}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Subnet Publica AZ-b
SUBNET_PUBLIC_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=banking-public-b}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Subnet Privada AZ-a (Aplicacao)
SUBNET_PRIVATE_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=banking-private-a}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# Subnet Privada AZ-b (Dados)
SUBNET_PRIVATE_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.20.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=banking-private-b}]' \
  --query 'Subnet.SubnetId' \
  --output text)
```

### 3. Criar Internet Gateway e NAT Gateway

```bash
# Internet Gateway
IGW=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=banking-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --internet-gateway-id $IGW \
  --vpc-id $VPC_ID

# Elastic IP para NAT Gateway
EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --query 'AllocationId' \
  --output text)

# NAT Gateway
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $SUBNET_PUBLIC_A \
  --allocation-id $EIP_ALLOC \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=banking-nat}]' \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "Aguardando NAT Gateway ficar disponivel..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW
```

### 4. Criar RDS PostgreSQL

```bash
# Criar Subnet Group para RDS
aws rds create-db-subnet-group \
  --db-subnet-group-name banking-db-subnet-group \
  --db-subnet-group-description "Subnet group for banking databases" \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B

# Criar instancia RDS - Clients DB
aws rds create-db-instance \
  --db-instance-identifier banking-clients-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username dbadmin \
  --master-user-password "$(aws secretsmanager get-random-password --password-length 32 --query 'RandomPassword' --output text)" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name clients_db \
  --vpc-security-group-ids $SG_DATA \
  --db-subnet-group-name banking-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=banking-clients-db

# Criar instancia RDS - Transactions DB
aws rds create-db-instance \
  --db-instance-identifier banking-transactions-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username dbadmin \
  --master-user-password "$(aws secretsmanager get-random-password --password-length 32 --query 'RandomPassword' --output text)" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name transactions_db \
  --vpc-security-group-ids $SG_DATA \
  --db-subnet-group-name banking-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --no-publicly-accessible \
  --storage-encrypted \
  --tags Key=Name,Value=banking-transactions-db
```

### 5. Lancar EC2

```bash
# Buscar AMI mais recente do Amazon Linux 2023
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

# User data script para setup inicial
cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Atualizar sistema
dnf update -y

# Instalar Docker
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Instalar Docker Compose
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar CloudWatch Agent
dnf install -y amazon-cloudwatch-agent

# Instalar Git
dnf install -y git

# Criar diretorio da aplicacao
mkdir -p /opt/banking-microservices
chown ec2-user:ec2-user /opt/banking-microservices

echo "Setup inicial completo!"
EOF

# Lancar instancia EC2
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.medium \
  --key-name banking-microservices-key \
  --security-group-ids $SG_APP \
  --subnet-id $SUBNET_PRIVATE_A \
  --iam-instance-profile Name=EC2-CloudWatch-Role \
  --user-data file://user-data.sh \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3","Encrypted":true}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=banking-microservices-app}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instancia EC2 criada: $INSTANCE_ID"

# Aguardar instancia estar running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Obter IP privado
PRIVATE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text)

echo "IP Privado: $PRIVATE_IP"
```

### 6. Criar Application Load Balancer

```bash
# Criar ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name banking-alb \
  --subnets $SUBNET_PUBLIC_A $SUBNET_PUBLIC_B \
  --security-groups $SG_ALB \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Criar Target Groups
TG_CLIENTS=$(aws elbv2 create-target-group \
  --name banking-clients-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

TG_TRANSACTIONS=$(aws elbv2 create-target-group \
  --name banking-transactions-tg \
  --protocol HTTP \
  --port 3002 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Registrar instancia nos target groups
aws elbv2 register-targets \
  --target-group-arn $TG_CLIENTS \
  --targets Id=$INSTANCE_ID

aws elbv2 register-targets \
  --target-group-arn $TG_TRANSACTIONS \
  --targets Id=$INSTANCE_ID

# Criar Listener HTTPS (requer certificado ACM)
# ACM_CERT_ARN deve ser o ARN do certificado criado no ACM
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$ACM_CERT_ARN \
  --default-actions Type=fixed-response,FixedResponseConfig='{StatusCode=404,ContentType=text/plain,MessageBody="Not Found"}'

# Criar regras de roteamento
# /api/users/* -> clients-service
# /api/auth/*  -> clients-service
# /api/transactions/* -> transactions-service
```

---

## Deploy via SSH

### Conectar ao Servidor

Como a instancia esta em subnet privada, voce precisa de um Bastion Host ou Session Manager.

#### Opcao 1: Session Manager (Recomendado)

```bash
# Instalar plugin do Session Manager
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb

# Conectar via Session Manager
aws ssm start-session --target $INSTANCE_ID
```

#### Opcao 2: SSH via Bastion Host

```bash
# Criar Bastion Host temporario
BASTION_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --key-name banking-microservices-key \
  --security-group-ids $SG_APP \
  --subnet-id $SUBNET_PUBLIC_A \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=banking-bastion}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

# Obter IP publico do Bastion
BASTION_IP=$(aws ec2 describe-instances \
  --instance-ids $BASTION_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Conectar usando SSH ProxyJump
ssh -i ~/.ssh/banking-microservices-key.pem \
    -J ec2-user@$BASTION_IP \
    ec2-user@$PRIVATE_IP
```

### Processo de Deploy

Uma vez conectado ao servidor:

```bash
# 1. Clonar repositorio
cd /opt/banking-microservices
git clone https://github.com/seu-usuario/banking-microservices.git .

# 2. Configurar variaveis de ambiente
cat > .env.production << 'EOF'
NODE_ENV=production

# Clients Service
CLIENTS_SERVICE_PORT=3001

# Transactions Service
TRANSACTIONS_SERVICE_PORT=3002

# Database - Clients (obtido do RDS)
CLIENTS_DB_HOST=banking-clients-db.xxxxxx.us-east-1.rds.amazonaws.com
CLIENTS_DB_PORT=5432
CLIENTS_DB_USER=dbadmin
CLIENTS_DB_NAME=clients_db
# CLIENTS_DB_PASS obtido do Secrets Manager

# Database - Transactions (obtido do RDS)
TRANSACTIONS_DB_HOST=banking-transactions-db.xxxxxx.us-east-1.rds.amazonaws.com
TRANSACTIONS_DB_PORT=5432
TRANSACTIONS_DB_USER=dbadmin
TRANSACTIONS_DB_NAME=transactions_db
# TRANSACTIONS_DB_PASS obtido do Secrets Manager

# RabbitMQ (Amazon MQ)
RABBIT_HOST=b-xxxxxx.mq.us-east-1.amazonaws.com
RABBIT_PORT=5671
RABBIT_USER=admin
# RABBIT_PASS obtido do Secrets Manager

# Redis (ElastiCache)
REDIS_HOST=banking-redis.xxxxxx.cache.amazonaws.com
REDIS_PORT=6379

# JWT
JWT_SECRET=obtido-do-secrets-manager
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EOF

# 3. Obter secrets do AWS Secrets Manager
export CLIENTS_DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id banking/clients-db \
  --query 'SecretString' \
  --output text | jq -r '.password')

# 4. Build das imagens
docker-compose -f docker-compose.prod.yml build

# 5. Iniciar servicos
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar status
docker-compose -f docker-compose.prod.yml ps

# 7. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Script de Deploy Automatizado

```bash
#!/bin/bash
# deploy.sh

set -e

echo "=== Banking Microservices Deploy ==="

# Variaveis
APP_DIR="/opt/banking-microservices"
COMPOSE_FILE="docker-compose.prod.yml"

cd $APP_DIR

# Pull das alteracoes
echo "1. Atualizando codigo..."
git fetch origin
git reset --hard origin/main

# Obter secrets
echo "2. Obtendo secrets..."
export CLIENTS_DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id banking/clients-db \
  --query 'SecretString' \
  --output text | jq -r '.password')

export TRANSACTIONS_DB_PASS=$(aws secretsmanager get-secret-value \
  --secret-id banking/transactions-db \
  --query 'SecretString' \
  --output text | jq -r '.password')

export JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id banking/jwt \
  --query 'SecretString' \
  --output text | jq -r '.secret')

# Build
echo "3. Building images..."
docker-compose -f $COMPOSE_FILE build

# Deploy com zero downtime
echo "4. Deploying..."
docker-compose -f $COMPOSE_FILE up -d --no-deps --build clients-service
sleep 10
docker-compose -f $COMPOSE_FILE up -d --no-deps --build transactions-service

# Health check
echo "5. Health check..."
sleep 5

CLIENTS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
TRANSACTIONS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)

if [ "$CLIENTS_HEALTH" = "200" ] && [ "$TRANSACTIONS_HEALTH" = "200" ]; then
  echo "Deploy concluido com sucesso!"
  echo "  - Clients Service: OK"
  echo "  - Transactions Service: OK"
else
  echo "ERRO: Health check falhou!"
  echo "  - Clients Service: $CLIENTS_HEALTH"
  echo "  - Transactions Service: $TRANSACTIONS_HEALTH"
  exit 1
fi
```

---

## Configuracao de Producao

### docker-compose.prod.yml

Veja o arquivo `docker-compose.prod.yml` na raiz do projeto.

### Variaveis de Ambiente de Producao

```bash
# Armazenar secrets no AWS Secrets Manager
aws secretsmanager create-secret \
  --name banking/clients-db \
  --secret-string '{"username":"dbadmin","password":"SENHA_SEGURA"}'

aws secretsmanager create-secret \
  --name banking/transactions-db \
  --secret-string '{"username":"dbadmin","password":"SENHA_SEGURA"}'

aws secretsmanager create-secret \
  --name banking/jwt \
  --secret-string '{"secret":"SEU_JWT_SECRET_MUITO_SEGURO_COM_32_CHARS"}'

aws secretsmanager create-secret \
  --name banking/rabbitmq \
  --secret-string '{"username":"admin","password":"SENHA_SEGURA"}'
```

---

## Monitoramento e Logs

### CloudWatch Logs

```bash
# Criar Log Groups
aws logs create-log-group --log-group-name /banking/clients-service
aws logs create-log-group --log-group-name /banking/transactions-service

# Configurar retencao de 30 dias
aws logs put-retention-policy \
  --log-group-name /banking/clients-service \
  --retention-in-days 30

aws logs put-retention-policy \
  --log-group-name /banking/transactions-service \
  --retention-in-days 30
```

### CloudWatch Agent Config

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/containers/*clients*.log",
            "log_group_name": "/banking/clients-service",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/containers/*transactions*.log",
            "log_group_name": "/banking/transactions-service",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Banking/Microservices",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_active"],
        "totalcpu": true
      },
      "mem": {
        "measurement": ["mem_used_percent"]
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"]
      }
    }
  }
}
```

### Alarmes CloudWatch

```bash
# Alarme de CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name banking-high-cpu \
  --alarm-description "CPU acima de 80% por 5 minutos" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:banking-alerts

# Alarme de erro no ALB
aws cloudwatch put-metric-alarm \
  --alarm-name banking-alb-5xx \
  --alarm-description "Erros 5xx no ALB" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=$ALB_ARN \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:banking-alerts
```

---

## Consideracoes de Seguranca

### Checklist de Seguranca

- [x] **Security Groups**: Principio do menor privilegio implementado
- [x] **SSH**: Acesso restrito apenas ao IP do administrador
- [x] **Subnets privadas**: Aplicacao e dados nao expostos publicamente
- [x] **Secrets Manager**: Credenciais nao armazenadas em arquivos
- [x] **Encryption at rest**: RDS e EBS com encriptacao habilitada
- [x] **Encryption in transit**: HTTPS no ALB, TLS no RDS
- [x] **Multi-AZ**: RDS com failover automatico
- [x] **Backups**: RDS com retencao de 7 dias
- [x] **Logs**: CloudWatch para auditoria
- [x] **WAF**: Protecao contra ataques comuns

### Boas Praticas Implementadas

1. **Defesa em profundidade**: Multiplas camadas de seguranca
2. **Segregacao de rede**: Subnets publicas e privadas separadas
3. **Principio do menor privilegio**: Security Groups minimos
4. **Rotacao de credenciais**: Secrets Manager permite rotacao
5. **Monitoramento**: CloudWatch com alertas
6. **Disaster Recovery**: Multi-AZ e backups automaticos

---

## Estimativa de Custos (us-east-1)

| Servico | Tipo | Custo Mensal Estimado |
|---------|------|----------------------|
| EC2 | t3.medium | ~$30 |
| RDS | db.t3.micro x2 (Multi-AZ) | ~$50 |
| ALB | Application LB | ~$20 |
| NAT Gateway | Por hora + dados | ~$35 |
| ElastiCache | cache.t3.micro | ~$15 |
| Amazon MQ | mq.t3.micro | ~$25 |
| CloudWatch | Logs + Metricas | ~$10 |
| **Total** | | **~$185/mes** |

> **Nota**: Para ambiente de desenvolvimento/teste, considere usar instancias menores ou Free Tier.

---

## Comandos Uteis

```bash
# Ver status dos servicos
docker-compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Restart de um servico especifico
docker-compose -f docker-compose.prod.yml restart clients-service

# Scale de servicos (se usando ECS/Fargate)
# aws ecs update-service --cluster banking --service clients --desired-count 3

# Verificar saude do ALB
aws elbv2 describe-target-health --target-group-arn $TG_CLIENTS

# Ver metricas no CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

---

## Proximos Passos (Melhorias Futuras)

1. **CI/CD**: Implementar pipeline com GitHub Actions + CodeDeploy
2. **Auto Scaling**: Configurar Auto Scaling Group para EC2
3. **ECS/Fargate**: Migrar para containers gerenciados
4. **Terraform**: Automatizar toda infraestrutura com IaC
5. **Blue/Green Deploy**: Zero downtime deployments
6. **CDN**: CloudFront para assets estaticos
7. **Backup Cross-Region**: Disaster recovery geografico
