if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { WeiboDBs } from 'shark7-shared';
import { MongoControlClient } from 'shark7-shared';
import { logger, initLogger } from 'shark7-shared';
import { MongoController } from './MongoController';
import { natsMain } from './nats';
import { WeiboController } from './WeiboController';

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
    const mongo = await MongoControlClient.getInstance(WeiboDBs, MongoController)

    initLogger('weibo-web')
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_Controller = await WeiboController.init(mongo.ctr)
    await weibo_Controller.run()
    await natsMain(weibo_Controller)
}
