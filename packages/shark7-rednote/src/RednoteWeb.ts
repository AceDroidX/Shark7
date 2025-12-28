import { Browser, Page } from "puppeteer";
import {
    cookieJsonToStr,
    cookieStrToJson,
    logger,
    Puppeteer,
    Web,
} from "shark7-shared";
import type { BrowserSign } from "./model.ts";

const login_btn_selector = '//*[text()="登录"]';
// const oldlogin_btn_selector =
//     "#weibo_top_public > div > div > div.gn_position > div.gn_login > ul > li:nth-child(3) > a";

export let rednoteWeb: RednoteWeb | undefined;

export class RednoteWeb extends Web {
    name: string = "rednote";

    page: Page | undefined;

    constructor(browser: Browser) {
        super(browser);
    }

    setCookie() {
        const cookieStr = process.env["cookie"];
        if (!cookieStr) {
            logger.error("请设置cookie");
            process.exit(1);
        }
        this.browser
            .defaultBrowserContext()
            .setCookie(...cookieStrToJson(cookieStr, ".xiaohongshu.com"));
    }

    async clearStorage() {
        if (!this.page) {
            logger.error("puppeteer:page不存在");
            return;
        }
        logger.info("puppeteer:清除localStorage");
        await this.page.evaluate(() => {
            localStorage.clear();
        });
        logger.info("puppeteer:清除sessionStorage");
        await this.page.evaluate(() => {
            sessionStorage.clear();
        });
        logger.info("puppeteer:清除cookie");
        await this.browser.deleteCookie(
            ...(
                await this.browser.cookies()
            ).filter((cookie) => cookie.domain.endsWith(".xiaohongshu.com"))
        );
    }

    async open() {
        // try {
        logger.info("puppeteer:检查cookie");
        const isCookieExist = (await this.browser.cookies()).find(
            (cookie) => cookie.domain == ".xiaohongshu.com"
        );
        if (isCookieExist) {
            logger.info("puppeteer:cookie已存在");
        } else {
            logger.info("puppeteer:cookie不存在");
            this.setCookie();
            logger.info("puppeteer:已设置cookie");
        }
        logger.info("puppeteer:检查是否已经有打开的标签页");
        const pages = await this.browser.pages();
        for (const page of pages) {
            if (page.url().startsWith("https://www.xiaohongshu.com")) {
                logger.info("puppeteer:已有标签页");
                this.page = page;
                return;
            }
        }
        this.page = await this.browser.newPage();
    }

    async setup() {
        logger.info("puppeteer:设置标签页");
        if (!this.page) {
            logger.error("puppeteer:page不存在");
            process.exit(1);
        }
        logger.debug("puppeteer:setViewport");
        await this.page.setViewport({ width: 1920, height: 1080 });
        await this.page.setRequestInterception(true);
        this.page.on("request", (interceptedRequest) => {
            if (interceptedRequest.isInterceptResolutionHandled()) return;
            // const blocklist = [
            //     "https://t2.xiaohongshu.com/api/v2/collect",
            //     "https://apm-fe.xiaohongshu.com/api/data",
            //     "https://edith.xiaohongshu.com/api/sns/web/unread_count",
            // ];
            // if (blocklist.includes(interceptedRequest.url())) {
            //     interceptedRequest.abort();
            //     console.log("blocked:", interceptedRequest.url());
            // } else
            if (interceptedRequest.resourceType() == "image")
                interceptedRequest.abort();
            else if (interceptedRequest.resourceType() == "media")
                interceptedRequest.abort();
            else if (interceptedRequest.resourceType() == "stylesheet")
                interceptedRequest.abort();
            else interceptedRequest.continue();
        });
    }

    async refresh() {
        logger.info("puppeteer:刷新cookie");
        if (!this.page) {
            logger.error("puppeteer:page不存在");
            process.exit(1);
        }
        logger.debug("puppeteer:goto and wait");
        await Promise.all([
            this.page.goto(
                "https://www.xiaohongshu.com/user/profile/" +
                    process.env["uid"],
                { timeout: 60000 }
            ),
            this.page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);
        // if (page.url().startsWith("https://passport.weibo.com")) {
        //     logger.debug("puppeteer:passport页面 等待中");
        //     await page.waitForNavigation({ waitUntil: "networkidle2" });
        // }
        logger.debug(`puppeteer:更新前cookie\n${JSON.stringify(this.cookie)}`);
        const login_btn = await this.page.evaluate(
            (selector) =>
                document.evaluate(
                    selector,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue,
            login_btn_selector
        );
        logger.debug("puppeteer:login_btn_selector:" + login_btn?.textContent);
        if (login_btn == null) {
            logger.debug("puppeteer:已登录");
            // logger.debug("puppeteer:screenshot");
            // await this.page.screenshot({
            //     path: "log/weibo.png",
            //     fullPage: false,
            // });

            var new_cookie = await this.page.cookies();
            logger.debug("puppeteer:new_cookie\n" + JSON.stringify(new_cookie));

            // if (this.isCookieChanged('SUB', new_cookie)) this.nats.sendWeiboCookieUpdateEvent(new_cookie)
            this.isCookieChanged("a1", new_cookie);

            this.cookie_str = cookieJsonToStr(new_cookie);
            this.cookie = new_cookie;
        } else {
            await this.clearStorage();
            this.setCookie();
            await this.refresh();
        }
        // await page.screenshot({ path: "log/weibo-0.png", fullPage: false });
        // const oldlogin_btn = await page.$(oldlogin_btn_selector);
        // logger.debug("puppeteer:oldlogin_btn_selector:" + oldlogin_btn);
        // if (login_btn == null && oldlogin_btn == null) {
        //     // logger.debug('puppeteer:setCookie')
        //     // await page.setCookie(...weibo_cookie)
        //     logger.debug("puppeteer:已登录");
        // } else {
        //     logger.debug("puppeteer:需要登录");
        //     if (login_btn == null && oldlogin_btn != null) {
        //         logger.debug("puppeteer:旧版登录页面");
        //         throw new WeiboError("旧版登录页面,暂未适配");
        //         // await page.click(oldlogin_btn_selector)
        //     } else if (login_btn != null && oldlogin_btn == null) {
        //         logger.debug("puppeteer:新版登录页面");
        //         const result = await Promise.all([
        //             page.goto(
        //                 "https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup&url=https%3A%2F%2Fweibo.com%2Fu%2F7198559139",
        //                 { timeout: 10000 }
        //             ),
        //             page.waitForResponse(
        //                 (response) => response.url().includes("v2.qr.weibo.cn"),
        //                 { timeout: 10000 }
        //             ),
        //         ]);
        //         const finalResponse = result[1];
        //         logger.warn(
        //             "请在60秒内扫描此二维码登录weibo：\n" + finalResponse.url()
        //         );
        //         try {
        //             await page.waitForNavigation({
        //                 timeout: 60000,
        //                 waitUntil: "networkidle2",
        //             });
        //             logger.debug("puppeteer:登录跳转中");
        //             await page.waitForResponse(
        //                 (response) =>
        //                     response
        //                         .url()
        //                         .includes("https://weibo.com/u/7198559139"),
        //                 { timeout: 10000 }
        //             );
        //         } catch (e: any) {
        //             throw new WeiboError("登录超时");
        //         }
        //         logger.info("登录成功");
        //     } else {
        //         logger.error("puppeteer:未知页面");
        //         throw new WeiboError("未知页面");
        //     }
        // }

        // await page.close();
        // } catch (err) {
        //     logger.error(`刷新微博cookie失败：\n${JSON.stringify(err)}`)
        // }
    }

    async sign(url: string, data: any) {
        if (!this.page) {
            logger.error("puppeteer:page不存在");
            process.exit(1);
        }
        const resp = (await this.page.evaluate(
            // @ts-ignore
            (url, data) => window._webmsxyw(url, data),
            url,
            data
        )) as BrowserSign;
        return resp;
    }
}

export async function initWeb() {
    rednoteWeb = (await Puppeteer.getInstance(RednoteWeb, null)).web;
    await rednoteWeb.open();
    await rednoteWeb.setup();
    await rednoteWeb.refresh();
}
