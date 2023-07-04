import { DouyinUser } from "shark7-shared"

const DouyinApiDemo = {
    "extra": {
        "fatal_item_ids": [],
        "logid": "20230703230300FB48A05991AAAAAAAAAA",
        "now": 1688396580000
    },
    "log_pb": {
        "impr_id": "20230703230300FB48A05991AAAAAAAAAA"
    },
    "status_code": 0,
    "status_msg": null
}

// TODO: Refactor this with Conditional Types
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html

type DouyinApi = typeof DouyinApiDemo

export type DouyinUserApi = DouyinApi & {
    user: DouyinUser
}
