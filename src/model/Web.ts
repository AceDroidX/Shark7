import { Browser, Protocol } from "puppeteer";
import logger from "../logger";

interface IWeb {
    name: string;
    cookie: string;
    cookie_str: string;
    browser: Browser;
    getCookieStr(): string;
    refresh(): Promise<void>;
}

export class Web implements IWeb {
    name: string = 'web'

    cookie: any = {}
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
    isCookieChanged(cookie_key: string, new_cookie: Protocol.Network.Cookie[]) {
        const newvalue = () => {
            for (const item of new_cookie) {
                if (item.name == cookie_key) {
                    return item.value
                }
            }
        }
        const oldvalue = () => {
            if (this.cookie == undefined) {
                return ''
            }
            for (const i2 of this.cookie) {
                if (i2.name == cookie_key) {
                    return i2.value
                }
            }
        }
        logger.debug(`puppeteer:oldvalue:${oldvalue()}`)
        logger.debug(`puppeteer:newvalue:${newvalue()}`)
        if (oldvalue() === newvalue()) {
            logger.info('cookie未更新')
            return false
        } else {
            if (oldvalue() == '') {
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
}
