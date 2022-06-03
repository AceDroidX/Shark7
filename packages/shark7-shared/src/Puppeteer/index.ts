import { Browser } from 'puppeteer'
import { Web } from './Web'

export class PuppeteerBase<T extends Web> {
    browser: Browser
    web: T
    constructor(browser: Browser, web: T) {
        this.browser = browser
        this.web = web
    }
    // static async getInstance(){
        // puppeteer.use(StealthPlugin())
        // logger.debug('使用StealthPlugin')
        // if (fs.existsSync('/usr/bin/google-chrome')) {
        //     var exepath = '/usr/bin/google-chrome'
        // } else if (fs.existsSync('/usr/bin/chromium-browser')) {
        //     var exepath = '/usr/bin/chromium-browser'
        // } else {
        //     if (process.platform === "win32") {
        //         var exepath = String.raw`D:\cli-tools\win64-991974\chrome-win\chrome.exe`
        //     } else {
        //         var exepath = ''
        //     }
        // }
        // const browser = await puppeteer.launch({
        //     // pipe: true,
        //     userDataDir: './data/puppeteer',
        //     executablePath: exepath,
        //     // args: ['--no-sandbox', "--single-process", "--no-zygote", '--disable-dev-shm-usage'],
        //     // args: ['--no-sandbox', '--disable-setuid-sandbox',
        //     //   '--disable-dev-shm-usage', '--single-process',"--no-zygote"],
        //     args: ['--no-sandbox', '--disable-dev-shm-usage'],
        //     headless: true
        // })
        // const web = new Web(browser)
        // return new PuppeteerBase(browser, web)
    // }
}

