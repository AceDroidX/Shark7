import config from './config'
import { logErrorDetail } from './utils'
import { WeiboController } from './WeiboController';
import logger from './logger';
import { MongoController } from './MongoController';
import winston from 'winston';
import { MongoClient } from 'mongodb';

process.on('uncaughtException', function (err) {
    //打印出错误 
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(2);
    }
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(2);
// });
// init
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoController.getInstance()

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: new MongoClient(
            process.env.NODE_ENV == 'development'
                ? 'mongodb://localhost:27017/weibo'
                : 'mongodb://admin:' +
                process.env.MONGODB_PASS +
                '@' +
                process.env.MONGODB_IP +
                ':27017/weibo?authMechanism=DEFAULT'
        ).connect(), collection: 'log', tryReconnect: true
    }))

    const weibo_id = config.get('weibo_id')
    if (typeof weibo_id != "number") {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_Controller = await WeiboController.init(weibo_id, mongo)
    weibo_Controller.run()
}