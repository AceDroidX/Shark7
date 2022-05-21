FROM node:16-alpine AS build
WORKDIR /app
ENV TZ=Asia/Shanghai
RUN npm install -g pnpm@7.0.0-rc.4 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm install --offline ; \
    pnpm run build:apex

FROM node:16-alpine
WORKDIR /app
ENV TZ=Asia/Shanghai
RUN npm install -g pnpm@7.0.0-rc.4 && npm cache clean --force
COPY pnpm-lock.yaml ./
RUN pnpm fetch --prod
COPY . ./
COPY --from=build /app/packages/shark7-apex/dist/ ./packages/shark7-apex/dist/
COPY --from=build /app/packages/shark7-shared/dist/ ./packages/shark7-shared/dist/
RUN pnpm install --offline --prod ; exit 0
CMD ["npm","run","start:apex"]