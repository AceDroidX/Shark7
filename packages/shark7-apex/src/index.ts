import axios from 'axios';
import type { ApexUserInfo } from "shark7-shared";
import { ApexDBs, MongoControlClient, Scheduler, initLogger, logErrorDetail, logger, toNumOrStr, Nats, createChangeTracker } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { formatApexUserChanges } from './formatters.ts';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});

if (import.meta.main) {
    main()
}
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(ApexDBs, MongoController, nc)

    initLogger('apex')

    const apex_uid_str = process.env['apex_uid']
    if (!apex_uid_str) {
        logger.error('apex_uid配置项未配置')
        process.exit(1)
    }
    const apex_uid = apex_uid_str.split(':').map(e => { return toNumOrStr(e) })
    console.log(apex_uid)
    
    const trackUserInfoChange = createChangeTracker<ApexUserInfo>(
        async (newData) => mongo.ctr.getUserInfo(newData.uid),
        (data) => mongo.ctr.insertUserInfo(data),
        (event) => mongo.publishShark7Event(event),
        {
            keysToSkip: ['shark7_id', 'shark7_name', '_id', 'charVer', 'timeSinceServerChange'],
            formatter: formatApexUserChanges
        }
    )
    
    if (!await getUserInfo(apex_uid[0], apex_uid[1])) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    mongo.ctr.run()

    let interval = process.env['interval'] ? Number(process.env['interval']) : 3
    const scheduler = new Scheduler()
    scheduler.addJob('refreshUserInfo', interval, async () => {
        const userInfo = await getUserInfo(apex_uid[0], apex_uid[1])
        if (!userInfo) return
        await trackUserInfoChange(userInfo)
    })
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
