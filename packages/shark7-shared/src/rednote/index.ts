import type { Shark7Doc } from "..";

const RednoteUserDemo = {
    result: {
        success: true,
        code: 0,
        message: "success",
    },
    basic_info: {
        desc: "",
        imageb: "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo319qdbqt8ng0g5n2vnku4j33uunie450?imageView2/2/w/540/format/webp",
        nickname: "11111111111111111",
        images: "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo319qdbqt8ng0g5n2vnku4j33uunie450?imageView2/2/w/360/format/webp",
        red_id: "1111111111111111",
        gender: 0,
        ip_location: "日本",
    },
    interactions: [
        {
            type: "follows",
            name: "关注",
            count: "37",
        },
        {
            name: "粉丝",
            count: "899",
            type: "fans",
        },
        {
            type: "interaction",
            name: "获赞与收藏",
            count: "345",
        },
    ],
    tags: [
        {
            icon: "http://ci.xiaohongshu.com/icons/user/gender-male-v1.png",
            name: "750岁",
            tagType: "info",
        },
    ],
    tab_public: {
        collection: false,
        collectionNote: {
            display: false,
            lock: false,
            count: 0,
        },
        collectionBoard: {
            display: false,
            lock: false,
            count: 0,
        },
    },
    extra_info: {
        fstatus: "follows",
        blockType: "DEFAULT",
    },
};
export type RednoteUser = Shark7Doc & typeof RednoteUserDemo;

// /api/sns/web/v1/user_posted
const RednoteNoteDemo = {
    note_id: "1111111111111111111111111",
    xsec_token: "111111111111111111111111111",
    type: "video",
    display_title: "11111111111111111111",
    user: {
        nick_name: "11111111111111111111111",
        avatar: "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo319qdbqt8ng0g5n2vnku4j33uunie450",
        user_id: "111111111111111111111111",
        nickname: "1111111111111",
    },
    interact_info: {
        liked: true,
        liked_count: "245",
        sticky: false,
    },
    cover: {
        trace_id: "",
        info_list: [
            {
                image_scene: "WB_PRV",
                url: "http://sns-webpic-qc.xhscdn.com/202502260535/a2abb3feedc21fe5f75762d7d17c8b48/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nc_n_webp_prv_1",
            },
            {
                url: "http://sns-webpic-qc.xhscdn.com/202502260535/e09ea71a0801d2005581411a4fb8d2d5/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nc_n_webp_mw_1",
                image_scene: "WB_DFT",
            },
        ],
        url_pre:
            "http://sns-webpic-qc.xhscdn.com/202502260535/a2abb3feedc21fe5f75762d7d17c8b48/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nc_n_webp_prv_1",
        url_default:
            "http://sns-webpic-qc.xhscdn.com/202502260535/e09ea71a0801d2005581411a4fb8d2d5/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nc_n_webp_mw_1",
        file_id: "",
        height: 1360,
        width: 1020,
        url: "",
    },
};
export type RednoteNote = typeof RednoteNoteDemo;

const RednoteNoteDetailDemo = {
    type: "video",
    image_list: [
        {
            live_photo: false,
            file_id: "",
            height: 1360,
            info_list: [
                {
                    image_scene: "WB_PRV",
                    url: "http://sns-webpic-qc.xhscdn.com/202502260633/dca0fb5bc2155a33286cadd48a4ffb1d/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nd_prv_wlteh_webp_3",
                },
                {
                    image_scene: "WB_DFT",
                    url: "http://sns-webpic-qc.xhscdn.com/202502260633/8a3fd06f3af46e9c4536f21e522ffc80/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nd_dft_wlteh_webp_3",
                },
            ],
            url_pre:
                "http://sns-webpic-qc.xhscdn.com/202502260633/dca0fb5bc2155a33286cadd48a4ffb1d/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nd_prv_wlteh_webp_3",
            stream: {},
            width: 1020,
            url: "",
            trace_id: "",
            url_default:
                "http://sns-webpic-qc.xhscdn.com/202502260633/8a3fd06f3af46e9c4536f21e522ffc80/1040g2sg31eb1girmh0805n2vnku4j33utepc5t8!nd_dft_wlteh_webp_3",
        },
    ],
    share_info: {
        un_share: false,
    },
    note_id: "111111111111",
    interact_info: {
        liked: true,
        liked_count: "251",
        collected: false,
        collected_count: "50",
        comment_count: "101",
        share_count: "116",
        followed: true,
        relation: "follows",
    },
    ip_location: "日本",
    time: 1740495903000,
    last_update_time: 1740495904000,
    title: "1111111111111111",
    desc: "1111111111111111111",
    user: {
        user_id: "111111111111111",
        nickname: "1111111111111111111111",
        avatar: "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo319qdbqt8ng0g5n2vnku4j33uunie450",
        xsec_token: "11111111111111111",
    },
    video: {
        media: {
            video_id: 111111111111111111111,
            video: {
                biz_name: 110,
                biz_id: "11111111111111111",
                duration: 9,
                md5: "504321c355032ff859ddebc6bb3c4a95",
                hdr_type: 0,
                drm_type: 0,
                stream_types: [259, 84],
            },
            stream: {
                h265: [
                    {
                        backup_urls: [
                            "http://sns-bak-v1.xhscdn.com/stream/79/110/84/01e7bddb9c5214da4f037001953da41845_84.mp4",
                            "http://sns-bak-v2.xhscdn.com/stream/79/110/84/01e7bddb9c5214da4f037001953da41845_84.mp4",
                        ],
                        vmaf: -1,
                        weight: 62,
                        stream_type: 84,
                        duration: 8544,
                        avg_bitrate: 760661,
                        fps: 30,
                        video_bitrate: 633207,
                        quality_type: "HD",
                        default_stream: 0,
                        volume: 0,
                        video_codec: "hevc",
                        audio_duration: 8543,
                        psnr: 38.310001373291016,
                        rotate: 0,
                        format: "mp4",
                        width: 720,
                        size: 812387,
                        audio_bitrate: 130109,
                        stream_desc: "X265_MP4_WEB_84",
                        audio_codec: "aac",
                        height: 1280,
                        audio_channels: 2,
                        master_url:
                            "http://sns-video-bd.xhscdn.com/stream/79/110/84/01e7bddb9c5214da4f037001953da41845_84.mp4",
                        hdr_type: 0,
                        video_duration: 8400,
                        ssim: 0,
                    },
                ],
                h266: [],
                av1: [],
                h264: [
                    {
                        stream_type: 259,
                        volume: 0,
                        fps: 30,
                        default_stream: 0,
                        width: 720,
                        master_url:
                            "http://sns-video-bd.xhscdn.com/stream/79/110/259/01e7bddb9c5214da01037003953da41867_259.mp4",
                        quality_type: "HD",
                        size: 1565566,
                        audio_duration: 8528,
                        backup_urls: [
                            "http://sns-bak-v1.xhscdn.com/stream/79/110/259/01e7bddb9c5214da01037003953da41867_259.mp4",
                            "http://sns-bak-v2.xhscdn.com/stream/79/110/259/01e7bddb9c5214da01037003953da41867_259.mp4",
                        ],
                        video_duration: 8400,
                        weight: 62,
                        avg_bitrate: 1468463,
                        video_bitrate: 1416716,
                        audio_codec: "aac",
                        audio_channels: 2,
                        rotate: 0,
                        stream_desc: "WM_X264_MP4",
                        format: "mp4",
                        height: 1280,
                        duration: 8529,
                        hdr_type: 0,
                        vmaf: -1,
                        psnr: 0,
                        video_codec: "h264",
                        audio_bitrate: 65355,
                        ssim: 0,
                    },
                ],
            },
        },
        image: {
            first_frame_fileid:
                "110/0/01e7bddb9c5214da001000000001953da3e778_0.jpg",
            thumbnail_fileid:
                "110/0/01e7bddb9c5214da001000000001953da3ec96_0.webp",
        },
        capa: {
            duration: 8,
        },
        consumer: {
            origin_video_key:
                "pre_post/1040g2t031eb36ovjh07g5n2vnku4j33u13vqjq0",
        },
    },
    tag_list: [],
    at_user_list: [],
};
export type RednoteNoteDetail = typeof RednoteNoteDetailDemo;

const RednoteCommentBaseDemo = {
    id: "111111111111111111111",
    user_info: {
        user_id: "11111111",
        nickname: "11111111111",
        image: "https://sns-avatar-qc.xhscdn.com/avatar/615e43bbbd62127c912635e8.jpg?imageView2/2/w/120/format/jpg",
        xsec_token: "111111111111111111111111111",
    },
    pictures: [],
    at_users: [],
    show_tags: [],
    note_id: "11111111111111111111111111",
    content: "11111111111111111111111",
    liked: false,
    like_count: "42",
    create_time: 1740496369000,
    status: 0,
    ip_location: "日本",
};

export type RednoteComment = typeof RednoteCommentBaseDemo &
    (
        | {
              sub_comment_count: string;
              sub_comment_has_more: boolean;
              sub_comment_cursor: string;
              sub_comments: RednoteComment[];
          }
        | {
              target_comment: {
                  id: string;
                  user_info: {
                      user_id: string;
                      nickname: string;
                      image: string;
                      xsec_token: string;
                  };
                  shark7_raw?: RednoteComment;
              };
          }
    );
