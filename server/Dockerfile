# --- Build: compila dependencias nativas (better-sqlite3) ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# --- Runtime: imagen liviana, reutiliza node_modules ya compilados ---
FROM node:22-bookworm-slim
RUN groupadd --system --gid 1001 appuser && useradd --system --uid 1001 --gid 1001 appuser
WORKDIR /app
COPY --from=build /app /app
RUN mkdir -p /app/data /app/uploads && chown -R appuser:appuser /app/data /app/uploads
ENV NODE_ENV=production
EXPOSE 3001
USER appuser
CMD ["node", "src/index.js"]
