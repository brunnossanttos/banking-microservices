import winston from 'winston';
import { env } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${String(timestamp)} [${String(level).toUpperCase()}]: ${String(message)}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    if (stack && typeof stack === 'string') {
      msg += `\n${stack}`;
    }
    return msg;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: env.isProduction ? jsonFormat : logFormat,
  defaultMeta: { service: 'clients-service' },
  transports: [
    new winston.transports.Console({
      format: env.isDevelopment
        ? winston.format.combine(winston.format.colorize(), logFormat)
        : jsonFormat,
    }),
  ],
});

if (env.isProduction) {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}
