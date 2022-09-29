if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { WeiboDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger, { initLogger } from 'shark7-shared/dist/logger';
import { onCommentInsert, onCommentUpdate, onMblogEvent, onMblogUpdate, onUserDBEvent } from './event';
import { MongoController } from './MongoController';
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

    mongo.addInsertChangeWatcher(mongo.ctr.dbs.mblogsDB, onMblogEvent, onMblogUpdate)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.commentsDB, onCommentInsert, onCommentUpdate)
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserDBEvent)
    await mongo.ctr.run()
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_Controller = await WeiboController.init(weibo_id, mongo.ctr)
    weibo_Controller.run()
}
