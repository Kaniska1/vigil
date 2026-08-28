# ---------- Base ----------
FROM node:22-slim AS base

WORKDIR /app

ENV NODE_ENV=production


# ---------- Dependencies ----------
FROM base AS deps

COPY package.json package-lock.json ./

COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci


# ---------- Builder ----------
FROM base AS builder

ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

# TypeScript 7 uses a platform-specific native compiler binary.
# npm can occasionally omit this optional package in Linux container builds,
# so install it explicitly in the build stage only.
RUN npm install --no-save @typescript/typescript-linux-x64@7.0.2

RUN DATABASE_URL="postgresql://vigil:vigil@localhost:5432/vigil" \
    npm run generate --workspace=@vigil/db

RUN DATABASE_URL="postgresql://vigil:vigil@localhost:5432/vigil" \
    npm run build --workspace=@vigil/db

RUN DATABASE_URL="postgresql://vigil:vigil@localhost:5432/vigil" \
    npm run build --workspace=@vigil/api


# ---------- Runtime ----------
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./

COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json

COPY --from=deps /app/node_modules ./node_modules

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

EXPOSE 8080

CMD ["npm", "run", "start", "--workspace=@vigil/api"]