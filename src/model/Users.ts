import { User } from "./User";
import axios from "axios";

export class Users {
    users: User[];
    constructor() {
        this.users = [];
    }
    async addByUID(uid: number) {
        this.users.push(await new User().initByUID(uid));
        return this
    }
    async addByRoomid(roomid: number) {
        this.users.push(await new User().initByRoomid(roomid));
        return this
    }
    getUserByUID(uid: number): User {
        const result = this.users.find(user => user.uid === uid);
        if (result != undefined) {
            return result
        }else{
            return new User().init(0,'未找到用户',0)
        }
    }
    toString() {
        return this.users.map(user => user.toString()).join("\n");
    }
}