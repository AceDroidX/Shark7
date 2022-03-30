import { sendMsg } from "../khl"
import { MsgType } from "../model/model"
import { getTime } from "../utils";
import { getBadgeName, getFrameName, getIntroVoice, getPosName, getSkinName, getTracerName } from "./cdataType";

export function onUserInfoEvent(event: any) {
    const displayName = event.fullDocument._name
    const updated = event.updateDescription.updatedFields
    for (const field in updated) {
        if (field.startsWith('_')) {
            continue
        }
        switch (field) {
            case 'name':
                sendMsg(`[${getTime()}]<${displayName}>用户名改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'rankScore':
                sendMsg(`[${getTime()}]<${displayName}>排位分数改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'arenaScore':
                sendMsg(`[${getTime()}]<${displayName}>竞技场分数改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'privacy':
                sendMsg(`[${getTime()}]<${displayName}>群隐私改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'online':
                let onlineStatus
                if (updated[field] == 0) {
                    onlineStatus = '离线'
                } else if (updated[field] == 1) {
                    onlineStatus = '在线'
                } else {
                    onlineStatus = `未知${updated[field]}`
                }
                sendMsg(`[${getTime()}]<${displayName}>在线状态改变: ${onlineStatus}`, MsgType.apex)
                break;
            case 'joinable':
                sendMsg(`[${getTime()}]<${displayName}>可加入状态改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'partyFull':
                sendMsg(`[${getTime()}]<${displayName}>群满员状态改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'partyInMatch':
                sendMsg(`[${getTime()}]<${displayName}>比赛状态改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'charVer':
                break;
            case 'cdata3':
                const skinName = getSkinName(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>皮肤改变: ${skinName}`, MsgType.apex)
                break;
            case 'cdata4':
                const frameName = getFrameName(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>边框改变: ${frameName}`, MsgType.apex)
                break;
            case 'cdata5':
                const posName = getPosName(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>姿势改变: ${posName}`, MsgType.apex)
                break;
            case 'cdata6':
            case 'cdata8':
            case 'cdata10':
                let badgeName = getBadgeName(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>第${parseInt(field.replace('cdata', '')) / 2 - 2}个徽章类型改变: ${badgeName}`, MsgType.apex)
                break;
            case 'cdata7':
            case 'cdata9':
            case 'cdata11':
                sendMsg(`[${getTime()}]<${displayName}>第${(parseInt(field.replace('cdata', '')) - 1) / 2 - 2}个徽章数据改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'cdata12':
            case 'cdata14':
            case 'cdata16':
                let tracerName = getTracerName(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>第${parseInt(field.slice(-1)) / 2}个追踪器类型改变: ${tracerName}`, MsgType.apex)
                break;
            case 'cdata13':
            case 'cdata15':
            case 'cdata17':
                sendMsg(`[${getTime()}]<${displayName}>第${(parseInt(field.slice(-1)) - 1) / 2}个追踪器数据改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'cdata18':
                const introVoice = getIntroVoice(updated[field])
                sendMsg(`[${getTime()}]<${displayName}>开场台词改变: ${introVoice}`, MsgType.apex)
            case 'cdata23':
                sendMsg(`[${getTime()}]<${displayName}>玩家等级改变: ${updated[field]}`, MsgType.apex)
                break;
            case 'cdata31':
                let gameStatus
                if (updated[field] == 0) {
                    gameStatus = '大厅在线'
                } else if (updated[field] == 1) {
                    gameStatus = '游戏中'
                } else {
                    gameStatus = `未知${updated[field]}`
                }
                sendMsg(`[${getTime()}]<${displayName}>游戏状态改变: ${gameStatus}`, MsgType.apex)
                break;
            case 'timeSinceServerChange':
                break;
            default:
                sendMsg(`[${getTime()}]<${displayName}>未知数据改变: ${field}: ${updated[field]}`, MsgType.apex)
                break;
        }
    }
}