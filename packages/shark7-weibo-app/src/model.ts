import { WeiboUser, WeiboMsg } from 'shark7-shared/dist/weibo';


export type WeiboCard = {
    card_type: number;
    card_group?: WeiboCard[];
    mblog?: WeiboMsg;
    user?: WeiboUser;
    desc1?: string;
};

export type WeiboIdConfig = {
    id: number
    like_cid?: string
    online_cid?: string
}

export type WeiboLikeIdConfig = {
    id: number
    like_cid: string
}

export type WeiboOnlineIdConfig = {
    id: number
    online_cid: string
}
