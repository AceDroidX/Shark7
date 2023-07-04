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
const user_agent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

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
    const cookie = process.env["cookie"];
    if (!cookie) {
        logger.error("请设置cookie");
        process.exit(1);
    }
    const msToken = getMsTokenFromCookie(cookie);
    if (!msToken) {
        logger.error("cookie中找不到msToken");
        process.exit(1);
    }
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
    const url = `https://www.douyin.com/aweme/v1/web/user/profile/other/?device_platform=webapp&aid=6383&channel=channel_pc_web&publish_video_strategy_type=2&source=channel_pc_web&sec_user_id=${sec_uid}&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=109.0.0.0&browser_online=true&engine_name=Blink&engine_version=109.0.0.0&os_name=Windows&os_version=10&cpu_core_num=8&device_memory=8&platform=PC&downlink=0.75&effective_type=4g&round_trip_time=50&webid=7251602090815604261&msToken=${msToken}`;
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
