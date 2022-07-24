import { WeiboUser, WeiboMsg } from 'shark7-shared/dist/weibo';


export type WeiboCard = {
    card_type: number;
    card_group?: WeiboCard[];
    mblog?: WeiboMsg;
    user?: WeiboUser;
    desc1?: string;
};
