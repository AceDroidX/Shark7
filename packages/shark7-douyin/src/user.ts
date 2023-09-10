import axios from "axios";
import { DouyinUserApi } from "./model";
import {
    DouyinUser,
    cookieStrToJson,
    logAxiosError,
    logErrorDetail,
    logger,
} from "shark7-shared";
import { MongoController } from "./MongoController";

const { sign } = require("./X-Bogus.js");

export async function insertUser(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
    const data = await getUser(sec_uid);
    if (!data) return false;
    await ctr.updateUserInfo(data);
    return true;
}

async function getUser(sec_uid: string): Promise<DouyinUser | null> {
    const user_agent = process.env["user_agent"];
    if (!user_agent) {
        logger.error("请设置user_agent");
        process.exit(1);
    }
    let cookie = process.env["cookie"];
    if (!cookie) {
        logger.error("请设置cookie");
        process.exit(1);
    }
    const msToken = generateMsToken();
    cookie = updateCookieValue(cookie, "msToken", msToken);
    try {
        const url = makeUrl(sec_uid, user_agent, msToken);
        const resp = await getDouyinUserApi(
            url,
            user_agent,
            `https://www.douyin.com/user/${sec_uid}`,
            cookie
        );
        if (resp.status != 200) {
            logger.warn(
                `getUserInfo resp.status!=200\nstatus:${resp.status}\n` +
                    JSON.stringify(resp.data)
            );
            return null;
        }
        if (resp.data.status_code != 0) {
            logger.warn(
                `getUserInfo resp.data.status_code != 0\ncode:${resp.data.status_code}\n` +
                    JSON.stringify(resp.data)
            );
            return null;
        }
        return resp.data.user;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err);
        } else {
            logErrorDetail("抓取数据失败", err);
        }
        return null;
    }
}

function makeUrl(sec_uid: string, user_agent: string, msToken: string) {
    const browser_version = user_agent.match(
        /Chrome\/(\d+\.\d+\.\d+\.\d+)/
    )?.[1];
    // 删除&round_trip_time=100之后的&webid=7277039811630024251
    const url = `https://www.douyin.com/aweme/v1/web/user/profile/other/?device_platform=webapp&aid=6383&channel=channel_pc_web&publish_video_strategy_type=2&source=channel_pc_web&sec_user_id=${sec_uid}&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=${browser_version}&browser_online=true&engine_name=Blink&engine_version=${browser_version}&os_name=Windows&os_version=10&cpu_core_num=8&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=100&msToken=${msToken}`;
    const query = url.includes("?") ? url.split("?")[1] : "";
    const xbogus = sign(query, user_agent);
    return url + "&X-Bogus=" + xbogus;
}

function getDouyinUserApi(
    url: string,
    user_agent: string,
    referer: string,
    cookie: string
) {
    return axios.get<DouyinUserApi>(url, {
        headers: {
            "User-Agent": user_agent,
            referer: referer,
            cookie: cookie,
        },
    });
}

function getMsTokenFromCookie(cookie: string) {
    const cookiejson = cookieStrToJson(cookie);
    for (const item of cookiejson) {
        if (item.name == "msToken") return item.value;
    }
    return null;
}

function parseCookieString(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookiePairs = cookieString.split(";");
    for (const pair of cookiePairs) {
        const [name, value] = pair.trim().split("=");
        cookies[name] = value;
    }
    return cookies;
}

function updateCookieValue(
    cookieString: string,
    name: string,
    newValue: string
): string {
    const cookies = parseCookieString(cookieString);
    cookies[name] = newValue;
    const updatedCookiePairs = Object.entries(cookies).map(
        ([cookieName, cookieValue]) => `${cookieName}=${cookieValue}`
    );
    const updatedCookieString = updatedCookiePairs.join("; ");
    return updatedCookieString;
}

function generateMsToken(length = 107): string {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=";
    let randomString = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}
