import { logError } from "shark7-shared/dist/utils";
import logger from "shark7-shared/dist/logger";
import { Puppeteer } from "shark7-shared/dist/Puppeteer";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { MongoController } from "./MongoController";
import { Web } from "shark7-shared/dist/Puppeteer/Web";
import { WeiboWeb } from './WeiboWeb'

export class WeiboController {
    static wc: WeiboController;

    weiboWeb: Web
    mongo: MongoController

    constructor(weiboWeb: Web, mongo: MongoController) {
        this.weiboWeb = weiboWeb;
        this.mongo = mongo;
    }
    static async init(mongo: MongoController) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const weiboWeb = (await Puppeteer.getInstance(mongo, WeiboWeb)).web
        await weiboWeb.refresh()
        this.wc = new WeiboController(weiboWeb, mongo)
        return this.wc;
    }
    public async run() {
        const scheduler = new ToadScheduler()
        const refreshCookieTask = new AsyncTask(
            'refreshCookie',
            async () => {
                const r = await Promise.race([
                    this.weiboWeb.refresh(),
                    new Promise(resolve => setTimeout(resolve, 120 * 1000, 'timeout'))
                ]);
                if (r == 'timeout') {
                    logger.error(`刷新cookie超时`);
                    process.exit(1);
                }
            },
            (err: Error) => { logError('refreshCookie错误', err) }
        )
        let interval = 1800
        if (process.env['interval']) {
            interval = Number(process.env['interval'])
        }
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval, }, refreshCookieTask))
    }
}
