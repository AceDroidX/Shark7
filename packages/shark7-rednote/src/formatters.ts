import type { Shark7Event } from "shark7-shared";
import type { RednoteUser, RednoteNoteDetail, RednoteComment } from "shark7-shared";
import { Scope } from "shark7-shared";
import type { IAtomicChange } from "json-diff-ts";

/**
 * 格式化小红书用户变更
 */
export function formatRednoteUserChanges(changes: IAtomicChange[], newData: RednoteUser): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const key = change.path.replace(/^\$\./, '');
        const value = change.value;
        
        if (JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}') {
            continue;
        }
        
        messages.push(`${key}更改\n原：${JSON.stringify(change.oldValue)}\n现：${JSON.stringify(value)}`);
    }
    
    return messages;
}

/**
 * 格式化小红书笔记插入
 */
export function formatRednoteNoteInsert(newData: RednoteNoteDetail): string {
    const typeMap: Record<string, string> = {
        'video': '小红书视频',
        'normal': '小红书动态'
    };
    const type = typeMap[newData.type] || newData.type;
    return `${type}\n${newData.title}\n${newData.desc}`;
}

/**
 * 格式化小红书评论插入
 */
export function formatRednoteCommentInsert(newData: RednoteComment): string {
    let msg = newData.content;
    if ('target_comment' in newData && newData.target_comment) {
        msg = `原评论<${newData.target_comment.user_info.nickname}>:\n${
            newData.target_comment.shark7_raw?.content ?? `评论获取失败:${newData.target_comment.id}`
        }\n回复:\n` + msg;
    }
    return msg;
}

/**
 * 创建小红书笔记事件
 */
export function createRednoteNoteEvent(nickname: string, newData: RednoteNoteDetail): Shark7Event | null {
    const msg = formatRednoteNoteInsert(newData);
    if (!msg) return null;
    return {
        ts: Number(new Date()),
        name: nickname,
        scope: Scope.Rednote.Note,
        msg
    };
}

/**
 * 创建小红书评论事件
 */
export function createRednoteCommentEvent(nickname: string, newData: RednoteComment): Shark7Event | null {
    const msg = formatRednoteCommentInsert(newData);
    return {
        ts: Number(new Date()),
        name: nickname,
        scope: Scope.Rednote.Comment,
        msg
    };
}
