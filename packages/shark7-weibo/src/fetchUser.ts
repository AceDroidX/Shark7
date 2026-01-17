import { logger, WeiboCookieMgr, WeiboUser } from "shark7-shared";
import { WeiboHTTP } from "./model/WeiboHTTP.ts";

const profile_info_prefix = 'https://weibo.com/ajax/profile/info?uid='

export async function fetchUser(uids: number[], wbhttp: WeiboHTTP, wcm: WeiboCookieMgr): Promise<WeiboUser[]> {
    logger.debug("开始抓取用户信息");
    const results: WeiboUser[] = [];
    
    for (const uid of uids) {
        try {
            const result = await wbhttp.getURL(profile_info_prefix + uid);
            if (!result) {
                logger.error(`获取用户信息失败: uid=${uid}`);
                continue;
            }
            if (result.status != 200) {
                logger.error(`getRawUserInfo status!=200:\n${JSON.stringify(result.data)}`);
                continue;
            }
            if (result.data.ok != 1) {
                if (result.data.url.startsWith('https://weibo.com/login.php')) {
                    logger.error(`cookie已失效:getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                    wcm.sendWeiboCookieExpireEvent();
                } else {
                    logger.error(`getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                }
                continue;
            }
            const user = WeiboUser.getFromRaw(result.data['data']['user']);
            results.push(user);
        } catch (e) {
            logger.error(`抓取用户信息出错: uid=${uid}`, e);
        }
    }
    
    return results;
}
