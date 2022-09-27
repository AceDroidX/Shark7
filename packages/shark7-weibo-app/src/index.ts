if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { WeiboDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger, { addMongoTrans } from 'shark7-shared/dist/logger';
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import { fetchLike, getLike } from './fetchLike';
import { fetchOnline, getOnline } from './fetchOnline';
import { WeiboIdConfig, WeiboLikeIdConfig, WeiboOnlineIdConfig } from './model';
import { MongoController, onNewLike, onNewOnlineData } from './MongoController';

process.on('uncaughtException', function (err) {
    //打印出错误
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
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

    addMongoTrans('weibo-app')

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id_config = JSON.parse(process.env['weibo_id']) as WeiboIdConfig[]
    let like_id_config: WeiboLikeIdConfig[] = []
    let online_id_config: WeiboOnlineIdConfig[] = []
    for (const config of weibo_id_config) {
        if (config.like_cid) like_id_config.push({ id: config.id, like_cid: config.like_cid })
        if (config.online_cid) online_id_config.push({ id: config.id, online_cid: config.online_cid })
    }
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.likeDB, onNewLike)
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.onlineDB, onNewOnlineData)
    await mongo.ctr.run()
    if (!await getLike(mongo.ctr, like_id_config[0]) || !await getOnline(mongo.ctr, online_id_config[0])) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchLike', interval, () => { like_id_config.forEach(config => fetchLike(mongo.ctr, config)) })
    scheduler.addJob('fetchOnline', interval, () => { online_id_config.forEach(config => fetchOnline(mongo.ctr, config)) })
    logger.info('weibo-app模块已启动')
}

