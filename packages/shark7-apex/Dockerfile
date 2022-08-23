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
RUN pnpm run build:shared && pnpm run -F shark7-apex build

FROM node:16-alpine
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
RUN npm install -g pnpm@7.9.4 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch --prod
COPY . ./
COPY --from=build /app/packages/shark7-shared/dist/ ./packages/shark7-shared/dist/
COPY --from=build /app/packages/shark7-apex/dist/ ./packages/shark7-apex/dist/
RUN pnpm install --offline --prod
CMD ["pnpm","run","-F","shark7-apex","start"]
