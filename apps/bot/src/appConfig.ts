import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

import dotenv from 'dotenv';
import type { BambuBotConfiguration } from '@node-bambu/discord';
import type { TwitchBambuClientPartialConfig } from '@node-bambu/twitch';

export interface AppConfig {
  database?: BambuBotConfiguration['database'];
  discord: BambuBotConfiguration['discord'];
  twitch?: TwitchBambuClientPartialConfig['twitch'];
}

const { parsed: environment = process.env } = dotenv.config({ path: path.resolve(process.cwd(), '.env.twitch') });

const userConfig = fs.existsSync(path.resolve(process.cwd(), 'config.js'))
  ? await import(path.resolve(process.cwd(), 'config.js')).then((x) => x.default)
  : {};

const twitchConfig: AppConfig['twitch'] =
  process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
    ? {
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
      }
    : undefined;

export const appConfig: AppConfig = {
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    token: process.env.DISCORD_TOKEN,
  },
  twitch: twitchConfig,
  ...userConfig,
};
console.log(appConfig);
