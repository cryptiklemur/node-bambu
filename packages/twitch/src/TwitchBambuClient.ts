import * as fs from 'node:fs';
import * as path from 'node:path';

import type { BambuClient, Job } from '@node-bambu/core';
import { AxiosError } from 'axios';

import { TwitchAPI } from './Twitch/TwitchApi';
import { getAuthorizationCode } from './util/getAuthorizationCode';
import { getAccessAndRefreshTokens } from './util/getAccessAndRefreshTokens';
import { isTokenExpired } from './util/isTokenExpired';
import { refreshAccessToken } from './util/refreshAccessToken';

export interface TwitchBambuClientConfig {
  bambuClient: BambuClient;
  twitch: {
    accessToken: string;
    clientId: string;
    clientSecret: string;
    gameId?: number;
    refreshToken: string;
    tags?: string[];
    title?(job: Job): string;
    tokenExpiry: Date;
    userId: number;
    username: string;
  };
}

export interface TwitchBambuClientPartialConfig extends Omit<TwitchBambuClientConfig, 'twitch'> {
  port?: number;
  twitch: {
    accessToken?: string;
    clientId: string;
    clientSecret: string;
    gameId?: number;
    redirectUri: string;
    refreshToken?: string;
    tags?: string[];
    title?(job: Job): string;
    tokenExpiry?: Date;
    userId: number;
    username: string;
  };
  writeToEnv?: boolean;
}

export class TwitchBambuClient {
  public static async create(config: TwitchBambuClientPartialConfig) {
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let tokenExpiry: Date | undefined;

    if (config.twitch.refreshToken && config.twitch.tokenExpiry) {
      if (isTokenExpired(config.twitch.tokenExpiry) || !config.twitch.accessToken) {
        const refreshed = await refreshAccessToken(
          config.twitch.clientId,
          config.twitch.clientSecret,
          config.twitch.refreshToken,
        );

        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken;
        tokenExpiry = refreshed.tokenExpiry;
      } else {
        accessToken = config.twitch.accessToken;
        refreshToken = config.twitch.refreshToken;
        tokenExpiry = config.twitch.tokenExpiry;
      }
    }

    if (!accessToken || !refreshToken || !tokenExpiry) {
      const code = await getAuthorizationCode(config.twitch.clientId, config.twitch.redirectUri, config.port);
      const initialTokens = await getAccessAndRefreshTokens(
        config.twitch.clientId,
        config.twitch.clientSecret,
        code,
        config.twitch.redirectUri,
      );

      accessToken = initialTokens.accessToken;
      refreshToken = initialTokens.refreshToken;
      tokenExpiry = initialTokens.tokenExpiry;
    }

    if (config.writeToEnv) {
      fs.writeFileSync(
        path.resolve(process.cwd(), '.env.twitch'),
        `TWITCH_ACCESS_TOKEN=${accessToken}\nTWITCH_REFRESH_TOKEN=${refreshToken}\nTWITCH_TOKEN_EXPIRY=${tokenExpiry.getTime()}`,
      );
    }

    return new TwitchBambuClient({
      bambuClient: config.bambuClient,
      twitch: {
        accessToken,
        refreshToken,
        tokenExpiry,
        ...config.twitch,
      },
    });
  }

  protected bambuClient: BambuClient;
  protected twitchApi: TwitchAPI;

  constructor(protected config: TwitchBambuClientConfig) {
    this.bambuClient = config.bambuClient;
    this.twitchApi = new TwitchAPI(
      this.bambuClient,
      config.twitch.clientId,
      config.twitch.clientSecret,
      config.twitch.accessToken,
      config.twitch.refreshToken,
      config.twitch.userId,
      config.twitch.tokenExpiry,
      {
        identity: {
          username: config.twitch.username,
          password: `oauth:${config.twitch.accessToken}`,
        },
        channels: [config.twitch.username],
      },
    );
  }

  public async run() {
    await this.ensureTitle();

    return Promise.all([this.bambuClient.connect(), this.twitchApi.connect()]);
  }

  private async ensureTitle() {
    const gameId = this.config.twitch.gameId ?? 509_670;
    const tags = this.config.twitch.tags ?? ['English', '3DPrinting', 'BambuLabX1C', 'BambuLab', 'X1C'];
    let info: { gameId?: string; title?: string } = await this.twitchApi.getStreamInfo(this.config.twitch.userId);

    setInterval(async () => {
      info = await this.twitchApi.getStreamInfo(this.config.twitch.userId);
    }, 30 * 1000);

    this.bambuClient.on('print:update', (job) => {
      const newTitle =
        this.config.twitch.title?.(job) ??
        `Printing ${job.status.subtaskName} | ${this.twitchApi.getCurrentStatus(job.status)}`;

      if (info.title !== newTitle || info.gameId !== gameId.toString()) {
        console.log('Updating status', { title: newTitle, gameId: gameId.toString(), tags });
        this.twitchApi
          .updateStreamInfo(this.config.twitch.userId, { title: newTitle, game_id: gameId.toString(), tags })
          .catch((error) => {
            if (error instanceof AxiosError) {
              console.error(error.response);
            }
          });
        info.title = newTitle;
      }
    });
  }
}
