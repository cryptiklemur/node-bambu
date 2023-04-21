/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Logger {
  alert?(message: string, ...meta: any[]): void;

  crit?(message: string, ...meta: any[]): void;

  data?(message: string, ...meta: any[]): void;

  debug(message: string, ...meta: any[]): void;

  // for syslog levels only
  emerg?(message: string, ...meta: any[]): void;

  // for cli and npm levels
  error(message: Error): void;
  error(message: string | Error, ...meta: any[]): void;

  help?(message: string, ...meta: any[]): void;

  http?(message: string, ...meta: any[]): void;

  info(message: string, ...meta: any[]): void;

  input?(message: string, ...meta: any[]): void;

  log(level: string, message: string, ...meta: any[]): void;

  notice?(message: string, ...meta: any[]): void;

  prompt?(message: string, ...meta: any[]): void;

  silly?(message: string, ...meta: any[]): void;

  verbose?(message: string, ...meta: any[]): void;

  warn(message: string, ...meta: any[]): void;

  warning?(message: string, ...meta: any[]): void;
}
