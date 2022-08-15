import logger from "shark7-shared/dist/logger";
import { Puppeteer } from "shark7-shared/dist/Puppeteer";
import { Web } from "shark7-shared/dist/Puppeteer/Web";
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { MongoController } from "./MongoController";
import { WeiboWeb } from './WeiboWeb';

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
        let interval = process.env['interval'] ? Number(process.env['interval']) : 1800
        const scheduler = new Scheduler()
        scheduler.addJob('refreshCookie', interval, async () => {
            const r = await Promise.race([
                this.weiboWeb.refresh(),
                new Promise(resolve => setTimeout(resolve, 120 * 1000, 'timeout'))
            ]);
            if (r == 'timeout') {
                logger.error(`刷新cookie超时`);
                process.exit(1);
            }
        })
    }
}
