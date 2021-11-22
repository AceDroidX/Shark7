import axios from 'axios';
import logger from '../logger';
import { User } from './User';
import { guardlist_prefix } from '../constants'

export class RoomGuard extends User {
    list: GuardState[] = [];
    marked_uid: number[];
    competed(): boolean {
        return this.list.length == this.marked_uid.length;
    }
    isUIDinMarkList(uid: number): boolean {
        // return this.marked_uid.indexOf(uid) != -1;
        return this.marked_uid.includes(uid);
    }
    async addGuardState(uid: number, isOnline: number) {
        this.list.push(new GuardState(await new User().initByUID(uid), isOnline));
        // let guardstate = this.list.find(item => item.uid == uid)
        // if (guardstate == undefined) {
        //     this.list.push(new GuardState(await new User().initByUID(uid), isOnline));
        // } else {
        //     guardstate.isOnline = isOnline;
        // }
    }
    async fillEmpty() {
        for (const uid of this.marked_uid) {
            if (this.list.findIndex(item => item.uid == uid) == -1) {
                await this.addGuardState(uid, 2)
            }
        }
    }
    async pageFilter(page: any) {
        for (const element of page) {
            if (this.isUIDinMarkList(element['uid'])) {
                logger.debug(`pageFilter:${JSON.stringify(element)}`)
                await this.addGuardState(element['uid'], element.is_alive);
                logger.debug(`uid:${element['uid']} is_alive:${element.is_alive}`);
                if (this.competed()) {
                    return this; //跳出遍历
                }
            }
        }
        return this;
    }
    async isGuardOnline(): Promise<RoomGuard> {
        this.list = []
        const PAGE_LIMIT = 30
        var pages = 1
        for (let i = 1; i <= pages && i <= PAGE_LIMIT; i++) {
            var response = await axios.get(makeURL(this.roomid, this.uid, i))
            // logger.log(response.data)
            logger.debug(`roomid:${this.roomid} page:${i}`)
            pages = response.data['data']['info']['page']
            if (i == 1) {
                logger.debug(`pages:${pages}`)
                if ((await this.pageFilter(response.data['data']['top3'])).competed()) return this
            }
            if ((await this.pageFilter(response.data['data']['list'])).competed()) return this
            await new Promise(resolve => { setTimeout(resolve, 500) })
        }
        await this.fillEmpty()
        return this
    }
    constructor(user: User, marked_uid: number[]) {
        super();
        this.uid = user.uid;
        this.name = user.name;
        this.roomid = user.roomid;
        this.marked_uid = marked_uid;
    }
}

export class GuardState extends User {
    // 2: 未找到(不是舰长)
    // 1: 在线
    // 0: 不在线
    isOnline: number;
    constructor(user: User, isOnline: number) {
        super();
        this.uid = user.uid;
        this.name = user.name;
        this.roomid = user.roomid;
        this.isOnline = isOnline;
    }
    toString(): string {
        return `${this.name}:${this.uid}/${this.roomid}-isOnline:${this.isOnline}`
    }
}

function makeURL(roomid: number, ruid: number, page: number) {
    return `${guardlist_prefix}&roomid=${roomid}&ruid=${ruid}&page=${page}`
}