# Nova Salary Portal — single image for web (`npm start`) and worker (`npm run worker`).
# Railway detects this Dockerfile automatically for both services.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders only — real secrets/URLs come from Railway at runtime.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV AUTH_SECRET="build-time-placeholder-secret-min-32-chars"
ENV OTP_PEPPER="build-time-otp-pepper"
ENV REDIS_URL="redis://127.0.0.1:6379"
ENV APP_URL="http://localhost:3000"
ENV SEED_DEV="0"
RUN npx prisma generate
RUN npm run build
RUN npx playwright install --with-deps chromium

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
# System libraries for Chromium (must exist on the final image).
RUN npx playwright install-deps chromium \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /ms-playwright /ms-playwright

EXPOSE 3000

# Web default. Worker service overrides start command to `npm run worker`.
CMD ["npm", "run", "start"]
