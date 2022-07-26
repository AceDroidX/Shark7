import { logErrorDetail } from 'shark7-shared/dist/utils';
import logger from 'shark7-shared/dist/logger';
import { WeiboMsg } from 'shark7-shared/dist/weibo';
import { MongoController } from './MongoController';
import { getReqConfig, fetchURL } from './utils';
import { WeiboCard } from "./model";

export async function fetchLike(mongo: MongoController, weibo_id: number): Promise<boolean> {
    logger.debug('开始抓取点赞');
    if (!mongo.cookieCache) {
        logger.error('cookieCache为空');
        return false
    }
    if (!process.env['weibo_like_cid']) {
        logger.error('env:weibo_like_cid为空');
        return false
    }
    const reqConfig = getReqConfig(mongo, process.env['weibo_like_cid']);
    const data = await fetchURL('https://api.weibo.cn/2/cardlist', reqConfig);
    if (!data) return false
    let cards: WeiboCard[] = data.cards;
    cards.reverse();
    cards.forEach(async (card: WeiboCard) => {
        try {
            if (card.card_type == 11) {
                if (card.card_group?.length != 1) {
                    logger.warn(`card_group长度不为1:${JSON.stringify(card)}`);
                    return;
                }
                if (!card.card_group[0].mblog) {
                    logger.error(`card_group[0].mblog为空:${JSON.stringify(card)}`);
                    return;
                }
                const weiboMsg = new WeiboMsg(card.card_group[0].mblog, weibo_id);
                await mongo.insertLike(weiboMsg);
            } else if (card.card_type == 9) {
                if (!card.mblog) {
                    logger.error(`card.mblog为空:${JSON.stringify(card)}`);
                    return;
                }
                const weiboMsg = new WeiboMsg(card.mblog, weibo_id);
                await mongo.insertLike(weiboMsg);
            } else {
                logger.warn(`card_type未知:${JSON.stringify(card)}`);
            }
        } catch (err) {
            logErrorDetail('抓取点赞出错', err);
            logger.error(`${JSON.stringify(card)}`);
        }
    });
    return true
}
