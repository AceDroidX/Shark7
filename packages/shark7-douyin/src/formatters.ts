import type { IAtomicChange } from "json-diff-ts";
import type { DouyinUser } from "shark7-shared";

/**
 * 格式化抖音用户变更
 */
export function formatDouyinUserChanges(changes: IAtomicChange[], newData: DouyinUser): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        const oldValue = change.oldValue;
        
        const skipPrefixes = ['cover_url', 'white_cover_url', 'share_info', 'urge_detail.ctl_map', 'story_ring.version'];
        if (skipPrefixes.some(prefix => key.startsWith(prefix))) continue;
        
        const skipFields = ['city', 'commerce_user_info', 'country', 'ip_location', 'cover_and_head_image_info', 
                          'general_permission', 'life_story_block', 'original_musician', 'province', 
                          'special_state_info', 'tab_settings', 'urge_detail', 'video_icon', 
                          'enable_ai_double', 'profile_show', 'social_real_relation_type', 
                          'mate_relation', 'profile_component_disabled', 'profile_mob_params', 
                          'profile_tab_info', 'story_ring'];
        if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
            if (skipFields.includes(key)) continue;
        }
        
        if ((oldValue != null && value == null) || (oldValue == null && value != null)) {
            const skipNested = ['cover_and_head_image_info.profile_cover_list'];
            if (skipNested.some(prefix => key.startsWith(prefix))) continue;
        }
        
        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') continue;
        
        messages.push(`${key}更改\n原：${JSON.stringify(oldValue)}\n现：${JSON.stringify(value)}`);
    }
    
    return messages;
}
