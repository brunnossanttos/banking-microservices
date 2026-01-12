import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${String(timestamp)} [${String(level)}]: ${String(message)}`;

  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  if (stack && typeof stack === 'string') {
    log += `\n${stack}`;
  }

  return log;
});

export function createLogger(serviceName: string): winston.Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat,
    ),
    transports: [
      new winston.transports.Console({
        format: isDevelopment ? combine(colorize(), logFormat) : logFormat,
      }),
      ...(isDevelopment
        ? []
        : [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
          ]),
    ],
  });
}
