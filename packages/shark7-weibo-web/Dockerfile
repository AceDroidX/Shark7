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
RUN pnpm run build:shared && pnpm run -F shark7-weibo-web build

FROM zenika/alpine-chrome:115-with-node
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
USER root
RUN chown -R chrome /app ; npm install -g pnpm@8.7.6 && npm cache clean --force
USER chrome
COPY --chown=chrome pnpm-lock.yaml ./
RUN pnpm fetch --prod
COPY --chown=chrome . ./
COPY --from=build --chown=chrome /app/packages/shark7-shared/dist/ ./packages/shark7-shared/dist/
RUN mkdir /app/puppeteer && chown chrome:chrome /app/puppeteer
VOLUME /app/puppeteer
RUN pnpm install --offline --prod
COPY --from=build --chown=chrome /app/packages/shark7-weibo-web/dist/ ./packages/shark7-weibo-web/dist/
CMD ["pnpm","run","-F","shark7-weibo-web","start"]
