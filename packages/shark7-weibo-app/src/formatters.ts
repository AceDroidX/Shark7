import type { IAtomicChange } from "json-diff-ts";
import type { WeiboMsg, OnlineData } from "shark7-shared";
import { Scope } from "shark7-shared";

/**
 * 格式化微博点赞状态变更
 */
export function formatWeiboOnlineChanges(changes: IAtomicChange[], newData: OnlineData): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;
        
        if (key === 'online' && value !== undefined) {
            const onlineStatus = value === 1 ? '在线' : value === 0 ? '离线' : `未知${value}`;
            messages.push(`微博在线状态改变: ${onlineStatus}`);
        }
        if (key === 'desc1' && value !== undefined) {
            messages.push(`微博签名改变\n原：${oldValue}\n现：${value}`);
        }
    }
    
    return messages;
}
