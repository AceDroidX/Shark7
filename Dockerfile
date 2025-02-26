# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /app
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
COPY ./packages/shark7-shared/package.json /temp/dev/packages/shark7-shared/
COPY ./packages/shark7-apex/package.json /temp/dev/packages/shark7-apex/
COPY ./packages/shark7-bilibili/package.json /temp/dev/packages/shark7-bilibili/
COPY ./packages/shark7-bililive/package.json /temp/dev/packages/shark7-bililive/
COPY ./packages/shark7-douyin/package.json /temp/dev/packages/shark7-douyin/
COPY ./packages/shark7-main/package.json /temp/dev/packages/shark7-main/
COPY ./packages/shark7-netease-music/package.json /temp/dev/packages/shark7-netease-music/
COPY ./packages/shark7-weibo/package.json /temp/dev/packages/shark7-weibo/
COPY ./packages/shark7-weibo-app/package.json /temp/dev/packages/shark7-weibo-app/
COPY ./packages/shark7-weibo-web/package.json /temp/dev/packages/shark7-weibo-web/
COPY ./packages/shark7-rednote/package.json /temp/dev/packages/shark7-rednote/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
COPY ./packages/shark7-shared/package.json /temp/prod/packages/shark7-shared/
COPY ./packages/shark7-apex/package.json /temp/prod/packages/shark7-apex/
COPY ./packages/shark7-bilibili/package.json /temp/prod/packages/shark7-bilibili/
COPY ./packages/shark7-bililive/package.json /temp/prod/packages/shark7-bililive/
COPY ./packages/shark7-douyin/package.json /temp/prod/packages/shark7-douyin/
COPY ./packages/shark7-main/package.json /temp/prod/packages/shark7-main/
COPY ./packages/shark7-netease-music/package.json /temp/prod/packages/shark7-netease-music/
COPY ./packages/shark7-weibo/package.json /temp/prod/packages/shark7-weibo/
COPY ./packages/shark7-weibo-app/package.json /temp/prod/packages/shark7-weibo-app/
COPY ./packages/shark7-weibo-web/package.json /temp/prod/packages/shark7-weibo-web/
COPY ./packages/shark7-rednote/package.json /temp/prod/packages/shark7-rednote/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
ARG PACKAGE
ENV PACKAGE=${PACKAGE}
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/packages/shark7-shared ./packages/shark7-shared
COPY --from=prerelease /app/packages/shark7-${PACKAGE} ./packages/shark7-${PACKAGE}

# run the app
# USER bun
# EXPOSE 3000/tcp
ENTRYPOINT bun run packages/shark7-${PACKAGE}/src/index.ts
# ENTRYPOINT [ "bun", "run", "src/index.ts" ]
# ENTRYPOINT bash
