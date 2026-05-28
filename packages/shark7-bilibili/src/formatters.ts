import type { Shark7Event } from "shark7-shared";
import type { BiliUser, BiliVideo, BiliDynamic } from "shark7-shared";
import { logger, Scope } from "shark7-shared";
import type { IAtomicChange } from "json-diff-ts";

/**
 * 格式化 Bilibili 用户变更
 */
export function formatBilibiliUserChanges(changes: IAtomicChange[], newData: BiliUser): string[] {
    const messages: string[] = [];

    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;

        switch (key) {
            case 'vip.label.path':
            case 'fans_badge':
            case 'top_photo':
            case 'elec.show_info.total':
                continue;
        }

        const skipFieldsPrefix = ['elec.show_info.list', 'live_room.watched_show'];
        if (skipFieldsPrefix.some(prefix => key.startsWith(prefix))) {
            continue;
        }

        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') {
            continue;
        }

        messages.push(`${key}更改\n原：${JSON.stringify(oldValue)}\n现：${JSON.stringify(value)}`);
    }

    return messages;
}

/**
 * 格式化 Bilibili 投币插入
 */
export function formatBilibiliCoinInsert(newData: BiliVideo): string {
    return `<${newData.owner.name}>${newData.title}\nhttps://b23.tv/${newData.bvid}`;
}

/**
 * 格式化 Bilibili 点赞插入
 */
export function formatBilibiliLikeInsert(newData: BiliVideo): string {
    return `<${newData.owner.name}>${newData.title}\nhttps://b23.tv/${newData.bvid}`;
}

/**
 * 格式化 Bilibili 动态变更
 */
export function formatBilibiliDynamicChanges(changes: IAtomicChange[], newData: BiliDynamic): string[] {
    switch (newData.type) {
        case 'DYNAMIC_TYPE_LIVE_RCMD':
            return [];
    }

    const messages: string[] = [];

    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');

        if (key.startsWith('orig')) {
            continue;
        }

        if (key.startsWith('modules.module_interaction')) {
            continue;
        }

        if (key.startsWith('modules.module_author')) {
            continue;
        }

        if (key.startsWith('modules.module_dynamic.major.archive.stat')) {
            continue;
        }

        if (key.startsWith('modules.module_stat.like')) {
            continue;
        }

        if (key.startsWith('modules.module_stat.comment')) {
            continue;
        }

        // 直播预约
        if (key.startsWith('modules.module_dynamic.additional.reserve')) {
            continue;
        }

        const skipFields = ['modules.module_stat.forward.count', 'modules.module_stat.comment.count', 'modules.module_stat.like.count'];
        if (skipFields.includes(key)) continue;

        const value = change.value;
        const oldValue = change.oldValue;

        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') {
            continue;
        }

        const skipFieldsIfNull = ['modules.module_dynamic.topic', 'modules.module_stat.coin', 'modules.module_stat.favorite', 'modules.module_dynamic.major.opus.summary'];
        if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
            if (skipFieldsIfNull.includes(key)) continue;
        }

        messages.push(`${key}更改\n原：${JSON.stringify(oldValue)}\n现：${JSON.stringify(value)}`);
    }

    return messages;
}

/**
 * 格式化 Bilibili 视频变更（点赞/投币）
 * 对于点赞和投币，我们只关心新数据，不关心更新
 */
export function formatBilibiliVideoChanges(changes: IAtomicChange[], newData: BiliVideo): string[] {
    return [];
}

function getDynamicText(newData: BiliDynamic): string | null {
    if (newData.modules.module_dynamic.desc?.text) {
        return newData.modules.module_dynamic.desc.text;
    }
    if (newData.modules.module_dynamic.major.type === 'MAJOR_TYPE_OPUS') {
        const text = newData.modules.module_dynamic.major.opus.summary.text;
        if (text) {
            return text;
        }
    }
    return null;
}

/**
 * 格式化 Bilibili 动态插入
 */
export function formatBilibiliDynamicInsert(newData: BiliDynamic): string | null {
    let type: string, content: string | null;

    switch (newData.type) {
        case 'DYNAMIC_TYPE_LIVE_RCMD':
            return null;
        case 'DYNAMIC_TYPE_AV':
            type = 'B站视频';
            if (newData.modules.module_dynamic.major.type !== 'MAJOR_TYPE_ARCHIVE') {
                logger.warn(`DYNAMIC_TYPE_AV里不是MAJOR_TYPE_ARCHIVE: ${newData.modules.module_dynamic.major.type}`);
                return null;
            };
            content = getDynamicText(newData);
            if (content === null) {
                content = '';
            } else {
                content += '\n';
            }
            content += newData.modules.module_dynamic.major.archive.title + '\nhttps://b23.tv/' + newData.modules.module_dynamic.major.archive.bvid;
            break;
        case 'DYNAMIC_TYPE_DRAW':
        case 'DYNAMIC_TYPE_WORD':
            type = 'B站动态';
            content = getDynamicText(newData);
            break;
        case 'DYNAMIC_TYPE_FORWARD':
            type = 'B站转发';
            content = getDynamicText(newData);
            break;
        default:
            return null;
    }

    return `${type}\n${content}`;
}

/**
 * 创建 Bilibili 用户事件
 */
export function createBilibiliUserEvent(name: string, messages: string[]): Shark7Event | null {
    if (messages.length === 0) return null;
    return {
        ts: Number(new Date()),
        name,
        scope: Scope.Bilibili.User,
        msg: messages.join('\n')
    };
}

/**
 * 创建 Bilibili 投币事件
 */
export function createBilibiliCoinEvent(userName: string, newData: BiliVideo): Shark7Event | null {
    return {
        ts: Number(new Date()),
        name: userName,
        scope: Scope.Bilibili.Coin,
        msg: formatBilibiliCoinInsert(newData)
    };
}

/**
 * 创建 Bilibili 点赞事件
 */
export function createBilibiliLikeEvent(userName: string, newData: BiliVideo): Shark7Event | null {
    return {
        ts: Number(new Date()),
        name: userName,
        scope: Scope.Bilibili.Like,
        msg: formatBilibiliLikeInsert(newData)
    };
}

/**
 * 创建 Bilibili 动态事件
 */
export function createBilibiliDynamicEvent(authorName: string, newData: BiliDynamic): Shark7Event | null {
    const msg = formatBilibiliDynamicInsert(newData);
    if (!msg) return null;
    return {
        ts: Number(new Date()),
        name: authorName,
        scope: Scope.Bilibili.Dynamic,
        msg
    };
}
