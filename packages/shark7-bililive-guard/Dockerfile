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
RUN pnpm run build:shared && pnpm run -F shark7-bililive-guard build

FROM acedroidx/shark7-shared:${IMAGE_TAG}
COPY --from=build /app/packages/shark7-bililive-guard/dist/ ./packages/shark7-bililive-guard/dist/
CMD ["pnpm","run","-F","shark7-bililive-guard","start"]
