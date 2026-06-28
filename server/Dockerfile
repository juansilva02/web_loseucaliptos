# Imagen liviana; sin modulos nativos todavia (se agregan en pasos siguientes)
FROM node:22-bookworm-slim

WORKDIR /app

# Instalar dependencias con el lockfile (reproducible)
COPY package*.json ./
RUN npm ci --omit=dev

# Codigo
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
