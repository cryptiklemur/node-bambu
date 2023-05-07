import path from 'node:path';
import * as process from 'node:process';

import dotenv from 'dotenv';
import fp from 'fastify-plugin';
import { BambuBot } from '@node-bambu/discord';
import { TwitchBambuClient } from '@node-bambu/twitch';
import type { FastifyInstance } from 'fastify/types/instance';

import { logger } from '../../main';

declare module 'fastify' {
  interface FastifyInstance {
    discord: BambuBot;
    twitch: TwitchBambuClient;
  }
}

const { parsed: environment } = dotenv.config({ path: path.resolve(process.cwd(), '.env.twitch') });

/**
 * This plugin adds the discord bot
 */
export default fp(
  async function (fastify: FastifyInstance, options, done) {
    fastify.decorate(
      'discord',
      new BambuBot({
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          publicKey: process.env.DISCORD_PUBLIC_KEY,
          token: process.env.DISCORD_TOKEN,
        },
        logger,
      }),
    );

    await fastify.discord.start();

    if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
      fastify.decorate(
        'twitch',
        await TwitchBambuClient.create({
          writeToEnv: true,
          twitch: {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            redirectUri: process.env.TWITCH_REDIRECT_URI,
            userId: +process.env.TWITCH_USER_ID,
            username: process.env.TWITCH_USERNAME,
            accessToken: environment.TWITCH_ACCESS_TOKEN as string | undefined,
            refreshToken: environment.TWITCH_REFRESH_TOKEN as string | undefined,
            tokenExpiry: environment.TWITCH_TOKEN_EXPIRY
              ? new Date(Number.parseInt(environment.TWITCH_TOKEN_EXPIRY, 10))
              : undefined,
          },
          logger,
          bambuClient: fastify.discord.printers[0].client,
        }),
      );

      await fastify.twitch.run();
      logger.info('Decorated fastify with discord and twitch');
    } else {
      logger.info('Decorated fastify with discord');
    }

    done();
  },
  { fastify: '4.x', name: 'discord' },
);
