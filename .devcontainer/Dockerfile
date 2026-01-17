FROM node:24.10-slim
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    nano \
    bash \
    passwd \
    && chsh -s /bin/bash \
    && npm config set registry https://registry.npmmirror.com/ \
    && npm install -g pnpm@10.18.3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*