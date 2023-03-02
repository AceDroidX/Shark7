if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { initLogger, logger, Puppeteer } from 'shark7-shared';
import { Nats } from './nats';
import { WeiboWeb } from './WeiboWeb';

process.on('uncaughtException', function (err) {
    //打印出错误
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
        process.exit(1);
    }
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(1);
// });
// init
if (require.main === module) {
    main()
}
async function main() {
    initLogger('weibo-web')
    const nats = await Nats.connect()
    const weiboWeb = (await Puppeteer.getInstance(WeiboWeb, nats)).web
    nats.init(weiboWeb)
    await weiboWeb.refresh()
}