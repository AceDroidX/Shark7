import { UpdateTypeDoc } from ".."

export type ReckfengApi = {
    status: number,
    data: {
        total: number,
        rows: ReckfengData[],
    }
}

export type ReckfengData = UpdateTypeDoc & typeof ReckfengDataDemo & {
    "severData": typeof ReckfengServerDataDemo[],
}

const ReckfengDataDemo = {
    "playerGuid": 31999265,
    "mapId": 59,
    "mapName": "宠物防御战",
    "lastplayed": "8分钟前",
    "logo": "https://up5.nosdn.127.net/upload/c8e96f12ea3da6be4374356dc0d6acfe.jpg",
    "bigLogo": "",
    "mapLv": 2,
    "mapPre": 83,
    "playedTimes": 10,
    "mapExp": 12566,
    "ranking": 0,
    "lastplayedSecond": 517,
    "updateTime": "2023-04-20 23:47:24",
    "createTime": "2023-04-03 23:34:37",
    "mapType": "3",
    "gameEngine": "war3",
}

const ReckfengServerDataDemo = {
    "mapId": 59,
    "fieldId": 1,
    "playerGuid": 0,
    "statKey": "CFcc",
    "description": "场次",
    "value": "4"
}
