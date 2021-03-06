import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import logger from 'shark7-shared/dist/logger'
import fs from 'fs'
import { Browser } from 'puppeteer'
import { WeiboWeb } from '../WeiboWeb'

export class Puppeteer {
    static puppeteer: Puppeteer

    browser: Browser
    weiboweb: WeiboWeb
    constructor(browser: Browser) {
        this.browser = browser
        this.weiboweb = new WeiboWeb(this.browser)
    }
    static async getInstance() {
        if (this.puppeteer != undefined) {
            return this.puppeteer;
        }
        puppeteer.use(StealthPlugin())
        logger.debug('使用StealthPlugin')
        if (fs.existsSync('/usr/bin/google-chrome')) {
            var exepath = '/usr/bin/google-chrome'
        } else if (fs.existsSync('/usr/bin/chromium-browser')) {
            var exepath = '/usr/bin/chromium-browser'
        } else {
            if (process.platform === "win32") {
                var exepath = String.raw`D:\cli-tools\win64-991974\chrome-win\chrome.exe`
            } else {
                var exepath = ''
            }
        }
        this.puppeteer = new Puppeteer(await puppeteer.launch({
            // pipe: true,
            userDataDir: './data/puppeteer',
            executablePath: exepath,
            // args: ['--no-sandbox', "--single-process", "--no-zygote", '--disable-dev-shm-usage'],
            // args: ['--no-sandbox', '--disable-setuid-sandbox',
            //   '--disable-dev-shm-usage', '--single-process',"--no-zygote"],
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
            headless: true
        }))
        return this.puppeteer
    }
}

