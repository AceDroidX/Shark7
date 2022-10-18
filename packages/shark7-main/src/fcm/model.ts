export type FcmSendBody = {
    validate_only?: boolean,
    message: Message
}

export type Message = {
    data?: { [key: string]: string },
    notification?: Notification,
    android?: AndroidConfig,
    webpush?: {
    },
    apns?: {
    },
    fcm_options?: {
    },
} & ({ token: string } | { topic: string } | { condition: string })

export type Notification = {
    title?: string,
    body?: string,
    image?: string
}

type AndroidConfig = {
    collapse_key?: string,
    priority?: AndroidMessagePriority,
    ttl?: string,
    restricted_package_name?: string,
    data?: { [key: string]: string },
    notification?: {
        // object(AndroidNotification)
    },
    fcm_options?: {
        // object(AndroidFcmOptions)
    },
    direct_boot_ok?: boolean
}

export enum AndroidMessagePriority {
    NORMAL = 'normal',
    HIGH = 'high',
}
