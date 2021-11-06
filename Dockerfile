FROM node:16
WORKDIR /root
COPY package.json tsconfig.json /root/
COPY src/ /root/src/
COPY config/ /root/config/
RUN ls -al\
&& npm --registry https://registry.npm.taobao.org install
ENV TZ=Asia/Shanghai
CMD ["npm","run","start"]