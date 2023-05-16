import fp from 'fastify-plugin';
import { BambuBot } from '@node-bambu/discord';
import { TwitchBambuClient } from '@node-bambu/twitch';
import type { FastifyInstance } from 'fastify/types/instance';

import { logger } from '../../';
import { appConfig } from '../../appConfig';

declare module 'fastify' {
  interface FastifyInstance {
    discord: BambuBot;
    twitch: TwitchBambuClient;
  }
}

/**
 * This plugin adds the discord bot
 */
export default fp(
  async function (fastify: FastifyInstance, options, done) {
    fastify.decorate(
      'discord',
      new BambuBot({
        discord: appConfig.discord,
        database: appConfig.database,
        logger,
      }),
    );

    await fastify.discord.start();

    if (appConfig.twitch && fastify.discord.printers.length > 0) {
      fastify.decorate(
        'twitch',
        await TwitchBambuClient.create({
          writeToEnv: true,
          twitch: appConfig.twitch,
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
