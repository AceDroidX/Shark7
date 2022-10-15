import { Shark7Event } from "shark7-shared"
import { FcmClient } from "./fcm"
import { sendEventToKHL } from "./khl"

type Channel = {
    id: string,
    include?: Rule[],
    exclude?: Rule[],
}

type Rule = {
    name?: string,
    scope?: string,
    msg?: string,
}

export function sendMsgToKHLByScope(event: Shark7Event) {
    if (!process.env['khl_channels']) {
        console.error('khl_channels未设置')
        process.exit(1)
    }
    const channelConfig = JSON.parse(process.env['khl_channels']) as Channel[]
    sendMsgByScope(event, channelConfig, sendEventToKHL)
}

export function sendMsgToFcmByScope(event: Shark7Event, fcm: FcmClient) {
    if (!process.env['fcm_channels']) {
        console.error('fcm_channels未设置')
        process.exit(1)
    }
    const channelConfig = JSON.parse(process.env['fcm_channels']) as Channel[]
    sendMsgByScope(event, channelConfig, fcm.sendEvent.bind(fcm))
}

export function sendMsgByScope(event: Shark7Event, channelConfig: Channel[], sendFunction: (event: Shark7Event, id: string) => void): void {
    channelLoop: for (let channel of channelConfig) {
        if (channel.exclude) {
            for (let rule of channel.exclude) {
                let matched = 0
                if (rule.name == event.name) matched++
                if (rule.scope && event.scope.startsWith(rule.scope)) matched++
                if (rule.msg && event.msg.includes(rule.msg)) matched++
                if (matched == Object.keys(rule).length) continue channelLoop
            }
        }
        if (channel.include) {
            for (let rule of channel.include) {
                let matched = 0
                if (rule.name == event.name) matched++
                if (rule.scope && event.scope.startsWith(rule.scope)) matched++
                if (rule.msg && event.msg.includes(rule.msg)) matched++
                if (matched == Object.keys(rule).length) {
                    sendFunction(event, channel.id)
                    continue channelLoop
                }
            }
        } else {
            if (event.scope.startsWith('Log')) continue channelLoop
            sendFunction(event, channel.id)
        }
    }
}
