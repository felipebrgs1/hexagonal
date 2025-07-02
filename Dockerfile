# Build stage
FROM oven/bun:canary-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install
COPY . .

RUN bun run generate

FROM oven/bun:canary-alpine AS production

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production

COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["bun", "run", "start"]