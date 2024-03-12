import { ChangeStreamUpdateDocument } from "mongodb";
import { DouyinUser, Shark7Event } from "shark7-shared";
import { logger } from "shark7-shared";
import { Scope } from 'shark7-shared';
import { flattenObj } from "shark7-shared";
import { MongoController } from "./MongoController";

export async function onUserDBEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<DouyinUser>, origin?: DouyinUser): Promise<Shark7Event | null> {
    const user = event.fullDocument
    const updated = event.updateDescription.updatedFields
    if (!user) {
        logger.error(`fullDocument为${user}`)
        process.exit(1)
    }
    if (!updated) {
        logger.error(`updatedFields为${user}`)
        process.exit(1)
    }
    const flattenOrigin = flattenObj(origin)
    var result: string[] = [];
    Object.entries(updated).forEach(item => {
        const key = item[0]
        const value = item[1]
        if (key.startsWith('shark7_')) {
            return
        }
        const isSkip = ['cover_url', 'white_cover_url', 'share_info', 'urge_detail.ctl_map'].some(value => key.startsWith(value))
        if (isSkip) return
        if ((flattenOrigin[key] != null && value == null) || (flattenOrigin[key] == null && value != null)) {
            if(['city', 'commerce_user_info', 'country','ip_location','cover_and_head_image_info','general_permission',
            'life_story_block','original_musician','province','special_state_info','tab_settings',
            'urge_detail','video_icon','enable_ai_double'].some(value => key==value)) return
        }
        if (JSON.stringify(value) == '[]' || JSON.stringify(value) == '{}') {
            return
        }
        if (flattenOrigin[key] == value) {
            return
        }
        logger.info(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
        result.push(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
    })
    if (result.length == 0) return null
    return { ts: Number(new Date()), name: String(user.nickname), scope: Scope.Douyin.User, msg: result.join('\n') }
}
