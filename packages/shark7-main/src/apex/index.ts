import { sendMsg } from "../khl"
import { MsgType } from "../model/model"
import { getTime } from "../utils";

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