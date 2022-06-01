import { sendToKHL } from "./khl"

type KHLChannel = {
    id: string,
    include?: Rule[],
    exclude?: Rule[],
}

type Rule = {
    name?: string,
    scope?: string,
    msg?: string,
}

if (!process.env['khl_channels']) {
    console.error('khl_channels未设置')
    process.exit(1)
}

const channelConfig = JSON.parse(process.env['khl_channels']) as KHLChannel[]

export function sendMsgWithScope(formatedMsg: string, name: string, scope: string, msg: string) {
    for (let channel of channelConfig) {
        if (channel.exclude) {
            for (let rule of channel.exclude) {
                let matched = 0
                if (rule.name == name) matched++
                if (rule.scope && scope.startsWith(rule.scope)) matched++
                if (rule.msg && msg.includes(rule.msg)) matched++
                if (matched == Object.keys(rule).length) continue
            }
        }
        if (channel.include) {
            for (let rule of channel.include) {
                let matched = 0
                if (rule.name == name) matched++
                if (rule.scope && scope.startsWith(rule.scope)) matched++
                if (rule.msg && msg.includes(rule.msg)) matched++
                if (matched == Object.keys(rule).length) {
                    sendToKHL(formatedMsg, channel.id)
                }
            }
        } else {
            sendToKHL(formatedMsg, channel.id)
        }
    }
}