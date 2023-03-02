if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import EventEmitter from 'events';
import { initLogger, logger, MongoControlClient, WeiboDBs } from 'shark7-shared';
import { onCommentInsert, onCommentUpdate, onMblogEvent, onMblogUpdate, onUserDBEvent } from './event';
import { WeiboHTTP } from './model/WeiboHTTP';
import { MongoController } from './MongoController';
import { Nats } from './nats';
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

    initLogger('weibo')

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id = process.env['weibo_id'].split(',').map(x => parseInt(x))

    const eventEmitter = new EventEmitter();
    const nats = await Nats.init(eventEmitter)
    const cookie = (await nats.requestCookie()).cookie
    const wbhttp = new WeiboHTTP(eventEmitter, cookie)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.mblogsDB, onMblogEvent, onMblogUpdate, wbhttp)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.commentsDB, onCommentInsert, onCommentUpdate)
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserDBEvent)
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_Controller = await WeiboController.init(weibo_id, mongo.ctr, eventEmitter, wbhttp)
    await weibo_Controller.run()
}
