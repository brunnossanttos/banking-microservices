import { config } from 'dotenv';

config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),

  db: {
    url: process.env.DATABASE_URL || 'postgresql://admin:admin123@localhost:5433/transactions_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASS || 'admin123',
    database: process.env.DB_NAME || 'transactions_db',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/banking_vhost',
    host: process.env.RABBIT_HOST || 'localhost',
    port: parseInt(process.env.RABBIT_PORT || '5672', 10),
    user: process.env.RABBIT_USER || 'admin',
    password: process.env.RABBIT_PASS || 'admin123',
    vhost: process.env.RABBIT_VHOST || 'banking_vhost',
  },

  clientsService: {
    url: process.env.CLIENTS_SERVICE_URL || 'http://localhost:3001',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
