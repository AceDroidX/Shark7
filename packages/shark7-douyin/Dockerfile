ARG IMAGE_TAG=dev

FROM node:18-alpine AS build
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@8.6.0 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm install --offline
RUN pnpm run build:shared && pnpm run -F shark7-douyin build

FROM acedroidx/shark7-shared-web:${IMAGE_TAG}
COPY --from=build --chown=chrome /app/packages/shark7-douyin/dist/ ./packages/shark7-douyin/dist/
CMD ["pnpm","run","-F","shark7-douyin","start"]
