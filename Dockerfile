FROM node:16-slim

WORKDIR /app
# Uncomment to skip the chromium download when installing puppeteer.
ENV TZ=Asia/Shanghai \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get update && apt-get -yq upgrade && apt-get autoremove -yq && apt-get autoclean -yq 

# Run this like so:
# docker run -i --rm --cap-add=SYS_ADMIN \
#   --name puppeteer-chrome puppeteer-chrome-linux \
#    node -e "`cat yourscript.js`"
#
# or run `yarn serve` to start the webservice version.
#

# # Manually install missing shared libs for Chromium.
# RUN apt-get update && \
# apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
# libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
# libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
# libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
# ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

# See https://crbug.com/795759
# RUN apt-get update && apt-get -yq upgrade && apt-get install \
#     && apt-get autoremove && apt-get autoclean

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
# https://www.ubuntuupdates.org/package/google_chrome/stable/main/base/google-chrome-unstable
RUN apt-get install -y ca-certificates curl wget gnupg --no-install-recommends \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
      --no-install-recommends
    # && rm -rf /var/lib/apt/lists/* \
    # && apt-get purge --auto-remove -y curl \
    # && rm -rf /src/*.deb

# ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.1/dumb-init_1.2.1_amd64 /usr/local/bin/dumb-init
# RUN chmod +x /usr/local/bin/dumb-init
RUN apt-get install -yq dumb-init && apt-get autoremove -yq && apt-get autoclean -yq 

COPY package.json tsconfig.json /app/
#COPY local.conf /etc/fonts/local.conf

# Install deps for server.
RUN ls -al\
  && npm --registry https://registry.npm.taobao.org install
COPY src/ /app/src/
COPY config/ /app/config/
RUN npm run build

# Install puppeteer so it can be required by user code that gets run in
# server.js. Cache bust so we always get the latest version of puppeteer when
# building the image.
# ARG CACHEBUST=1
# RUN npm install puppeteer

# Add pptr user.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run user as non privileged.
USER pptruser

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm","run","start"]