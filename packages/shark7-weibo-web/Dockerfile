ARG IMAGE_TAG=dev

FROM node:16-alpine AS build
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@7.17.0 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm install --offline
RUN pnpm run build:shared && pnpm run -F shark7-weibo build && pnpm run -F shark7-weibo-web build

FROM acedroidx/shark7-shared-web:${IMAGE_TAG}
COPY --from=build --chown=chrome /app/packages/shark7-weibo/dist/ ./packages/shark7-weibo/dist/
COPY --from=build --chown=chrome /app/packages/shark7-weibo-web/dist/ ./packages/shark7-weibo-web/dist/
CMD ["pnpm","run","-F","shark7-weibo-web","start"]
