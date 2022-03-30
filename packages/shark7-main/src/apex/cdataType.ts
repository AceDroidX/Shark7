
export function getSkinName(skinID: number) {
    switch (skinID) {
        case 275110190:
            return '随机最爱'
        case 493570024 || 845551255:
            return '初始'
        case 1685613493:
            return '虚空专家'
        default:
            return `未知(${skinID})`
    }
}

export function getFrameName(frameID: number) {
    switch (frameID) {
        case 635804049:
            return '空头陷阱'
        case 2057058469:
            return '新人卡'
        default:
            return `未知(${frameID})`
    }
}

export function getPosName(posID: number) {
    switch (posID) {
        case 1633864251:
            return '存在'
        case 2130577181:
            return '戒备'
        default:
            return `未知(${posID})`
    }
}

export function getBadgeName(badgeID: number): string {
    switch (badgeID) {
        case 1488777442:
            return "(空白)"
        default:
            return `未知(${badgeID})`
    }
}


export function getTracerName(tracerID: number): string {
    switch (tracerID) {
        case 663548666:
            return "造成伤害"
        case 1049917798 || 1509839340 || 1618935778:
            return "击杀"
        case 1905735931:
            return '暂无数据(空白)'
        case 2047429420:
            return '侦察行动'
        default:
            return `未知(${tracerID})`
    }
}

export function getIntroVoice(introVoiceID: number): string {
    switch (introVoiceID) {
        case 693676365:
            return "记住这张脸，我会来找你的"
        case 913787992:
            return "无"
        default:
            return `未知(${introVoiceID})`
    }
}