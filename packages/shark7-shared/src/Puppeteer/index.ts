import fs from 'fs';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EventDBs } from '../database';
import { MongoControllerBase } from "../db/client";
import { logger } from '../logger';
import { Web } from './Web';

export * from './Web'

export class Puppeteer<T extends Web> {
    browser: Browser
    web: T
    constructor(browser: Browser, web: T) {
        this.browser = browser
        this.web = web
    }
    static async getBrowser() {
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
        return await puppeteer.launch({
            // pipe: true,
            userDataDir: process.platform === "win32" ? './data/puppeteer' : '/app/puppeteer',
            executablePath: exepath,
            // args: ['--no-sandbox', "--single-process", "--no-zygote", '--disable-dev-shm-usage'],
            // args: ['--no-sandbox', '--disable-setuid-sandbox',
            //   '--disable-dev-shm-usage', '--single-process',"--no-zygote"],
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
            headless: 'new'
        })
    }
    static async getInstance<W extends Web, E>(webfunc: { new(browser: Browser, extra: E): W }, extra: E): Promise<Puppeteer<W>>
    static async getInstance<W extends Web, D extends EventDBs, M extends MongoControllerBase<D>>(webfunc: { new(browser: Browser, mongo: M): W }, mongo: M): Promise<Puppeteer<W>> {
        const browser = await this.getBrowser()
        const web = new webfunc(browser, mongo)
        return new this(browser, web)
    }
}

