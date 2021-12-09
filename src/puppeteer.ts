import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import config from './config'
import logger from './logger'
import fs from 'fs'
import { Browser } from 'puppeteer-extra-plugin/dist/puppeteer'
import { WeiboError } from './model/model'

const login_btn_selector = '#app > div.woo-box-flex.woo-box-column.Frame_wrap_3g67Q > div.Frame_top_2ybWw > div > div.Nav_wrap_gHB1a > div > div > div.woo-box-flex.woo-box-justifyEnd.Nav_right_pDw0F > div > div:nth-child(1) > div > a.LoginBtn_btn_10QRY.LoginBtn_btna_1hH9H'
const oldlogin_btn_selector = '#weibo_top_public > div > div > div.gn_position > div.gn_login > ul > li:nth-child(3) > a'

export class WeiboPuppeteer {
    cookie: any
    cookie_str: string = ''
    browser: Browser
    constructor(browser: Browser) {
        this.browser = browser
    }
    static async getInstance() {
        puppeteer.use(StealthPlugin())
        logger.debug('使用StealthPlugin')
        if (fs.existsSync('/usr/bin/google-chrome')) {
            var exepath = '/usr/bin/google-chrome'
        } else if (fs.existsSync('/usr/bin/chromium-browser')) {
            var exepath = '/usr/bin/chromium-browser'
        } else {
            if (process.platform === "win32") {
                var exepath = String.raw`D:\cli-tools\win64-901912\chrome-win\chrome.exe`
            } else {
                var exepath = ''
            }
        }
        return new WeiboPuppeteer(await puppeteer.launch({
            // pipe: true,
            userDataDir: './data/puppeteer',
            executablePath: exepath,
            args: ['--no-sandbox', "--single-process", "--no-zygote", '--disable-dev-shm-usage'],
            // args: ['--no-sandbox', '--disable-setuid-sandbox',
            //   '--disable-dev-shm-usage', '--single-process'],
            headless: true
        }))
    }
    async getCookieStr() {
        if (this.cookie_str == '') {
            logger.error('cookie_str is empty')
            throw new WeiboError('cookie_str is empty')
        }
        return this.cookie_str
        // try {
        //     if (this.browser === undefined) {
        //         logger.error('browser is undefined')
        //         return ''
        //     }
        //     const page = await this.browser.newPage()
        //     await page.setViewport({ width: 1920, height: 1080 });
        //     await page.goto('https://weibo.com/u/7198559139')
        //     await page.waitForTimeout(5000)
        //     var new_cookie = await page.cookies()
        //     return jsonToStr(new_cookie)
        // } catch (e) {
        //     logger.error(`getCookieStr:${JSON.stringify(e)}`)
        //     return ''
        // }
    }
    async refreshWeiboCookie() {
        // try {
        logger.info('puppeteer:刷新微博cookie')
        logger.debug(`puppeteer:pages:${(await this.browser.pages()).length}`)
        const page = await this.browser.newPage()
        logger.debug('puppeteer:setViewport')
        await page.setViewport({ width: 1920, height: 1080 });
        logger.debug('puppeteer:goto and wait')
        await Promise.all([
            page.goto('https://weibo.com/u/7198559139', { timeout: 10000 }),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ])
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
                await page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' })
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

        const newvalue = () => {
            for (const item of new_cookie) {
                if (item.name == 'WBPSESS') {
                    return item.value
                }
            }
        }
        const oldvalue = () => {
            if (this.cookie == undefined) {
                return ''
            }
            for (const i2 of this.cookie) {
                if (i2.name == 'WBPSESS') {
                    return i2.value
                }
            }
        }
        logger.debug(`puppeteer:oldvalue:${oldvalue()}`)
        logger.debug(`puppeteer:newvalue:${newvalue()}`)
        if (oldvalue() === newvalue()) {
            logger.info('微博cookie未更新')
        } else {
            if (oldvalue() == '') {
                logger.info('微博cookie已载入')
            } else {
                logger.warn('微博cookie已更新')
            }
        }
        this.cookie_str = jsonToStr(new_cookie)
        this.cookie = new_cookie
        await page.close()
        // } catch (err) {
        //     logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
        // }
    }
}

function strToJson(source: string) {
    if (source == '') return []
    return source.replace(/; /g, ';').replace(/;$/g, '').split(';').map(item => {
        var name = item.match(/^.*?(?==)/)
        var value = item.match(/(?<==)(.*)$/)
        if (name == null || value == null) {
            throw new Error('cookie格式错误')
        }
        return {
            name: name[0], value: value[0], domain: 'weibo.com'
        }
    })
}
function jsonToStr(source: any) {
    var result = ''
    source.forEach((element: any) => {
        result += `${element['name']}=${element['value']};`
    });
    return result.replace(/;$/g, '')
}