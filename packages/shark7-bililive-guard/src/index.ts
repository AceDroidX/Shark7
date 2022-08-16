if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { BiliUsers } from 'shark7-shared/dist/bililive/BiliUsers';
import { BiliLiveDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import winston from 'winston';
import { fetchExistGuardState, fetchNewGuardState, fetchNotExistGuardState, onGuardEvent } from './guard';
import { MongoController } from './MongoController';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(BiliLiveDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-bililive-guard', tryReconnect: true
    }))

    const marked_uid_str = process.env['marked_uid']
    if (!marked_uid_str) {
        logger.error('请设置marked_uid')
        process.exit(1)
    }
    const marked_uid = marked_uid_str.split(',').map(x => parseInt(x))

    logger.info(`设置${marked_uid.length}个用户:`)
    const marked_Users = new BiliUsers()
    for (const uid of marked_uid) {
        const user = await marked_Users.addByUID(uid);
        if (!user) process.exit(1)
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const roomid_str = process.env['room_id']
    if (!roomid_str) {
        logger.error('房间id获取出错:' + typeof roomid_str)
        process.exit(1)
    }
    const roomid = roomid_str.split(',').map(x => parseInt(x))
    logger.info(`设置${roomid.length}个房间:`)
    const roomid_Users = new BiliUsers()
    for (const id of roomid) {
        const user = await roomid_Users.addByRoomid(id);
        if (!user) process.exit(1)
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.guardDB, onGuardEvent)
    if (!await fetchNewGuardState(mongo.ctr, roomid_Users, marked_Users) || !await fetchNotExistGuardState(mongo.ctr)) {
        logger.error('数据初始化失败')
        process.exit(1)
    }
    let exist_interval = process.env['exist_interval'] ? Number(process.env['exist_interval']) : 10
    let notexist_interval = process.env['notexist_interval'] ? Number(process.env['notexist_interval']) : 10 * 60
    const scheduler = new Scheduler()
    scheduler.addJob('fetchExistGuardState', exist_interval, () => { fetchExistGuardState(mongo.ctr) })
    scheduler.addJob('fetchNotExistGuardState', notexist_interval, () => { fetchNotExistGuardState(mongo.ctr) })
    logger.info('模块已启动')
}

