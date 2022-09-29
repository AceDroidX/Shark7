import { InsertTypeDoc } from ".."

export type BiliDynamic = InsertTypeDoc & typeof BiliDynamicDemo & {
    orig?: BiliDynamic
    'modules': modules
}

const module_author_demo = {
    "decorate": {
        "card_url": "http://i0.hdslb.com/bfs/garb/item/172987b87aef8968971a89de2e798294ca8ce622.png",
        "fan": {
            "color": "#f49daf",
            "is_fan": true,
            "num_str": "000001",
            "number": 1
        },
        "id": 36319,
        "jump_url": "https://www.bilibili.com/h5/mall/fans/recommend/36352?navhide=1\u0026mid=434334701\u0026from=dynamic\u0026isdiy=0",
        "name": "七海地雷套装粉丝",
        "type": 3
    },
    "face": "http://i2.hdslb.com/bfs/face/bdd2895d83cb67ca33ef651e1d7eb5e96e220545.jpg",
    "face_nft": false,
    "following": true,
    "jump_url": "//space.bilibili.com/434334701/dynamic",
    "label": "",
    "mid": 434334701,
    "name": "七海Nana7mi",
    "official_verify": {
        "desc": "",
        "type": 0
    },
    "pendant": {
        "expire": 0,
        "image": "",
        "image_enhance": "",
        "image_enhance_frame": "",
        "name": "",
        "pid": 0
    },
    "pub_action": "",
    "pub_location_text": "",
    "pub_time": "07-17",
    "pub_ts": 1658060852,
    "type": "AUTHOR_TYPE_NORMAL",
    "vip": {
        "avatar_subscript": 1,
        "avatar_subscript_url": "",
        "due_date": 1697817600000,
        "label": {
            "bg_color": "#FB7299",
            "bg_style": 1,
            "border_color": "",
            "img_label_uri_hans": "",
            "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/8d4f8bfc713826a5412a0a27eaaac4d6b9ede1d9.png",
            "img_label_uri_hant": "",
            "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/VEW8fCC0hg.png",
            "label_theme": "annual_vip",
            "path": "",
            "text": "年度大会员",
            "text_color": "#FFFFFF",
            "use_img_label": true
        },
        "nickname_color": "#FB7299",
        "status": 1,
        "theme_type": 0,
        "type": 2
    }
}

const module_dynamic_desc_demo = {
    "rich_text_nodes": [
        {
            "orig_text": "互动抽奖",
            "rid": "100997",
            "text": "互动抽奖",
            "type": "RICH_TEXT_NODE_TYPE_LOTTERY"
        },
        {
            "orig_text": " \n🎁转发这条动态+关注我",
            "text": " \n🎁转发这条动态+关注我",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        },
        {
            "orig_text": "@七海Nana7mi",
            "rid": "434334701",
            "text": "@七海Nana7mi",
            "type": "RICH_TEXT_NODE_TYPE_AT"
        },
        {
            "orig_text": " 会在8月15日19:00抽出1位获得💰773元现金💰、3位获得七海的七月生日舰长周边礼物一套",
            "text": " 会在8月15日19:00抽出1位获得💰773元现金💰、3位获得七海的七月生日舰长周边礼物一套",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        },
        {
            "emoji": {
                "icon_url": "http://i0.hdslb.com/bfs/emote/4e6617256d792c51359887dd03d8b3689a0aee2f.png",
                "size": 2,
                "text": "[七海地雷套装_respect]",
                "type": 3
            },
            "orig_text": "[七海地雷套装_respect]",
            "text": "[七海地雷套装_respect]",
            "type": "RICH_TEXT_NODE_TYPE_EMOJI"
        },
        {
            "orig_text": "\r\n顺便！本月【15-19日】上舰的话就可以获得图里的四样周边！包括一直以来七海戴在头上的笑脸发卡",
            "text": "\r\n顺便！本月【15-19日】上舰的话就可以获得图里的四样周边！包括一直以来七海戴在头上的笑脸发卡",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        },
        {
            "emoji": {
                "icon_url": "http://i0.hdslb.com/bfs/emote/2e30ed58197b455ac4a204e44e571a4c0d29b061.png",
                "size": 2,
                "text": "[七海地雷套装_呲牙]",
                "type": 3
            },
            "orig_text": "[七海地雷套装_呲牙]",
            "text": "[七海地雷套装_呲牙]",
            "type": "RICH_TEXT_NODE_TYPE_EMOJI"
        },
        {
            "orig_text": "、这次新衣服抱着的鲨鱼抱枕",
            "text": "、这次新衣服抱着的鲨鱼抱枕",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        },
        {
            "emoji": {
                "icon_url": "http://i0.hdslb.com/bfs/emote/7d41d3052fd5a15a66341a827ba74e0f6a748a84.png",
                "size": 2,
                "text": "[七海地雷套装_鲨鱼开心]",
                "type": 3
            },
            "orig_text": "[七海地雷套装_鲨鱼开心]",
            "text": "[七海地雷套装_鲨鱼开心]",
            "type": "RICH_TEXT_NODE_TYPE_EMOJI"
        },
        {
            "orig_text": "、还有新衣服的亚克力砖和圆形徽章哦",
            "text": "、还有新衣服的亚克力砖和圆形徽章哦",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        },
        {
            "emoji": {
                "icon_url": "http://i0.hdslb.com/bfs/emote/b626ada27b337382eb10b4753e638ef71de1cc8a.png",
                "size": 2,
                "text": "[七海地雷套装_run了]",
                "type": 3
            },
            "orig_text": "[七海地雷套装_run了]",
            "text": "[七海地雷套装_run了]",
            "type": "RICH_TEXT_NODE_TYPE_EMOJI"
        },
        {
            "orig_text": "提督还有to签！",
            "text": "提督还有to签！",
            "type": "RICH_TEXT_NODE_TYPE_TEXT"
        }
    ],
    "text": "互动抽奖 \n🎁转发这条动态+关注我@七海Nana7mi 会在8月15日19:00抽出1位获得💰773元现金💰、3位获得七海的七月生日舰长周边礼物一套[七海地雷套装_respect]\r\n顺便！本月【15-19日】上舰的话就可以获得图里的四样周边！包括一直以来七海戴在头上的笑脸发卡[七海地雷套装_呲牙]、这次新衣服抱着的鲨鱼抱枕[七海地雷套装_鲨鱼开心]、还有新衣服的亚克力砖和圆形徽章哦[七海地雷套装_run了]提督还有to签！"
}

const MAJOR_TYPE_DRAW_demo = {
    "draw": {
        "id": 200585144,
        "items": [
            {
                "height": 2250,
                "size": 8782.38,
                "src": "https://i0.hdslb.com/bfs/new_dyn/1d2623e23047bc7fde75a8ba0c347835434334701.png",
                "tags": [],
                "width": 4000
            }
        ]
    }
}

const MAJOR_TYPE_ARCHIVE_demo = {
    "archive": {
        "aid": "473301428",
        "badge": {
            "bg_color": "#FB7299",
            "color": "#FFFFFF",
            "text": "合作视频"
        },
        "bvid": "BV1aT411T7ma",
        "cover": "http://i2.hdslb.com/bfs/archive/26b4a7e6d69315d78d15a038d4f9923331ec229f.jpg",
        "desc": "我们的夏天永不落幕！\n\n出品：VirtuaReal",
        "disable_preview": 0,
        "duration_text": "03:10",
        "jump_url": "//www.bilibili.com/video/BV1aT411T7ma",
        "stat": {
            "danmaku": "68",
            "play": "2.4万"
        },
        "title": "【艾因x七海x真绯瑠x雪绘x茶冷x茉里】ようこそジャパリパークへ【夏日合唱Super】",
        "type": 1
    }
}

const module_dynamic_demo = {
    "additional": null,
    "topic": null
}

type major = { type: "MAJOR_TYPE_DRAW" } & typeof MAJOR_TYPE_DRAW_demo | { type: 'MAJOR_TYPE_ARCHIVE' } & typeof MAJOR_TYPE_ARCHIVE_demo

type module_dynamic = typeof module_dynamic_demo & {
    desc?: typeof module_dynamic_desc_demo
    major: major
}

const modules_demo = {
    "module_author": module_author_demo,
    "module_interaction": {
        "items": [
            {
                "desc": {
                    "rich_text_nodes": [
                        {
                            "orig_text": "问问c的奇妙生活：",
                            "rid": "411609219",
                            "text": "问问c的奇妙生活：",
                            "type": "RICH_TEXT_NODE_TYPE_AT"
                        },
                        {
                            "orig_text": "上海富婆v我五十",
                            "text": "上海富婆v我五十",
                            "type": "RICH_TEXT_NODE_TYPE_TEXT"
                        }
                    ],
                    "text": "上海富婆v我五十"
                },
                "type": 1
            }
        ]
    },
    "module_more": {
        "three_point_items": [
            {
                "label": "举报",
                "type": "THREE_POINT_REPORT"
            }
        ]
    },
    "module_stat": {
        "comment": {
            "count": 2257,
            "forbidden": false
        },
        "forward": {
            "count": 18445,
            "forbidden": false
        },
        "like": {
            "count": 8372,
            "forbidden": false,
            "status": true
        }
    },
    "module_tag": {
        "text": "置顶"
    }
}

type modules = typeof modules_demo & { module_dynamic: module_dynamic }

const BiliDynamicDemo = {
    "basic": {
        "comment_id_str": "200585144",
        "comment_type": 11,
        "like_icon": {
            "action_url": "http://i0.hdslb.com/bfs/garb/item/912c8b49920848300eb80769afb88edf10b655e7.bin",
            "end_url": "",
            "id": 36320,
            "start_url": ""
        },
        "rid_str": "200585144"
    },
    "id_str": "683855224370102307",
    "type": "DYNAMIC_TYPE_DRAW",
    "visible": true
}
