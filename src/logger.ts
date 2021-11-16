import winston, { config } from 'winston';
import { createLogger, format, transports } from 'winston';
import { TimestampOptions } from 'logform';
const { combine, timestamp, label, printf } = format;
import Transport from 'winston-transport';
import { sendLogToKHL, getTime } from './utils';


class KHLTransport extends Transport {
  // level: string;
  constructor(opts: any) {
    super(opts);
    // console.log(JSON.stringify(opts));
    // this.level = opts.level;
    //
    // Consume any custom options here. e.g.:
    // - Connection information for databases
    // - Authentication information for APIs (e.g. loggly, papertrail, 
    //   logentries, etc.).
    //
  }

  log(info: any, callback: () => void) {
    // setImmediate(() => {
    //   this.emit('logged', info);
    // });
    // if (info.level !== 'info' && info.level !== 'debug') {
    sendLogToKHL(JSON.stringify(info));
    // }
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
    new KHLTransport({ level: 'warn' }),
    new winston.transports.File({ filename: 'log/info.log', level: 'info' }),
    new winston.transports.File({ filename: 'log/warn.log', level: 'warn' }),
    new winston.transports.File({ filename: 'log/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'log/combined.log' }),
    new transports.Console({ format: combine(winston.format.colorize(), timestamp(), myFormat) }),
  ],
});

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