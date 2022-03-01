import url from 'url'
export class WeiboUser {
    id: number;
    screen_name: string;
    profile_image_url: string;
    avatar_hd: string;
    friends_count: number;

    verified_reason: string | undefined;
    description: string | undefined;

    constructor(id: number, screen_name: string, profile_image_url: string, avatar_hd: string, friends_count: number, verified_reason: string | undefined, description: string | undefined) {
        this.id = id;
        this.screen_name = screen_name;
        this.profile_image_url = url.format(new url.URL(profile_image_url), { search: false });
        this.avatar_hd = url.format(new url.URL(avatar_hd), { search: false });
        this.friends_count = friends_count
        this.verified_reason = verified_reason;
        this.description = description;
    }

    setInfoFromRaw(raw: any) {
        this.screen_name = raw.screen_name;
        this.profile_image_url = url.format(new url.URL(raw.profile_image_url), { search: false });
        this.avatar_hd = url.format(new url.URL(raw.avatar_hd), { search: false });
        this.friends_count = raw.friends_count;
        this.verified_reason = raw.verified_reason;
        this.description = raw.description;
    }

    static getFromRaw(raw: any): WeiboUser {
        // logger.debug('getFromRaw\n'+JSON.stringify(raw));
        return new WeiboUser(
            raw.id,
            raw.screen_name,
            raw.profile_image_url,
            raw.avatar_hd,
            raw.friends_count,
            raw.verified_reason,
            raw.description
        );
    }
}