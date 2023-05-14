import type { AxiosInstance, AxiosResponse } from 'axios';
import type { ChatUserstate, Client, Options } from 'tmi.js';
import tmi from 'tmi.js';
import axios from 'axios';
import type { BambuClient, interfaces } from '@node-bambu/core';
import prettyMs from 'pretty-ms';

import { refreshAccessToken } from '../util/refreshAccessToken';
import { isTokenExpired } from '../util/isTokenExpired';

interface UpdateStreamInformation {
  broadcaster_language?: string;
  delay?: number;
  game_id?: string;
  tags?: string[];
  title?: string;
}

export class TwitchAPI {
  private axiosInstance: AxiosInstance;
  private ircClient: Client;

  constructor(
    private bambuClient: BambuClient,
    private clientId: string,
    private clientSecret: string,
    private accessToken: string,
    private refreshToken: string,
    private userId: number,
    private tokenExpiry: Date,
    ircOptions: Options,
  ) {
    this.ircClient = tmi.client(ircOptions);

    this.axiosInstance = axios.create({
      baseURL: 'https://api.twitch.tv',
      headers: {
        'Client-ID': clientId,
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.refreshTokenIfNeeded();

      config.headers.Authorization = 'Bearer ' + this.accessToken;

      return config;
    });
    this.axiosInstance.interceptors.response.use(
      async (response: AxiosResponse) => {
        const rateLimitRemaining = Number.parseInt(response.headers['ratelimit-remaining'] || '0', 10);
        const rateLimitReset = Number.parseInt(response.headers['ratelimit-reset'] || '0', 10);

        if (rateLimitRemaining <= 1) {
          const delayMs = (rateLimitReset - Math.floor(Date.now() / 1000)) * 1000;

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return response;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
  }

  public async connect() {
    this.ircClient.on('message', this.onIRCMessage.bind(this));
    await this.ircClient.connect().catch(console.error);
  }

  public async updateStreamInfo(userId: number, info: UpdateStreamInformation): Promise<void> {
    await this.axiosInstance.patch(`/helix/channels?broadcaster_id=${userId}`, info, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getStreamInfo(userId: number): Promise<{
    broadcasterLanguage: string;
    delay: number;
    gameId: string;
    gameName: string;
    tags: string[];
    title: string;
  }> {
    const {
      data: {
        data: [{ title, game_id: gameId, tags, delay, game_name: gameName, broadcaster_language: broadcasterLanguage }],
      },
    } = await this.axiosInstance.get(`/helix/channels?broadcaster_id=${userId}`);

    return {
      title,
      gameId,
      tags,
      delay,
      gameName,
      broadcasterLanguage,
    };
  }

  public async refreshTokenIfNeeded(): Promise<void> {
    // Refresh the access token if it expires within 60 seconds
    if (isTokenExpired(this.tokenExpiry)) {
      await this.refreshAccessToken();
    }
  }

  public getCurrentStatus(status: interfaces.Status) {
    const time = prettyMs(status.remainingTime);
    const elapsedTime = status.finishTime
      ? prettyMs(status.finishTime - status.startTime, {
          millisecondsDecimalDigits: 0,
          secondsDecimalDigits: 0,
          keepDecimalsOnWholeSeconds: false,
        })
      : '';

    switch (status.state) {
      case 'PREPARE': {
        return `Preparing to print. ${time} to print`;
      }

      case 'RUNNING': {
        return `Currently printing @ ${status.progressPercent}%. ${time} remaining`;
      }

      case 'PAUSE': {
        return `Currently paused @ ${status.progressPercent}%. ${time} remaining`;
      }

      case 'FINISH': {
        return `Finished printing. Print took ${elapsedTime}`;
      }

      // case 'IDLE':
      default: {
        return '';
      }
    }
  }

  private async onIRCMessage(channel: string, userstate: ChatUserstate, message: string, self: boolean) {
    if (self) {
      return;
    }

    if (message.toLowerCase() === '!status') {
      const latestStatus = this.bambuClient.printerStatus.latestStatus;

      if (!latestStatus) {
        this.ircClient.say(channel, 'Printer is currently unavailable.');

        return;
      }

      this.ircClient.say(channel, this.getCurrentStatus(latestStatus));
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const { accessToken, refreshToken, tokenExpiry } = await refreshAccessToken(
      this.clientId,
      this.clientSecret,
      this.refreshToken,
    );

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = tokenExpiry;
  }
}
