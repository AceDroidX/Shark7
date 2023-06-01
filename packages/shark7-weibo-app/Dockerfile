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
RUN pnpm run build:shared && pnpm run -F shark7-weibo build && pnpm run -F shark7-weibo-app build

FROM acedroidx/shark7-shared:${IMAGE_TAG}
COPY --from=build /app/packages/shark7-weibo/dist/ ./packages/shark7-weibo/dist/
COPY --from=build /app/packages/shark7-weibo-app/dist/ ./packages/shark7-weibo-app/dist/
CMD ["pnpm","run","-F","shark7-weibo-app","start"]
