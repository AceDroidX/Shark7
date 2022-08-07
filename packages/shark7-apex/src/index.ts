if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import axios from 'axios';
import { ApexUserInfo } from "shark7-shared/dist/apex";
import { ApexDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { logErrorDetail, toNumOrStr } from 'shark7-shared/dist/utils';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';
import winston from 'winston';
import { MongoController } from './MongoController';
import { onUserInfoEvent } from './onUserInfoEvent';

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
    const mongo = await MongoControlClient.getInstance(ApexDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-apex', tryReconnect: true
    }))

    const apex_uid_str = process.env['apex_uid']
    if (!apex_uid_str) {
        logger.error('apex_uid配置项未配置')
        process.exit(1)
    }
    // const apex_uid = apex_uid_str.split(',').map(player => { return player.split(':').map(e => { return toNumOrStr(e) }) })
    const apex_uid = apex_uid_str.split(':').map(e => { return toNumOrStr(e) })
    console.log(apex_uid)
    if (!await getUserInfo(apex_uid[0], apex_uid[1])) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userinfoDB, onUserInfoEvent)
    mongo.ctr.run()

    const scheduler = new ToadScheduler()
    const refreshUserInfoTask = new AsyncTask(
        'refreshUserInfo',
        async () => {
            const userInfo = await getUserInfo(apex_uid[0], apex_uid[1])
            if (!userInfo) return
            await mongo.ctr.insertUserInfo(userInfo)
        },
        (err: Error) => { logErrorDetail('refreshUserInfo错误', err) }
    )
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 3, }, refreshUserInfoTask))
}

async function fetchUserInfo(uid: number) {
    try {
        let resp = await axios.get(`https://r5-crossplay.r5prod.stryder.respawn.com/user.php?qt=user-getinfo&getinfo=1&hardware=PC&uid=${uid}&language=english&timezoneOffset=8&ugc=1&rep=1&searching=0&change=7&loadidx=1`, { headers: { 'User-Agent': 'Respawn HTTPS/1.0' } })
        return resp.data
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logger.warn('抓取数据失败:请求错误\n' + JSON.stringify(err.toJSON()))
        } else {
            logErrorDetail('抓取数据失败', err)
        }
        return null
    }
}

async function getUserInfo(name: string, uid: number): Promise<ApexUserInfo | null> {
    let raw = await fetchUserInfo(uid)
    if (raw == null) {
        return null
    }
    raw = raw.replace(/"userInfo":\n/g, '')
    const userInfo: ApexUserInfo = JSON.parse(raw)
    userInfo.shark7_name = name
    userInfo.shark7_id = String(uid)
    return userInfo
}
