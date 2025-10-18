import { Browser } from "puppeteer"
import { cookieJsonToStr, logger, Web } from "shark7-shared"
import { Nats } from "./nats.ts"

const login_btn_selector = '//a[text()="登录"]'
const oldlogin_btn_selector = '#weibo_top_public > div > div > div.gn_position > div.gn_login > ul > li:nth-child(3) > a'

export class WeiboWeb extends Web {
    name: string = 'weibo'

    nats: Nats
    constructor(browser: Browser, nats: Nats) {
        super(browser)
        this.nats = nats
    }

    async refresh() {
        // try {
        logger.info('puppeteer:刷新微博cookie')
        // const r: any = await Promise.race([this.browser.pages(), new Promise(resolve => setTimeout(resolve, 1000, 'timeout'))])
        // if (r == 'timeout') {
        //     logger.error(`puppeteer:获取pages超时`);
        //     process.exit(1)
        // }
        // logger.debug(`puppeteer:pages:${r.length}`)
        logger.info("puppeteer:检查是否已经有打开的标签页");
        const pages = await this.browser.pages();
        const page = pages.find((page) => page.url().includes('weibo.com')) ?? await this.browser.newPage()
        logger.debug('puppeteer:setViewport')
        await page.setViewport({ width: 1920, height: 1080 });
        // await page.setRequestInterception(true);
        // page.on("request", (interceptedRequest) => {
        //     if (interceptedRequest.isInterceptResolutionHandled()) return;
        //     // const blocklist = [
        //     //     "https://rm.api.weibo.com/2/remind/push_count.json",
        //     // ];
        //     // if (blocklist.some((url) => interceptedRequest.url().includes(url))) {
        //     //     interceptedRequest.abort();
        //     //     console.log("blocked:", interceptedRequest.url());
        //     // } else
        //      if (interceptedRequest.resourceType() == "image")
        //         interceptedRequest.abort();
        //     else if (interceptedRequest.resourceType() == "media")
        //         interceptedRequest.abort();
        //     else if (interceptedRequest.resourceType() == "stylesheet")
        //         interceptedRequest.abort();
        //     else interceptedRequest.continue();
        // });
        logger.debug('puppeteer:goto and wait')
        await Promise.all([
            page.goto('https://weibo.com/u/7198559139', { timeout: 60000 }),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ])
        if (page.url().startsWith('https://passport.weibo.com')) {
            logger.debug('puppeteer:passport页面 等待中')
            await page.waitForNavigation({ waitUntil: 'networkidle2' })
        }
        logger.debug(`puppeteer:更新前cookie\n${JSON.stringify(this.cookie)}`)
        await page.screenshot({ path: 'log/weibo-0.png', fullPage: false })
        const login_btn = await page.evaluate((selector) => document.evaluate(selector,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, login_btn_selector)
        const oldlogin_btn = await page.$(oldlogin_btn_selector)
        logger.debug('puppeteer:login_btn_selector:' + login_btn?.textContent)
        logger.debug('puppeteer:oldlogin_btn_selector:' + await oldlogin_btn?.evaluate(el => el.outerHTML))
        if (login_btn == null && oldlogin_btn == null) {
            // logger.debug('puppeteer:setCookie')
            // await page.setCookie(...weibo_cookie)
            logger.debug('puppeteer:已登录')
        } else {
            logger.debug('puppeteer:需要登录')
            if (login_btn == null && oldlogin_btn != null) {
                logger.debug('puppeteer:旧版登录页面')
                throw new WeiboError('旧版登录页面,暂未适配')
                // await page.click(oldlogin_btn_selector)
            } else if (login_btn != null && oldlogin_btn == null) {
                logger.debug('puppeteer:新版登录页面')
                const result = await Promise.all([
                    page.goto('https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup&url=https%3A%2F%2Fweibo.com%2Fu%2F7198559139', { timeout: 60000 }),
                    page.waitForResponse(response => response.url().includes('v2.qr.weibo.cn'), { timeout: 60000 })
                ])
                const finalResponse = result[1];
                logger.warn('请在60秒内扫描此二维码登录weibo：\n' + finalResponse.url());
                try {
                    await page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle2' })
                    logger.debug('puppeteer:登录跳转中')
                    await page.waitForResponse(response => response.url().includes('https://weibo.com/u/7198559139'), { timeout: 60000 });
                } catch (e: any) {
                    throw new WeiboError('登录超时')
                }
                logger.info('登录成功')
            } else {
                logger.error('puppeteer:未知页面')
                throw new WeiboError('未知页面')
            }
        }
        logger.debug('puppeteer:screenshot')
        await page.screenshot({ path: 'log/weibo.png', fullPage: false })

        var new_cookie = await page.cookies()
        logger.debug('puppeteer:new_cookie\n' + JSON.stringify(new_cookie))

        // if (this.isCookieChanged('SUB', new_cookie)) this.nats.sendWeiboCookieUpdateEvent(new_cookie)
        this.isCookieChanged('SUB', new_cookie)
        this.nats.sendWeiboCookieUpdateEvent(new_cookie)

        this.cookie_str = cookieJsonToStr(new_cookie)
        this.cookie = new_cookie
        await page.close()
        // } catch (err) {
        //     logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
        // }
    }
}

class WeiboError extends Error {
    code: number;
    name = "WeiboError";
    constructor(msg: string, code = 0) {
        super(msg);
        this.code = code;
    }
}
