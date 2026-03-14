FROM node:24.10-alpine AS base
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@10.18.3 && npm cache clean --force

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --prod
COPY . .
RUN pnpm install --offline --prod

FROM base
ARG PACKAGE
ENV PACKAGE=${PACKAGE}
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/packages/shark7-shared ./packages/shark7-shared
COPY --from=build /app/packages/shark7-${PACKAGE} ./packages/shark7-${PACKAGE}
ENTRYPOINT ["node", "scripts/docker-entrypoint.ts"]
