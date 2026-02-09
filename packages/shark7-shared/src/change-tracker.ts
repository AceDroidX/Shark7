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
    /** 插入时的处理器（如果为 null 则不处理插入） */
    onInsert?: (newData: T) => Shark7Event | null | Promise<Shark7Event | null>;
    /** 更新时的处理器（如果为 null 则不处理更新事件） */
    onUpdate?: (oldData: T, newData: T, changes: IAtomicChange[]) => Shark7Event | null | Promise<Shark7Event | null>;
    /** 更新后的额外处理（如微博抓取评论） */
    onUpdateExtra?: (oldData: T, newData: T, changes: IAtomicChange[]) => void | Promise<void>;
}

type FormatChanges<T> = (changes: IAtomicChange[], newData: T) => string[];
type GetEventMeta<T> = (newData: T) => { name: string; scope: string };

/**
 * 创建更新事件处理器
 */
export function createUpdateEvent<T>(
    formatChanges: FormatChanges<T>,
    getMeta: GetEventMeta<T>
) {
    return (oldData: T, newData: T, changes: IAtomicChange[]): Shark7Event | null => {
        const messages = formatChanges(changes, newData).filter(m => m && m.trim());
        if (messages.length === 0) return null;
        const { name, scope } = getMeta(newData);
        return {
            ts: Number(new Date()),
            name,
            scope,
            msg: messages.join('\n')
        };
    };
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
            return;
        }
        
        // 5. 处理更新事件（如果未配置则忽略）
        if (!options?.onUpdate) {
            return;
        }
        
        const event = await options.onUpdate(oldData, newData, changes);
        if (event) {
            await eventPublisher(event);
        }
        
        // 6. 执行额外的更新处理逻辑（不要求事件存在）
        if (options?.onUpdateExtra) {
            await options.onUpdateExtra(oldData, newData, changes);
        }
    };
}
