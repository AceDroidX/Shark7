import { logErrorDetail, logger, WeiboMsg } from 'shark7-shared';
import { WeiboCard, WeiboLikeIdConfig } from "./model";
import { MongoController } from './MongoController';
import { fetchURL, getReqConfig } from './utils';

export async function getLike(mongo: MongoController, config: WeiboLikeIdConfig): Promise<WeiboCard[] | null> {
    if (!mongo.cookieCache) {
        logger.error('cookieCache为空');
        return null
    }
    const cid = config.like_cid
    const reqConfig = getReqConfig(mongo, cid);
    const data = await fetchURL('https://api.weibo.cn/2/cardlist', reqConfig);
    if (!data) return null
    let cards: WeiboCard[] = data.cards;
    cards.reverse();
    return cards
}

export async function fetchLike(mongo: MongoController, config: WeiboLikeIdConfig): Promise<boolean> {
    logger.debug('开始抓取点赞');
    const weibo_id = config.id
    const cards = await getLike(mongo, config)
    if (!cards) return false
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
            logErrorDetail('抓取点赞出错', err, card);
        }
    });
    return true
}
