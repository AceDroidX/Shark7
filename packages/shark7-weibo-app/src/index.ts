if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { logAxiosError, logErrorDetail } from 'shark7-shared/dist/utils'
import logger from 'shark7-shared/dist/logger';
import { WeiboMsg } from 'shark7-weibo/dist/model/model'
import winston from 'winston';
import { MongoController } from './MongoController';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import axios, { AxiosRequestConfig } from 'axios';
import { Protocol } from 'puppeteer';

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
    const mongo = await MongoController.getInstance()

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoController.getMongoClientConfig().connect(), collection: 'log-weibo-app', tryReconnect: true
    }))

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id = Number(process.env['weibo_id'])

    await mongo.run()
    await fetchLike(mongo, weibo_id)
    const scheduler = new ToadScheduler()
    const fetchLikeTask = new Task(
        'fetchLike',
        () => { fetchLike(mongo, weibo_id) },
        (err: Error) => { logErrorDetail('fetchLike错误', err) }
    )
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 10, }, fetchLikeTask))
    logger.info('weibo-app模块已启动')
}

async function fetchLike(mongo: MongoController, weibo_id: number) {
    logger.debug('开始抓取点赞')
    if (!mongo.cookieCache) {
        logger.error('cookieCache为空')
        return
    }
    const reqConfig: AxiosRequestConfig = {
        params: {
            c: 'android', from: '10C5095010', lang: 'zh_CN',
            page: '1', count: '20',
            s: process.env['weibo_s'], containerid: process.env['weibo_containerid'],
            gsid: getCookieByKey(mongo.cookieCache, 'SUB')
        },
        headers: {
            authorization: `WB-SUT ${getCookieByKey(mongo.cookieCache, 'SUB')}`
        },
        transformResponse: (r) => r,
    }
    let resp
    try {
        resp = await axios.get('https://api.weibo.cn/2/cardlist', reqConfig)
        if (resp.status != 200) {
            logger.error(`抓取点赞失败,状态码:${resp.status}\n${resp}`)
            return
        }
    } catch (error) {
        logAxiosError(error)
    }
    const data = JSON.parse(resp?.data)
    let cards: WeiboCard[] = data.cards
    cards.reverse()
    cards.forEach(async (card: WeiboCard) => {
        try {
            if (card.card_type == 11) {
                if (card.card_group?.length != 1) {
                    logger.warn(`card_group长度不为1:${JSON.stringify(card)}`)
                    return
                }
                if (!card.card_group[0].mblog) {
                    logger.error(`card_group[0].mblog为空:${JSON.stringify(card)}`)
                    return
                }
                const weiboMsg = new WeiboMsg(card.card_group[0].mblog, weibo_id)
                await mongo.insertLike(weiboMsg)
            } else if (card.card_type == 9) {
                if (!card.mblog) {
                    logger.error(`card.mblog为空:${JSON.stringify(card)}`)
                    return
                }
                const weiboMsg = new WeiboMsg(card.mblog, weibo_id)
                await mongo.insertLike(weiboMsg)
            } else {
                logger.warn(`card_type未知:${JSON.stringify(card)}`)
            }
        } catch (err) {
            logErrorDetail('抓取点赞出错', err)
            logger.error(`${JSON.stringify(card)}`)
        }
    })
}

function getCookieByKey(cookie: Protocol.Network.Cookie[], key: string): string | undefined {
    for (const item of cookie) {
        if (item.name == key) {
            return item.value
        }
    }
}

type WeiboCard = {
    card_type: number,
    card_group?: WeiboCard[],
    mblog?: WeiboMsg,
}