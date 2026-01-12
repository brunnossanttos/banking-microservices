FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

COPY packages/shared ./packages/shared
COPY packages/clients-service ./packages/clients-service

RUN npm install --ignore-scripts

RUN npm run build --workspace=@banking/shared

RUN npm run build --workspace=@banking/clients-service

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/clients-service/package*.json ./packages/clients-service/

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/clients-service/dist ./packages/clients-service/dist

RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

USER nodejs

WORKDIR /app/packages/clients-service

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
