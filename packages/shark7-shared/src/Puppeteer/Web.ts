import { Browser, Protocol } from "puppeteer";
import logger from "../logger";

interface IWeb {
    name: string;
    cookie: string;
    cookie_str: string;
    browser: Browser;
    getCookieStr(): string;
    getCookieByKey(key: string): string;
    refresh(): Promise<void>;
}

export class Web implements IWeb {
    name: string = 'web'

    cookie: any = undefined
    cookie_str: string = ''
    browser: Browser;
    constructor(browser: Browser) {
        this.browser = browser
    }
    getCookieStr() {
        if (this.cookie_str == '') {
            logger.error('cookie_str is empty')
        }
        return this.cookie_str
    }
    getCookieByKey(key: string) {
        if (this.cookie == undefined) {
            logger.debug('cookie is undefined')
            return undefined
        }
        for (const i of this.cookie) {
            if (i.name == key) {
                return i.value
            }
        }
        logger.error(`cookie key:${key} not found`)
        return undefined
    }
    isCookieChanged(cookie_key: string, new_cookie: Protocol.Network.Cookie[]) {
        const newvalue = () => {
            for (const item of new_cookie) {
                if (item.name == cookie_key) {
                    return item.value
                }
            }
        }
        const oldvalue = this.getCookieByKey(cookie_key)
        logger.debug(`puppeteer:oldvalue:${oldvalue}`)
        logger.debug(`puppeteer:newvalue:${newvalue()}`)
        if (oldvalue === newvalue()) {
            logger.info('cookie未更新')
            return false
        } else {
            if (oldvalue == '') {
                logger.info('cookie已载入')
                return false
            } else {
                logger.warn('cookie已更新')
                return true
            }
        }
    }
    async refresh() {
        throw new Error("Method not implemented.");
    }
    async refreshTask() {
        const r = await Promise.race([
            this.refresh(),
            new Promise(resolve => setTimeout(resolve, 120 * 1000, 'timeout'))
        ]);
        if (r == 'timeout') {
            logger.error(`刷新cookie超时`);
            process.exit(1);
        }
    }
}
