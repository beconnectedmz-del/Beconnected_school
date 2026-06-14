FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY src/ ./src/

EXPOSE 8084
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8084/health || exit 1

USER node
ENTRYPOINT ["dumb-init", "node", "src/index.js"]
