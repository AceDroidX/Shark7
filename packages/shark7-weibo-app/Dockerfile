ARG IMAGE_TAG=dev

FROM node:18-alpine AS build
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@8.7.6 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm install --offline
RUN pnpm run build:shared && pnpm run -F shark7-weibo-app build

FROM node:18-alpine
WORKDIR /app
ENV TZ=Asia/Shanghai
COPY --from=build /app/packages/shark7-weibo-app/dist/ /app/dist/
CMD ["node","--enable-source-maps","dist/index.js"]
