/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger } from '../interfaces';

export class ConsoleLogger implements Logger {
  public debug(message: string, ...meta: any[]): void {
    if (process.env.DEBUG?.includes('bambu')) {
      console.debug(message, ...meta);
    }
  }

  public silly(message: string, ...meta: any[]): void {
    if (process.env.SILLY?.includes('bambu')) {
      console.debug('[SILLY]', message, ...meta);
    }
  }

  public error(message: string, ...meta: any[]): void {
    console.error(message, ...meta);
  }

  public info(message: string, ...meta: any[]): void {
    console.info(message, ...meta);
  }

  public warn(message: string, ...meta: any[]): void {
    console.warn(message, ...meta);
  }

  public log(level: string, message: string, ...meta: any[]): void {
    switch (level) {
      case 'debug':
      case 'error':
      case 'info':
      case 'warn': {
        console[level](message, ...meta);

        return;
      }

      default: {
        console.log(`[${level}] ${message}`, ...meta);

        return;
      }
    }
  }
}
