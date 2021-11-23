FROM node:16
WORKDIR /root
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libxshmfence1\
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
COPY package.json tsconfig.json /root/
RUN ls -al\
    && npm --registry https://registry.npm.taobao.org install
COPY src/ /root/src/
COPY config/ /root/config/
COPY data/ /root/data/
RUN npm run build
ENV TZ=Asia/Shanghai
CMD ["npm","run","start"]