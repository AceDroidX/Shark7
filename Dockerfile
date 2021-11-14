FROM node:16
WORKDIR /root
COPY package.json tsconfig.json /root/
RUN ls -al\
    && npm --registry https://registry.npm.taobao.org install
COPY src/ /root/src/
COPY config/ /root/config/
RUN npm run build
ENV TZ=Asia/Shanghai
CMD ["npm","run","start"]