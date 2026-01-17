import type { IAtomicChange } from "json-diff-ts";
import type { NeteaseMusicUser } from "shark7-shared";

/**
 * 格式化网易云音乐用户变更
 */
export function formatNeteaseMusicUserChanges(changes: IAtomicChange[], newData: NeteaseMusicUser): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;
        
        switch (key) {
            case 'userPoint.updateTime':
            case 'profile.privacyItemUnlimit.gender':
                continue;
        }
        
        if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
            if (key === 'ip') continue;
        }
        
        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') continue;
        
        messages.push(`${key}更改\n原：${JSON.stringify(oldValue)}\n现：${JSON.stringify(value)}`);
    }
    
    return messages;
}
