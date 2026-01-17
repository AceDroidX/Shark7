import type { Shark7Event } from "shark7-shared";
import type { ApexUserInfo } from "shark7-shared";
import type { IAtomicChange } from "json-diff-ts";
import { getBadgeName, getFrameName, getIntroVoice, getPosName, getSkinName } from "./cdataType.ts";
import { LegendName, TracerName, getKeyByValue } from "./cdataTypeMap.ts";

/**
 * 格式化 Apex 用户变更
 */
export function formatApexUserChanges(changes: IAtomicChange[], newData: ApexUserInfo): string[] {
    const messages: string[] = [];
    
    for (const change of changes) {
        const path = change.path.replace(/^\$\./, '');
        const newVal = change.value;
        
        switch (path) {
            case 'name':
                messages.push(`用户名改变: ${newVal}`);
                break;
            case 'rankScore':
                messages.push(`排位分数改变: ${newVal}`);
                break;
            case 'arenaScore':
                messages.push(`竞技场分数改变: ${newVal}`);
                break;
            case 'privacy':
                messages.push(`群隐私改变: ${newVal}`);
                break;
            case 'online':
                const onlineStatus = newVal === 0 ? '离线' : newVal === 1 ? '在线' : `未知${newVal}`;
                messages.push(`在线状态改变: ${onlineStatus}`);
                break;
            case 'joinable':
                messages.push(`可加入状态改变: ${newVal}`);
                break;
            case 'partyFull':
                messages.push(`群满员状态改变: ${newVal}`);
                break;
            case 'partyInMatch':
                messages.push(`比赛状态改变: ${newVal}`);
                break;
            case 'charVer':
            case 'timeSinceServerChange':
                break;
            case 'cdata2':
                messages.push(`英雄改变: ${getKeyByValue(newVal, LegendName)}`);
                break;
            case 'cdata3':
                messages.push(`皮肤改变: ${getSkinName(newVal)}`);
                break;
            case 'cdata4':
                messages.push(`边框改变: ${getFrameName(newVal)}`);
                break;
            case 'cdata5':
                messages.push(`姿势改变: ${getPosName(newVal)}`);
                break;
            case 'cdata6':
            case 'cdata8':
            case 'cdata10':
                messages.push(`第${parseInt(path.replace('cdata', '')) / 2 - 2}个徽章类型改变: ${getBadgeName(newVal)}`);
                break;
            case 'cdata7':
            case 'cdata9':
            case 'cdata11':
                messages.push(`第${(parseInt(path.replace('cdata', '')) - 1) / 2 - 2}个徽章数据改变: ${newVal}`);
                break;
            case 'cdata12':
            case 'cdata14':
            case 'cdata16':
                messages.push(`第${parseInt(path.slice(-1)) / 2}个追踪器类型改变: ${getKeyByValue(newVal, TracerName)}`);
                break;
            case 'cdata13':
            case 'cdata15':
            case 'cdata17':
                messages.push(`第${(parseInt(path.slice(-1)) - 1) / 2}个追踪器数据改变: ${newVal}`);
                break;
            case 'cdata18':
                messages.push(`开场台词改变: ${getIntroVoice(newVal)}`);
                break;
            case 'cdata23':
                messages.push(`玩家等级改变: ${newVal}`);
                break;
            case 'cdata31':
                const gameStatus = newVal === 0 ? '大厅在线' : newVal === 1 ? '游戏中' : `未知${newVal}`;
                messages.push(`游戏状态改变: ${gameStatus}`);
                break;
            default:
                messages.push(`未知数据改变: ${path}: ${newVal}`);
                break;
        }
    }
    
    return messages;
}
