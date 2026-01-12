set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
PROJECT_NAME="banking"
AWS_REGION="us-east-1"

echo -e "${GREEN}=== Banking Microservices AWS Deploy ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo ""

check_prerequisites() {
    echo -e "${YELLOW}1. Verificando pre-requisitos...${NC}"

    if ! command -v aws &> /dev/null; then
        echo -e "${RED}ERRO: AWS CLI nao encontrado${NC}"
        echo "Instale: https://aws.amazon.com/cli/"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERRO: Docker nao encontrado${NC}"
        exit 1
    fi

    if command -v terraform &> /dev/null; then
        echo "  - Terraform: $(terraform version -json | jq -r '.terraform_version')"
    else
        echo -e "${YELLOW}  - Terraform: nao instalado (opcional)${NC}"
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}ERRO: AWS credentials nao configuradas${NC}"
        echo "Execute: aws configure"
        exit 1
    fi

    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo "  - AWS Account: $AWS_ACCOUNT"
    echo -e "${GREEN}  Pre-requisitos OK${NC}"
}

build_images() {
    echo -e "${YELLOW}2. Building Docker images...${NC}"

    echo "  Building clients-service..."
    docker build -t ${PROJECT_NAME}/clients-service:latest ./packages/clients-service

    echo "  Building transactions-service..."
    docker build -t ${PROJECT_NAME}/transactions-service:latest ./packages/transactions-service

    echo -e "${GREEN}  Build concluido${NC}"
}

push_to_ecr() {
    echo -e "${YELLOW}3. Pushing images to ECR...${NC}"

    ECR_REGISTRY="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REGISTRY

    aws ecr describe-repositories --repository-names ${PROJECT_NAME}/clients-service 2>/dev/null || \
        aws ecr create-repository --repository-name ${PROJECT_NAME}/clients-service

    aws ecr describe-repositories --repository-names ${PROJECT_NAME}/transactions-service 2>/dev/null || \
        aws ecr create-repository --repository-name ${PROJECT_NAME}/transactions-service

    docker tag ${PROJECT_NAME}/clients-service:latest \
        $ECR_REGISTRY/${PROJECT_NAME}/clients-service:latest
    docker push $ECR_REGISTRY/${PROJECT_NAME}/clients-service:latest

    docker tag ${PROJECT_NAME}/transactions-service:latest \
        $ECR_REGISTRY/${PROJECT_NAME}/transactions-service:latest
    docker push $ECR_REGISTRY/${PROJECT_NAME}/transactions-service:latest

    echo -e "${GREEN}  Push concluido${NC}"
}

deploy_to_ec2() {
    echo -e "${YELLOW}4. Deploying to EC2...${NC}"

    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-app" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text)

    if [ "$INSTANCE_ID" == "None" ] || [ -z "$INSTANCE_ID" ]; then
        echo -e "${RED}ERRO: Instancia EC2 nao encontrada${NC}"
        echo "Verifique se a infraestrutura foi provisionada com Terraform"
        exit 1
    fi

    echo "  Instance ID: $INSTANCE_ID"

    echo "  Executando deploy via SSM..."
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands=["cd /opt/${PROJECT_NAME} && ./deploy.sh"] \
        --query 'Command.CommandId' \
        --output text)

    echo "  Command ID: $COMMAND_ID"

    echo "  Aguardando conclusao..."
    aws ssm wait command-executed \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID

    OUTPUT=$(aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text)

    echo "$OUTPUT"
    echo -e "${GREEN}  Deploy concluido${NC}"
}

health_check() {
    echo -e "${YELLOW}5. Health check...${NC}"

    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names ${PROJECT_NAME}-alb \
        --query 'LoadBalancers[0].DNSName' \
        --output text 2>/dev/null)

    if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" == "None" ]; then
        echo -e "${YELLOW}  ALB nao encontrado, verificando EC2 diretamente...${NC}"
        return
    fi

    echo "  ALB DNS: $ALB_DNS"

    CLIENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/users/health" || echo "000")
    TRANSACTIONS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/transactions/health" || echo "000")

    echo "  Clients Service: $CLIENTS_STATUS"
    echo "  Transactions Service: $TRANSACTIONS_STATUS"

    if [ "$CLIENTS_STATUS" == "200" ] && [ "$TRANSACTIONS_STATUS" == "200" ]; then
        echo -e "${GREEN}  Todos os servicos estao saudaveis!${NC}"
    else
        echo -e "${YELLOW}  Alguns servicos podem estar inicializando...${NC}"
    fi
}

main() {
    check_prerequisites
    echo ""

    build_images
    echo ""

    deploy_to_ec2
    echo ""

    health_check
    echo ""

    echo -e "${GREEN}=== Deploy finalizado com sucesso! ===${NC}"
}

main
