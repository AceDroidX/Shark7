import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
import { EventDBs } from '../database';
import { MongoControllerBase } from "../db/client";
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
        return await puppeteer.connect({
            browserURL: process.env['browser_url'] ?? 'http://127.0.0.1:9222',
        })
    }
    static async getInstance<W extends Web, E>(webfunc: { new(browser: Browser, extra: E): W }, extra: E): Promise<Puppeteer<W>>
    static async getInstance<W extends Web, D extends EventDBs, M extends MongoControllerBase<D>>(webfunc: { new(browser: Browser, mongo: M): W }, mongo: M): Promise<Puppeteer<W>> {
        const browser = await this.getBrowser()
        const web = new webfunc(browser, mongo)
        return new this(browser, web)
    }
}

