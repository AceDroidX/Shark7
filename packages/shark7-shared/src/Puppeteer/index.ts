import * as dns from "node:dns";
import puppeteer, { Browser } from 'puppeteer';
import { EventDBs } from '../database.ts';
import { MongoControllerBase } from "../db/client.ts";
import { Web } from './Web.ts';
export * from './Web.ts';

export class Puppeteer<T extends Web> {
    browser: Browser
    web: T
    constructor(browser: Browser, web: T) {
        this.browser = browser
        this.web = web
    }
    static async getBrowser() {
        const addrs = await dns.promises.resolve4(process.env['browser_host'] ?? 'localhost');
        return await puppeteer.connect({
            browserURL: `http://${addrs[0]}:9222`,
        })
    }
    static async getInstance<W extends Web, E>(webfunc: { new(browser: Browser, extra: E): W }, extra: E): Promise<Puppeteer<W>>
    static async getInstance<W extends Web, D extends EventDBs, M extends MongoControllerBase<D>>(webfunc: { new(browser: Browser, mongo: M): W }, mongo: M): Promise<Puppeteer<W>> {
        const browser = await this.getBrowser()
        const web = new webfunc(browser, mongo)
        return new this(browser, web)
    }
}

