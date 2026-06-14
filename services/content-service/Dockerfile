FROM node:20-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY src/ ./src/
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8085/health || exit 1
USER node
ENTRYPOINT ["dumb-init", "node", "src/index.js"]
