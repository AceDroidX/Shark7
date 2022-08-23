FROM node:16-alpine AS build
WORKDIR /app
ENV TZ=Asia/Shanghai \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@7.9.4 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm install --offline
RUN pnpm run build:shared && pnpm run -F shark7-weibo build && pnpm run -F shark7-weibo-web build

FROM zenika/alpine-chrome:101-with-node-16
WORKDIR /app
ENV TZ=Asia/Shanghai \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
USER root
RUN chown -R chrome /app ; npm install -g pnpm@7.9.4 && npm cache clean --force
USER chrome
COPY --chown=chrome pnpm-lock.yaml ./
RUN pnpm fetch --prod
COPY --chown=chrome . ./
COPY --from=build --chown=chrome /app/packages/shark7-shared/dist/ ./packages/shark7-shared/dist/
COPY --from=build --chown=chrome /app/packages/shark7-weibo/dist/ ./packages/shark7-weibo/dist/
COPY --from=build --chown=chrome /app/packages/shark7-weibo-web/dist/ ./packages/shark7-weibo-web/dist/
RUN pnpm install --offline --prod
CMD ["pnpm","run","-F","shark7-weibo-web","start"]
