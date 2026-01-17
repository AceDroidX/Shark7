import { logger, WeiboCookieMgr, WeiboMsg } from "shark7-shared";
import { WeiboHTTP } from "./model/WeiboHTTP.ts";

const weibo_mblog_prefix = "https://weibo.com/ajax/statuses/mymblog?page=1&feature=0&uid="

export async function fetchMblog(uids: number[], wbhttp: WeiboHTTP, wcm: WeiboCookieMgr): Promise<WeiboMsg[]> {
    logger.debug("开始抓取微博");
    const results: WeiboMsg[] = [];
    
    for (const uid of uids) {
        try {
            const result = await wbhttp.getURL(weibo_mblog_prefix + uid);
            if (!result) {
                logger.error(`获取微博列表失败: uid=${uid}`);
                continue;
            }
            if (result.status != 200) {
                logger.error(`getMblogs status!=200:\n${JSON.stringify(result.data)}`);
                continue;
            }
            if (result.data.ok != 1) {
                if (result.data.url.startsWith('https://weibo.com/login.php')) {
                    logger.error(`cookie已失效:getMblogs error:\n${JSON.stringify(result.data)}`);
                    wcm.sendWeiboCookieExpireEvent();
                } else {
                    logger.error(`getMblogs error:\n${JSON.stringify(result.data)}`);
                }
                continue;
            }
            const mblogs = result.data.data.list.map((mblog: any) => new WeiboMsg(mblog, uid));
            results.push(...mblogs);
        } catch (e) {
            logger.error(`抓取微博出错: uid=${uid}`, e);
        }
    }
    
    return results;
}
