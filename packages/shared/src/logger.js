import { LogLevel } from './types.js';

export class Logger {
  constructor(name = 'System', minLevel = LogLevel.INFO) {
    this.name = name;
    this.minLevel = minLevel;
    this.logs = [];
    this.maxLogs = 1000;
  }

  setLevel(level) {
    this.minLevel = level;
  }

  log(level, message, details = null) {
    if (level < this.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LogLevel).find(key => LogLevel[key] === level) || 'INFO',
      logger: this.name,
      message,
      details
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const levelStr = `[${entry.level}]`.padEnd(7);
    const detailStr = details ? ` | ${JSON.stringify(details)}` : '';
    console.log(`${entry.timestamp} ${levelStr} [${this.name}] ${message}${detailStr}`);
  }

  debug(msg, details) { this.log(LogLevel.DEBUG, msg, details); }
  info(msg, details) { this.log(LogLevel.INFO, msg, details); }
  warn(msg, details) { this.log(LogLevel.WARN, msg, details); }
  error(msg, details) { this.log(LogLevel.ERROR, msg, details); }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const defaultLogger = new Logger('OpticalCore');
