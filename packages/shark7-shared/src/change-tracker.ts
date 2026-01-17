import type { Shark7Event, UpdateTypeDoc } from "./index.ts";
import { jsonDiff } from "./utils.ts";
import type { IAtomicChange, Options } from "json-diff-ts";

/**
 * 变更追踪选项
 */
export interface ChangeTrackerOptions<T extends UpdateTypeDoc> {
    /** 跳过的字段列表 */
    keysToSkip?: string[];
    /** 自定义 diff 选项 */
    diffOptions?: Options;
    /** 自定义格式化函数 */
    formatter?: (changes: IAtomicChange[], newData: T) => string[];
    /** 插入时的处理器（如果为 null 则不处理插入） */
    onInsert?: (newData: T) => Shark7Event | null | Promise<Shark7Event | null>;
    /** 更新后的额外处理（如微博抓取评论） */
    onUpdateExtra?: (oldData: T | null, newData: T) => Promise<void>;
    /** 自定义事件作用域 */
    scope?: string;
    /** 自定义事件名称 */
    name?: string | ((newData: T) => string);
}

/**
 * 创建变更追踪装饰器
 * 
 * @param getOldData 获取旧数据的函数
 * @param insertOrUpdate 插入或更新数据的函数
 * @param eventPublisher 发布事件的函数
 * @param options 配置选项
 * @returns 包装后的函数
 */
export function createChangeTracker<T extends UpdateTypeDoc>(
    getOldData: (newData: T) => Promise<T | null>,
    insertOrUpdate: (data: T) => Promise<any>,
    eventPublisher: (event: Shark7Event) => Promise<void>,
    options?: ChangeTrackerOptions<T>
) {
    return async (newData: T): Promise<void> => {
        // 1. 获取旧数据
        const oldData = await getOldData(newData);
        
        // 2. 插入或更新新数据
        await insertOrUpdate(newData);
        
        // 3. 如果是新插入数据
        if (!oldData) {
            if (options?.onInsert) {
                const event = await options.onInsert(newData);
                if (event) {
                    await eventPublisher(event);
                }
            }
            return;
        }
        
        // 4. 对比数据变化
        const diffOptions = options?.diffOptions ?? {
            keysToSkip: options?.keysToSkip ?? ['shark7_id', 'shark7_name', 'shark7_raw', '_id'],
            treatTypeChangeAsReplace: false
        };
        
        const changes = jsonDiff(oldData, newData, diffOptions);
        
        if (changes.length === 0) {
            // 即使没有数据变化，也可能有额外处理逻辑
            if (options?.onUpdateExtra) {
                await options.onUpdateExtra(oldData, newData);
            }
            return;
        }
        
        // 5. 格式化变更消息
        let messages: string[];
        
        if (options?.formatter) {
            messages = options.formatter(changes, newData);
        } else {
            // 默认格式化
            messages = changes.map(change => 
                `${change.path} 更改\n原：${change.oldValue}\n现：${change.value}`
            );
        }
        
        // 过滤空消息
        messages = messages.filter(m => m && m.trim());
        
        if (messages.length === 0) {
            // 如果没有消息但有额外处理逻辑
            if (options?.onUpdateExtra) {
                await options.onUpdateExtra(oldData, newData);
            }
            return;
        }
        
        // 6. 发布事件
        const event: Shark7Event = {
            ts: Number(new Date()),
            name: options?.name ? (typeof options.name === 'function' ? options.name(newData) : options.name) : (newData as any).shark7_name || 'Unknown',
            scope: options?.scope || 'General',
            msg: messages.join('\n')
        };

        await eventPublisher(event);
        
        // 7. 执行额外的更新处理逻辑
        if (options?.onUpdateExtra) {
            await options.onUpdateExtra(oldData, newData);
        }
    };
}
