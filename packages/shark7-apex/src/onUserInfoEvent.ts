import { ChangeStreamUpdateDocument } from 'mongodb';
import { Shark7Event } from 'shark7-shared'
import { Scope } from 'shark7-shared/dist/scope'
import logger from 'shark7-shared/dist/logger';
import { getBadgeName, getFrameName, getIntroVoice, getPosName, getSkinName, getTracerName } from "./cdataType";
import { ApexUserInfo } from 'shark7-shared/dist/apex';
import { MongoController } from './MongoController';

export async function onUserInfoEvent(ctr: MongoController, event: ChangeStreamUpdateDocument, origin: ApexUserInfo | null): Promise<Shark7Event | null> {
    if (!event.fullDocument) {
        logger.error('event.fullDocument为空')
        process.exit(1)
    }
    const displayName = event.fullDocument.shark7_name
    const updated = event.updateDescription.updatedFields
    let msg = ''
    for (const field in updated) {
        if (field.startsWith('shark7_')) {
            continue
        }
        switch (field) {
            case 'name':
                msg += `\n用户名改变: ${updated[field]}`
                break;
            case 'rankScore':
                msg += `\n排位分数改变: ${updated[field]}`
                break;
            case 'arenaScore':
                msg += `\n竞技场分数改变: ${updated[field]}`
                break;
            case 'privacy':
                msg += `\n群隐私改变: ${updated[field]}`
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
                msg += `\n在线状态改变: ${onlineStatus}`
                break;
            case 'joinable':
                msg += `\n可加入状态改变: ${updated[field]}`
                break;
            case 'partyFull':
                msg += `\n群满员状态改变: ${updated[field]}`
                break;
            case 'partyInMatch':
                msg += `\n比赛状态改变: ${updated[field]}`
                break;
            case 'charVer':
                break;
            case 'cdata3':
                const skinName = getSkinName(updated[field])
                msg += `\n皮肤改变: ${skinName}`
                break;
            case 'cdata4':
                const frameName = getFrameName(updated[field])
                msg += `\n边框改变: ${frameName}`
                break;
            case 'cdata5':
                const posName = getPosName(updated[field])
                msg += `\n姿势改变: ${posName}`
                break;
            case 'cdata6':
            case 'cdata8':
            case 'cdata10':
                let badgeName = getBadgeName(updated[field])
                msg += `\n第${parseInt(field.replace('cdata', '')) / 2 - 2}个徽章类型改变: ${badgeName}`
                break;
            case 'cdata7':
            case 'cdata9':
            case 'cdata11':
                msg += `\n第${(parseInt(field.replace('cdata', '')) - 1) / 2 - 2}个徽章数据改变: ${updated[field]}`
                break;
            case 'cdata12':
            case 'cdata14':
            case 'cdata16':
                let tracerName = getTracerName(updated[field])
                msg += `\n第${parseInt(field.slice(-1)) / 2}个追踪器类型改变: ${tracerName}`
                break;
            case 'cdata13':
            case 'cdata15':
            case 'cdata17':
                msg += `\n第${(parseInt(field.slice(-1)) - 1) / 2}个追踪器数据改变: ${updated[field]}`
                break;
            case 'cdata18':
                const introVoice = getIntroVoice(updated[field])
                msg += `\n开场台词改变: ${introVoice}`
            case 'cdata23':
                msg += `\n玩家等级改变: ${updated[field]}`
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
                msg += `\n游戏状态改变: ${gameStatus}`
                break;
            case 'timeSinceServerChange':
                break;
            default:
                msg += `\n未知数据改变: ${field}: ${updated[field]}`
                break;
        }
    }
    if (msg !== '') {
        const time = Number(new Date())
        msg = msg.trimStart()
        return { ts: time, name: displayName, scope: Scope.Apex, msg }
    } else {
        return null
    }
}
