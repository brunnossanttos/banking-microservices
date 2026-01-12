output "vpc_id" {
  description = "ID da VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block da VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs das subnets publicas"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs das subnets privadas"
  value       = aws_subnet.private[*].id
}

output "security_group_alb_id" {
  description = "ID do Security Group do ALB"
  value       = aws_security_group.alb.id
}

output "security_group_app_id" {
  description = "ID do Security Group da aplicacao"
  value       = aws_security_group.app.id
}

output "security_group_database_id" {
  description = "ID do Security Group do banco de dados"
  value       = aws_security_group.database.id
}

output "ec2_instance_id" {
  description = "ID da instancia EC2"
  value       = aws_instance.app.id
}

output "ec2_private_ip" {
  description = "IP privado da instancia EC2"
  value       = aws_instance.app.private_ip
}

output "rds_clients_endpoint" {
  description = "Endpoint do RDS - Clients DB"
  value       = aws_db_instance.clients.endpoint
}

output "rds_clients_address" {
  description = "Hostname do RDS - Clients DB"
  value       = aws_db_instance.clients.address
}

output "rds_transactions_endpoint" {
  description = "Endpoint do RDS - Transactions DB"
  value       = aws_db_instance.transactions.endpoint
}

output "rds_transactions_address" {
  description = "Hostname do RDS - Transactions DB"
  value       = aws_db_instance.transactions.address
}

output "redis_endpoint" {
  description = "Endpoint do ElastiCache Redis"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "Porta do ElastiCache Redis"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
}

output "alb_dns_name" {
  description = "DNS name do Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID do ALB (para Route 53)"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN do Application Load Balancer"
  value       = aws_lb.main.arn
}

output "secrets_db_arn" {
  description = "ARN do secret de credenciais do banco"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_jwt_arn" {
  description = "ARN do secret JWT"
  value       = aws_secretsmanager_secret.jwt.arn
}

output "cloudwatch_log_group_clients" {
  description = "Nome do Log Group do Clients Service"
  value       = aws_cloudwatch_log_group.clients.name
}

output "cloudwatch_log_group_transactions" {
  description = "Nome do Log Group do Transactions Service"
  value       = aws_cloudwatch_log_group.transactions.name
}

output "application_config" {
  description = "Configuracao para variaveis de ambiente da aplicacao"
  value = {
    CLIENTS_DB_HOST        = aws_db_instance.clients.address
    CLIENTS_DB_PORT        = aws_db_instance.clients.port
    CLIENTS_DB_NAME        = "clients_db"
    TRANSACTIONS_DB_HOST   = aws_db_instance.transactions.address
    TRANSACTIONS_DB_PORT   = aws_db_instance.transactions.port
    TRANSACTIONS_DB_NAME   = "transactions_db"
    REDIS_HOST             = aws_elasticache_cluster.redis.cache_nodes[0].address
    REDIS_PORT             = aws_elasticache_cluster.redis.cache_nodes[0].port
    ALB_DNS                = aws_lb.main.dns_name
  }
  sensitive = false
}

output "ssh_command" {
  description = "Comando para conectar via Session Manager"
  value       = "aws ssm start-session --target ${aws_instance.app.id}"
}
