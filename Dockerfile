FROM node:16-alpine
WORKDIR /root
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
  && apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  nodejs \
  npm
COPY package.json tsconfig.json /root/
RUN ls -al\
  && npm --registry https://registry.npm.taobao.org install
COPY src/ /root/src/
COPY config/ /root/config/
RUN npm run build
CMD ["npm","run","start"]