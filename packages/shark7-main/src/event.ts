import { Shark7Event } from "shark7-shared";
import { getTime } from "shark7-shared/dist/utils";
import { sendMsg } from "./khl";

export function sendEvent(event: Shark7Event) {
    const msg = `[${getTime(event.ts)}]<${event.name}>(${event.scope})\n${event.msg}`
    sendMsg(msg)
}