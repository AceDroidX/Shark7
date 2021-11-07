import { guardMain, isGuardOnline, makeURL } from "./guard";
import { GuardList } from "./model/GuardList";
import { Users } from "./model/Users";

var j = [
    {
        "uid": 350973938,
        "ruid": 434334701,
        "rank": 1,
        "username": "美少女球球子",
        "face": "http://i2.hdslb.com/bfs/face/3610caed996c4b173331750c25b8e7b9cb64b405.jpg",
        "is_alive": 0,
        "guard_level": 1,
        "guard_sub_level": 0,
        "medal_info": {
            "medal_name": "脆鲨",
            "medal_level": 30,
            "medal_color_start": 2951253,
            "medal_color_end": 10329087,
            "medal_color_border": 16771156
        }
    },
    {
        "uid": 611821,
        "ruid": 434334701,
        "rank": 2,
        "username": "リセマラ",
        "face": "http://i1.hdslb.com/bfs/face/1052100cc72196c0cb2c75e9396e91e9b79a011d.jpg",
        "is_alive": 1,
        "guard_level": 2,
        "guard_sub_level": 0,
        "medal_info": {
            "medal_name": "脆鲨",
            "medal_level": 31,
            "medal_color_start": 2951253,
            "medal_color_end": 10329087,
            "medal_color_border": 16771156
        }
    },
    {
        "uid": 369331,
        "ruid": 434334701,
        "rank": 3,
        "username": "真基の佬绅士",
        "face": "http://i1.hdslb.com/bfs/face/2b0666975e90e802d235f124ce69c390186a8a7e.jpg",
        "is_alive": 0,
        "guard_level": 2,
        "guard_sub_level": 0,
        "medal_info": {
            "medal_name": "脆鲨",
            "medal_level": 30,
            "medal_color_start": 2951253,
            "medal_color_end": 10329087,
            "medal_color_border": 16771156
        }
    }
]
// var gl = new GuardList(21452505, [39373763, 369331])
// console.log(gl.pageFilter(j))
// console.log(gl.competed())
// console.log(makeURL(21452505, 434334701, 1))
main2()
async function main1() {
    console.log(await isGuardOnline(21696950, 480680646, [39373763, 434334701]));   
}
async function main2() {
    const user=new Users()
    await user.addByUID(39373763)
    guardMain(user,new Users())
}