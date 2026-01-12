set -e

PROJECT_NAME="${project_name}"
AWS_REGION="${aws_region}"

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Iniciando setup da instancia ==="

echo "1. Atualizando sistema..."
dnf update -y

echo "2. Instalando Docker..."
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

echo "3. Instalando Docker Compose..."
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -L "https://github.com/docker/compose/releases/download/$${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

docker --version
docker-compose --version

echo "4. Instalando CloudWatch Agent..."
dnf install -y amazon-cloudwatch-agent

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWCONFIG'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/containers/*clients*.log",
            "log_group_name": "/banking/clients-service",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/containers/*transactions*.log",
            "log_group_name": "/banking/transactions-service",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/banking/ec2-setup",
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
        "measurement": ["cpu_usage_active", "cpu_usage_idle"],
        "totalcpu": true
      },
      "mem": {
        "measurement": ["mem_used_percent", "mem_available"]
      },
      "disk": {
        "measurement": ["disk_used_percent", "disk_free"],
        "resources": ["/"]
      },
      "net": {
        "measurement": ["net_bytes_recv", "net_bytes_sent"]
      }
    },
    "append_dimensions": {
      "InstanceId": "$${aws:InstanceId}"
    }
  }
}
CWCONFIG

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "5. Instalando ferramentas auxiliares..."
dnf install -y git jq htop

echo "6. Criando diretorio da aplicacao..."
mkdir -p /opt/$${PROJECT_NAME}
chown ec2-user:ec2-user /opt/$${PROJECT_NAME}

echo "7. Criando script de deploy..."
cat > /opt/$${PROJECT_NAME}/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e

APP_DIR="/opt/${project_name}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== Banking Microservices Deploy ==="
echo "Timestamp: $(date)"

cd $APP_DIR

# Obter secrets do Secrets Manager
echo "1. Obtendo secrets..."
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id ${project_name}/db-credentials \
  --region ${aws_region} \
  --query 'SecretString' \
  --output text | jq -r '.password')

export JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id ${project_name}/jwt \
  --region ${aws_region} \
  --query 'SecretString' \
  --output text | jq -r '.secret')

# Pull das alteracoes
echo "2. Atualizando codigo..."
git fetch origin
git reset --hard origin/main

# Build
echo "3. Building images..."
docker-compose -f $COMPOSE_FILE build

# Deploy
echo "4. Deploying..."
docker-compose -f $COMPOSE_FILE up -d

# Health check
echo "5. Health check..."
sleep 10

CLIENTS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
TRANSACTIONS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health || echo "000")

if [ "$CLIENTS_HEALTH" = "200" ] && [ "$TRANSACTIONS_HEALTH" = "200" ]; then
  echo "Deploy concluido com sucesso!"
  echo "  - Clients Service: OK ($CLIENTS_HEALTH)"
  echo "  - Transactions Service: OK ($TRANSACTIONS_HEALTH)"
else
  echo "AVISO: Health check com problemas"
  echo "  - Clients Service: $CLIENTS_HEALTH"
  echo "  - Transactions Service: $TRANSACTIONS_HEALTH"
fi

echo "=== Deploy finalizado ==="
DEPLOY

chmod +x /opt/$${PROJECT_NAME}/deploy.sh
chown ec2-user:ec2-user /opt/$${PROJECT_NAME}/deploy.sh

echo "8. Configurando logrotate..."
cat > /etc/docker/daemon.json << 'DOCKERCONF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKERCONF

systemctl restart docker

echo "=== Setup concluido com sucesso! ==="
echo "Proximo passo: Clonar o repositorio e executar deploy.sh"
echo ""
echo "  cd /opt/$${PROJECT_NAME}"
echo "  git clone <repo-url> ."
echo "  ./deploy.sh"
echo ""
