variable "project_name" {
  description = "Nome do projeto usado como prefixo para recursos"
  type        = string
  default     = "banking"
}

variable "environment" {
  description = "Ambiente de deploy (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment deve ser: development, staging ou production."
  }
}

variable "aws_region" {
  description = "Regiao AWS para deploy"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block para a VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks para subnets publicas"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks para subnets privadas"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "enable_nat_gateway" {
  description = "Habilitar NAT Gateway para subnets privadas"
  type        = bool
  default     = true
}

variable "admin_ip_cidr" {
  description = "CIDR blocks permitidos para acesso SSH (ex: ['YOUR_IP/32'])"
  type        = list(string)
  default     = []
}

variable "ssh_public_key" {
  description = "Chave publica SSH para acesso as instancias EC2"
  type        = string
  sensitive   = true
}

variable "ec2_instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.medium"
}

variable "rds_instance_class" {
  description = "Classe de instancia RDS"
  type        = string
  default     = "db.t3.micro"
}

variable "db_username" {
  description = "Username do banco de dados"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_password" {
  description = "Senha do banco de dados"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Senha do banco deve ter pelo menos 16 caracteres."
  }
}

variable "redis_node_type" {
  description = "Tipo de node ElastiCache Redis"
  type        = string
  default     = "cache.t3.micro"
}

variable "acm_certificate_arn" {
  description = "ARN do certificado ACM para HTTPS (deixe vazio para HTTP only)"
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "Secret para assinatura JWT"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret deve ter pelo menos 32 caracteres."
  }
}
