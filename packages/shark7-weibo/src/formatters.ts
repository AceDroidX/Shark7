import type { Shark7Event } from "shark7-shared";
import type { WeiboUser, WeiboMsg, WeiboComment } from "shark7-shared";
import { Scope } from "shark7-shared";
import type { IAtomicChange } from "json-diff-ts";

/**
 * 格式化微博用户变更
 */
export function formatWeiboUserChanges(changes: IAtomicChange[], newData: WeiboUser): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;

        if (value === null && oldValue === undefined || value === undefined && oldValue === null) {
            continue;
        }
        
        if (key === 'screen_name') {
            messages.push(`微博昵称更改\n原：${oldValue}\n现：${value}`);
        } else if (key === 'avatar_hd') {
            messages.push(`微博头像更改\n原：${oldValue}\n现：\n${value}`);
        } else if (key === 'friends_count') {
            messages.push(`微博关注数更改\n原：${oldValue}\n现：${value}`);
        } else if (key === 'statuses_count') {
            messages.push(`微博数量更改\n原：${oldValue}\n现：${value}`);
        } else if (key === 'description') {
            messages.push(`微博简介更改\n原：${oldValue}\n现：${value}`);
        } else if (key === 'verified_reason') {
            messages.push(`微博认证更改\n原：${oldValue}\n现：${value}`);
        }
    }
    
    return messages;
}

/**
 * 格式化微博动态插入
 */
export function formatWeiboMblogInsert(newData: WeiboMsg, targetUserName?: string): string {
    const userName = targetUserName || newData.user.screen_name;
    
    if (newData.user.id !== newData._userid) {
        if (newData.title?.includes('赞过的微博')) {
            return '';
        }
        return `${newData.title}:${newData.user.screen_name}\n${newData.text_raw}`;
    }
    
    if (newData.visible_type === 0) {
        if (newData.repost_type === 1) {
            return `微博转发\n${newData.text_raw}`;
        }
        return `微博动态\n${newData.text_raw}`;
    } else if (newData.visible_type === 10) {
        if (newData.repost_type === 1) {
            return `微博仅粉丝可见转发\n${newData.text_raw}`;
        }
        return `微博仅粉丝可见动态\n${newData.text_raw}`;
    }
    
    return `微博动态(visible_type=${newData.visible_type})\n${newData.text_raw}`;
}

/**
 * 格式化微博评论更新
 */
export function formatWeiboCommentChanges(changes: IAtomicChange[], newData: WeiboComment): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        if (key === 'text' && change.value !== undefined) {
            const msg = `评论更改\n原：${change.oldValue}\n现：${change.value}`;
            messages.push(msg);
        }
    }
    
    return messages;
}

/**
 * 格式化微博动态更新
 */
export function formatWeiboMblogChanges(changes: IAtomicChange[], newData: WeiboMsg): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        if (key === 'text_raw' && change.value !== undefined) {
            const msg = `微博更改\n原：${change.oldValue}\n现：${change.value}`;
            messages.push(msg);
        }
    }
    
    return messages;
}

/**
 * 格式化微博评论插入
 */
export function formatWeiboCommentInsert(newData: WeiboComment): string {
    let msg = newData.text_raw;
    if (newData.reply_comment) {
        msg = `原评论<${newData.reply_comment.user.screen_name}>:\n${newData.reply_comment.text}\n回复:\n` + msg;
    }
    return msg;
}

/**
 * 创建微博动态事件
 */
export function createWeiboMblogEvent(targetUserName: string, newData: WeiboMsg): Shark7Event | null {
    const msg = formatWeiboMblogInsert(newData, targetUserName);
    if (!msg) return null;
    return {
        ts: Number(new Date()),
        name: targetUserName || newData.user.screen_name,
        scope: Scope.Weibo.Mblog,
        msg
    };
}

/**
 * 创建微博评论事件
 */
export function createWeiboCommentEvent(screenName: string, newData: WeiboComment): Shark7Event | null {
    const msg = formatWeiboCommentInsert(newData);
    return {
        ts: Number(new Date()),
        name: screenName,
        scope: Scope.Weibo.Comment,
        msg
    };
}
