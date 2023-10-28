import { TimestampOptions } from 'logform';
import winston, { format, transports } from 'winston';
import 'winston-mongodb';
import Transport from 'winston-transport';
import { MongoControlClient } from './db';
import { getTime } from './utils';
const { combine, timestamp, label, printf } = format;

class TimingQueue {
    MinInterval: number
    MaxLength: number
    list: { time: number, log: any }[] = []
    constructor(interval = 30 * 1000, length = 3) {
        this.MinInterval = interval;
        this.MaxLength = length;
    }
    push(data: any) {
        if (this.list.push({ time: new Date().getTime(), log: data }) > this.MaxLength) {
            if (new Date().getTime() - this.list[0].time < this.MinInterval) {
                logger.error(`warn日志超速(Interval:${new Date().getTime() - this.list[0].time},Length:${this.list.length}):\n` + JSON.stringify(this.list[0].log))
                this.list.length = 0
            } else {
                this.list.shift();
            }
        }
    }
}

class WarnHandleTransport extends Transport {
    queue: TimingQueue
    constructor(opts?: { interval: number, length: number }) {
        super();
        if (opts) {
            this.queue = new TimingQueue(opts.interval, opts.length)
        } else {
            this.queue = new TimingQueue()
        }
        //
        // Consume any custom options here. e.g.:
        // - Connection information for databases
        // - Authentication information for APIs (e.g. loggly, papertrail,
        //   logentries, etc.).
        //
    }
    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });
        if (info.level == 'warn') {
            if (info.label != 'EventSender') this.queue.push(info);
        }
        // Perform the writing to the remote service
        callback();
    }
};

class MyTimestamp implements TimestampOptions {
    format() {
        return getTime();
    }
}

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${level}] ${message}`;
});

const loggerConfig = {
    level: process.env['log_level'] ?? 'debug',
    // defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: 'log/info.log', level: 'info' }),
        new winston.transports.File({ filename: 'log/warn.log', level: 'warn' }),
        new winston.transports.File({ filename: 'log/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'log/combined.log' }),
        new transports.Console({ format: combine(winston.format.colorize(), timestamp(), myFormat) }),
    ],
}
export const logger = winston.createLogger(Object.assign(Object.assign({}, loggerConfig), {
    format: combine(
        label({ label: 'default' }),
        timestamp(new MyTimestamp()),
        myFormat
    )
}));
export const loggerEventSender = winston.createLogger(Object.assign(Object.assign({}, loggerConfig), {
    format: combine(
        label({ label: 'EventSender' }),
        timestamp(new MyTimestamp()),
        myFormat
    )
}));

export function initLogger(collName: string, dbName = 'log') {
    const mongoTrans = new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), dbName, collection: collName, tryReconnect: true
    })
    logger.add(mongoTrans)
    loggerEventSender.add(mongoTrans)
    if (process.env['warn_config']) {
        const warn = process.env['warn_config'].split(',')
        logger.add(new WarnHandleTransport({ interval: Number(warn[0]), length: Number(warn[1]) }))
    }
    else logger.add(new WarnHandleTransport())
}

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.simple(),
//     }));
// }
