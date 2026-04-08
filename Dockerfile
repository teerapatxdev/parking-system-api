
# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev deps) for building
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok

# Install dependencies. We keep dev deps because:
#  - migrations are .ts files run via `typeorm-ts-node-commonjs`
#  - the data-source globs `src/**/*.entity.ts`
# `--include=dev` is required because NODE_ENV=production would otherwise
# cause npm to skip devDependencies.
COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force

# Copy build output and the sources required by migrations / data-source
COPY --from=builder /app/dist ./dist
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

EXPOSE 3000

# Run pending migrations, then start the compiled app
CMD ["sh", "-c", "npm run migration:run && node dist/main.js"]
