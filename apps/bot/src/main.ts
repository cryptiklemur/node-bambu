import 'dotenv/config';
import * as util from 'node:util';

import Fastify from 'fastify';
import * as winston from 'winston';
import type { LeveledLogMethod } from 'winston';

import { app } from './app/app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'debug',
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    trace: 4,
    debug: 5,
  },
  format: winston.format.combine(
    winston.format.cli({ all: true }),
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'DD/MM/YY hh:mm:ss A' }),
    winston.format.metadata(),
    winston.format.splat(),
    winston.format.printf(
      ({ level, message, metadata: { timestamp, ...metadata } }) =>
        `[${timestamp}][${level}]: ${message} ${util.inspect(metadata, {
          compact: true,
          breakLength: Number.POSITIVE_INFINITY,
        })}`,
    ),
  ),
  transports: [new winston.transports.Console({ handleExceptions: true, handleRejections: true })],
}) as winston.Logger & { fatal: LeveledLogMethod; trace: LeveledLogMethod };

// Instantiate Fastify with some config
const server = Fastify({
  // @ts-expect-error This type narrowing error can be ignored
  logger,
});

// Register your application as a normal plugin.
server.register(app);

// Start listening.
server.listen({ port, host }, (error) => {
  if (error) {
    server.log.error(error);

    throw error;
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
