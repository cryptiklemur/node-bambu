/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger } from '../interfaces';

export class ConsoleLogger implements Logger {
  constructor(protected defaultMeta: Record<string, unknown> = {}) {}

  public debug(message: string, ...meta: any[]): void {
    if (process.env.DEBUG?.includes('bambu')) {
      console.debug('[' + new Date().toISOString() + ']: ', message, { ...this.defaultMeta, ...meta });
    }
  }

  public silly(message: string, ...meta: any[]): void {
    if (process.env.SILLY?.includes('bambu')) {
      console.debug('[' + new Date().toISOString + '][SILLY]: ', message, { ...this.defaultMeta, ...meta });
    }
  }

  public error(message: string | Error, ...meta: any[]): void {
    console.error('[' + new Date().toISOString() + ']: ', message, { ...this.defaultMeta, ...meta });
  }

  public info(message: string, ...meta: any[]): void {
    console.info('[' + new Date().toISOString() + ']: ', message, { ...this.defaultMeta, ...meta });
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
        this[level](message, { ...this.defaultMeta, ...meta });

        return;
      }

      default: {
        console.log('[' + new Date().toISOString() + ']: ', `[${level}] ${message}`, { ...this.defaultMeta, ...meta });

        return;
      }
    }
  }
}
