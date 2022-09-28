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
    constructor(interval = 60 * 1000, length = 6) {
        this.MinInterval = interval;
        this.MaxLength = length;
    }
    push(data: any) {
        if (this.list.push({ time: new Date().getTime(), log: data }) > this.MaxLength) {
            if (this.list[0].time - new Date().getTime() < this.MinInterval) {
                logger.error("warn日志超速:\n" + JSON.stringify(this.list[0].log))
            }
            this.list.shift();
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
            this.queue.push(info);
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
const logger = winston.createLogger({
    level: 'debug',
    format: combine(
        label({ label: 'default' }),
        timestamp(new MyTimestamp()),
        myFormat
    ),
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
        new WarnHandleTransport(),
    ],
});

export function addMongoTrans(collName: string, dbName = 'log') {
    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), dbName, collection: collName, tryReconnect: true
    }))
}

export default logger

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.simple(),
//     }));
// }
