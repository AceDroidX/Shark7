import logger from "shark7-shared/dist/logger"
import { Web } from 'shark7-shared/dist/Puppeteer/Web'
import { MongoController } from "./MongoController"
import { Browser } from "puppeteer"

export class DouyinWeb extends Web {
    name: string = 'douyin'
    mongo: MongoController

    constructor(browser: Browser, mongo: MongoController) {
        super(browser)
        this.mongo = mongo
    }

    async refresh() {
        // try {
        if (!process.env['douyin_sec_uid']) {
            logger.error('请设置douyin_sec_uid')
            process.exit(1)
        }
        logger.info('puppeteer:刷新cookie')
        const r: any = await Promise.race([this.browser.pages(), new Promise(resolve => setTimeout(resolve, 1000, 'timeout'))])
        if (r == 'timeout') {
            logger.error(`puppeteer:获取pages超时`);
            process.exit(1)
        }
        logger.debug(`puppeteer:pages:${r.length}`)
        const page = await this.browser.newPage()
        logger.debug('puppeteer:setViewport')
        await page.setViewport({ width: 1920, height: 1080 });
        logger.debug('puppeteer:clear cookies')
        await page.deleteCookie()
        logger.debug('puppeteer:cookies:' + await page.cookies())
        logger.debug('puppeteer:set event handlers')
        page.on('response', async (response) => {
            if (response.url().indexOf('/aweme/v1/web/user/profile/other/') == -1) {
                return
            }
            if (response.status() != 200) {
                logger.error(`puppeteer:response:${response.url()} status:${response.status()}`)
                return
            }
            const data = await response.json()
            if (data.status_code != 0) {
                logger.error(`puppeteer:response:${response.url()} status_code:${data.status_code}`)
                return
            }
            // logger.debug('puppeteer:response\n' + JSON.stringify(data))
            logger.debug('puppeteer:response')
            this.mongo.updateUserInfo(data.user)
        })
        logger.debug('puppeteer:goto and wait')
        await Promise.all([
            page.goto('https://www.douyin.com/user/' + process.env['douyin_sec_uid'], { timeout: 30000 }),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ])
        logger.debug('puppeteer:screenshot')
        await page.screenshot({ path: 'log/douyin.png', fullPage: false })
        logger.debug('puppeteer:close')
        await page.close()
        // } catch (err) {
        //     logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
        // }
    }
}
