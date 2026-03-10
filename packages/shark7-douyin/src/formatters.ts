import type { IAtomicChange } from "json-diff-ts";
import type { DouyinUser } from "shark7-shared";

/**
 * 格式化抖音用户变更
 */
export function formatDouyinUserChanges(changes: IAtomicChange[], newData: DouyinUser): string[] {
    const messages: string[] = [];

    const normalizeDouyinpicUrl = (url: string): string => {
        return url.replace(/https?:\/\/[^/]*douyinpic\.com([^?]*)(?:\?.*)?/, 'douyinpic.com$1');
    };

    const normalizeValue = (input: unknown): unknown => {
        if (typeof input === 'string') {
            return normalizeDouyinpicUrl(input);
        }

        if (Array.isArray(input)) {
            return input.map(item => normalizeValue(item));
        }

        if (input && typeof input === 'object') {
            const normalized: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(input)) {
                normalized[key] = normalizeValue(value);
            }
            return normalized;
        }

        return input;
    };
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;

        // douyinpic URL规范化处理
        const normalizedValue = normalizeValue(value);
        const normalizedOldValue = normalizeValue(oldValue);

        if (JSON.stringify(normalizedValue) === JSON.stringify(normalizedOldValue)) {
            continue;
        }
        
        const skipPrefixes = ['share_info', 'urge_detail'];
        if (skipPrefixes.some(prefix => key.startsWith(prefix))) continue;
        
        const skipFieldsIfNull = ['ip_location'];
        if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
            if (skipFieldsIfNull.includes(key)) continue;
        }
        
        // if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
        //     const skipNested = ['cover_and_head_image_info.profile_cover_list'];
        //     if (skipNested.some(prefix => key.startsWith(prefix))) continue;
        // }

        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') continue;
        
        messages.push(`${key}更改\n原：${JSON.stringify(oldValue)}\n现：${JSON.stringify(value)}`);
    }
    
    return messages;
}
