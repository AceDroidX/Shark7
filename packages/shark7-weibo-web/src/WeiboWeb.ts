import logger from "shark7-shared/dist/logger"
import { WeiboError } from "shark7-weibo/dist/model/model"
import { cookieJsonToStr } from 'shark7-shared/dist/utils'
import { Web } from 'shark7-shared/dist/Puppeteer/Web'
import { MongoController } from "./MongoController"
import { Browser } from "puppeteer"

const login_btn_selector = '#app > div.woo-box-flex.woo-box-column.Frame_wrap_3g67Q > div.Frame_top_2ybWw > div > div.Nav_wrap_gHB1a > div > div > div.woo-box-flex.woo-box-justifyEnd.Nav_right_pDw0F > div.Nav_loginArea_2HJSu > div > a.LoginBtn_btn_10QRY.LoginBtn_btna_1hH9H.loginBtn'
const oldlogin_btn_selector = '#weibo_top_public > div > div > div.gn_position > div.gn_login > ul > li:nth-child(3) > a'

export class WeiboWeb extends Web {
    name: string = 'weibo'
    mongo: MongoController

    constructor(browser: Browser, mongo: MongoController) {
        super(browser)
        this.mongo = mongo
    }

    async refresh() {
        // try {
        logger.info('puppeteer:刷新微博cookie')
        const r: any = await Promise.race([this.browser.pages(), new Promise(resolve => setTimeout(resolve, 1000, 'timeout'))])
        if (r == 'timeout') {
            logger.error(`puppeteer:获取pages超时`);
            process.exit(1)
        }
        logger.debug(`puppeteer:pages:${r.length}`)
        const page = await this.browser.newPage()
        logger.debug('puppeteer:setViewport')
        await page.setViewport({ width: 1920, height: 1080 });
        logger.debug('puppeteer:goto and wait')
        await Promise.all([
            page.goto('https://weibo.com/u/7198559139', { timeout: 30000 }),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ])
        if (page.url().startsWith('https://passport.weibo.com')) {
            logger.debug('puppeteer:passport页面 等待中')
            await page.waitForNavigation({ waitUntil: 'networkidle2' })
        }
        logger.debug(`puppeteer:更新前cookie\n${JSON.stringify(this.cookie)}`)
        await page.screenshot({ path: 'log/weibo-0.png', fullPage: false })
        const login_btn = await page.$(login_btn_selector)
        const oldlogin_btn = await page.$(oldlogin_btn_selector)
        logger.debug('puppeteer:login_btn_selector:' + login_btn)
        logger.debug('puppeteer:oldlogin_btn_selector:' + oldlogin_btn)
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
                await page.click(login_btn_selector)
                logger.debug('puppeteer:waitForResponse')
                const finalResponse = await page.waitForResponse(response => response.url().includes('v2.qr.weibo.cn'), { timeout: 10000 });
                logger.warn('请在60秒内扫描此二维码登录weibo：\n' + JSON.stringify(finalResponse.url()));
                try {
                    await page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' })
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

        if (this.isCookieChanged('SUB', new_cookie)) this.mongo.updateCookie(new_cookie)

        this.cookie_str = cookieJsonToStr(new_cookie)
        this.cookie = new_cookie
        await page.close()
        // } catch (err) {
        //     logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
        // }
    }
}
