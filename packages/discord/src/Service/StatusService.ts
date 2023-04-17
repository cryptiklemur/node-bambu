import type { Client, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import prettyMs from 'pretty-ms';
import dayjs from 'dayjs';
import type { ComponentActionRow, Message } from 'slash-create';
import type { interfaces, BambuClient } from '@node-bambu/core';
import { ButtonStyle, ComponentType } from 'slash-create';
import type { AxiosError } from 'axios';
import axios from 'axios';

export class StatusService {
  private intervals: Record<string, NodeJS.Timer> = {};
  public constructor(
    private client: Client,
    private bambu: BambuClient,
    private cache: interfaces.Cache,
    private logger: interfaces.Logger,
    private streamUrl?: string,
  ) {}

  public async initialize() {
    await Promise.all([this.initializeStatuses('permanent'), this.initializeStatuses('semi-permanent')]);
  }

  private async initializeStatuses(type: 'permanent' | 'semi-permanent') {
    const messages: [string, string][] | undefined = await this.cache.get(type + '-messages');

    if (!messages) {
      return;
    }

    messages.forEach(([channelId, messageId]) => {
      this.logger.debug(`${type} message found: ${channelId}:${messageId}`);
      this.updateMessage([channelId, messageId], type);
      this.intervals[`${channelId}:${messageId}`] = setInterval(
        () => this.updateMessage([channelId, messageId], type),
        5 * 1000,
      );
    });
  }

  public async addNewStatus(msg: Message, type: 'permanent' | 'semi-permanent') {
    let messages: [string, string][] | undefined = await this.cache.get(type + '-messages');

    if (!messages) {
      messages = [];
    }

    messages.push([msg.channelID, msg.id]);
    await this.cache.set(type + '-messages', messages);

    this.intervals[`${msg.channelID}:${msg.id}`] = setInterval(
      () => this.updateMessage([msg.channelID, msg.id], type),
      5 * 1000,
    );
  }

  public async updateMessage([channelId, messageId]: [string, string], type: 'permanent' | 'semi-permanent') {
    this.logger.debug(`Updating ${type} status message: ${channelId}:${messageId}`);
    const channel = (await this.client.channels.fetch(channelId)) as TextChannel;

    if (!channel) {
      return this.removeMessage([channelId, messageId], type);
    }

    const message = await channel.messages.fetch(messageId);

    if (!message) {
      return this.removeMessage([channelId, messageId], type);
    }

    let removeWhenDone = false;
    let job = this.bambu.printerStatus.currentJob;

    if (!job) {
      if (type === 'semi-permanent') {
        removeWhenDone = true;
        job = this.bambu.printerStatus.lastJob;
      }

      if (!job) {
        await message.edit('Printer is currently idle');

        return;
      }
    }

    await message
      .edit({
        content: '',
        embeds: [await this.buildEmbed(job.status)],
      })
      .catch(() => {
        // Swallow this error
      });

    if (removeWhenDone) {
      return this.removeMessage([channelId, messageId], type);
    }
  }

  private async removeMessage([channelId, messageId]: [string, string], type: 'permanent' | 'semi-permanent') {
    const messages: [string, string][] | undefined = await this.cache.get(type + '-messages');

    if (!messages) {
      return;
    }

    const index = messages.findIndex((x) => x[0] === channelId && x[1] === messageId);

    if (index >= 0) {
      messages.splice(index, 1);

      await this.cache.set(type + '-messages', messages);
    }

    delete this.intervals[`${channelId}:${messageId}`];
  }

  private getStreamThumbnail() {
    function extractYouTubeVideoId(url: string): string | null {
      const regex = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
      const match = url.match(regex);

      return match && match[2].length === 11 ? match[2] : null;
    }

    function extractTwitchStreamerLogin(url: string): string | null {
      const regex = /^.*twitch\.tv\/([a-zA-Z0-9_]+).*/;
      const match = url.match(regex);

      return match?.[1].length ? match[1] : null;
    }

    function getYouTubeThumbnail(videoId: string): string {
      return `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
    }

    async function getTwitchThumbnail(streamerLogin: string): Promise<string | undefined> {
      try {
        const response = await axios.get(
          `https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamerLogin}-640x360.jpg`,
        );

        if (response.status === 200) {
          return response.config.url;
        }
      } catch (error) {
        console.log(`Error fetching Twitch thumbnail: ${(error as AxiosError).message}`);
      }

      return undefined;
    }

    async function getThumbnailFromURL(url: string): Promise<string | undefined> {
      const youtubeVideoId = extractYouTubeVideoId(url);

      if (youtubeVideoId) {
        return getYouTubeThumbnail(youtubeVideoId);
      }

      const twitchStreamerLogin = extractTwitchStreamerLogin(url);

      if (twitchStreamerLogin) {
        return await getTwitchThumbnail(twitchStreamerLogin);
      }

      return undefined;
    }

    return this.streamUrl ? getThumbnailFromURL(this.streamUrl) : undefined;
  }

  public async buildEmbed(status: interfaces.Status) {
    const estimatedTotalTime = Date.now() - status.startTime + status.remainingTime;

    const image = await this.getStreamThumbnail();

    return EmbedBuilder.from({
      title: status.taskName,
      description: this.getEmbedDescription(status) + '\n' + status.printStage.text,
      color: this.getColor(status),
      image: typeof image === 'string' ? { url: image } : undefined,
      fields: [
        {
          name: 'Print Time',
          value:
            `\`Current:\` ${prettyMs((status.finishTime ?? Date.now()) - status.startTime, {
              colonNotation: true,
              millisecondsDecimalDigits: 0,
              secondsDecimalDigits: 0,
              keepDecimalsOnWholeSeconds: false,
            })}\n` +
            `\`Estimated:\` ${prettyMs(estimatedTotalTime, {
              colonNotation: true,
              millisecondsDecimalDigits: 0,
              secondsDecimalDigits: 0,
              keepDecimalsOnWholeSeconds: false,
            })}\n` +
            `\`Finish:\` <t:${dayjs(Date.now() + status.remainingTime).unix()}:R>`,
          inline: true,
        },
        {
          name: 'Progress',
          value: `\`Percent:\` ${status.progressPercent}%\n\`Layer:\` ${status.currentLayer} / ${status.maxLayers}`,
          inline: true,
        },
        {
          name: 'Speed',
          value: `${status.speed.name} (${status.speed.percent}%)`,
          inline: true,
        },
        {
          name: 'Temps',
          value:
            `\`Bed:\` ${status.temperatures.bed.target}°C/${status.temperatures.bed.actual}°C\n` +
            `\`Nozzle:\` ${status.temperatures.extruder.target}°C/${status.temperatures.extruder.actual}°C\n` +
            `\`Chamber:\` ${status.temperatures.chamber.actual}°C\n`,
          inline: true,
        },
        {
          name: 'Fans',
          value:
            `\`Main 1:\` ${status.fans.big_1}%\n` +
            `\`Main 2:\` ${status.fans.big_2}%\n` +
            `\`Cooling:\` ${status.fans.cooling}%\n` +
            `\`Heatbreak:\` ${status.fans.heatbreak}%`,
          inline: true,
        },
      ],
    }).toJSON();
  }

  public buildComponents(): ComponentActionRow[] {
    return [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.BUTTON,
            style: ButtonStyle.SECONDARY,
            label: '',
            custom_id: 'toggle-print-status',
            emoji: {
              name: '⏸️',
            },
          },
          {
            type: ComponentType.BUTTON,
            style: ButtonStyle.DESTRUCTIVE,
            label: '',
            custom_id: 'stop-print',
            emoji: {
              name: '🛑',
            },
          },
          {
            type: ComponentType.BUTTON,
            style: ButtonStyle.PRIMARY,
            label: 'Speed',
            custom_id: 'speed-up',
            emoji: {
              name: '⬆️',
            },
          },
          {
            type: ComponentType.BUTTON,
            style: ButtonStyle.PRIMARY,
            label: 'Speed',
            custom_id: 'slow-down',
            emoji: {
              name: '⬇️',
            },
          },
          {
            type: ComponentType.BUTTON,
            style: ButtonStyle.PRIMARY,
            label: 'Toggle',
            custom_id: 'toggle-lights',
            emoji: {
              name: '💡',
            },
          },
        ],
      },
    ];
  }

  private getEmbedDescription(status: interfaces.Status) {
    const time = prettyMs(status.remainingTime);
    const elapsedTime = status.finishTime
      ? prettyMs(status.finishTime - status.startTime, {
          millisecondsDecimalDigits: 0,
          secondsDecimalDigits: 0,
          keepDecimalsOnWholeSeconds: false,
        })
      : '';

    switch (status.state) {
      case 'PREPARE':
        return `Preparing to print. ${time} to print`;

      case 'RUNNING':
        return `Currently printing @ ${status.progressPercent}%. ${time} remaining`;

      case 'PAUSE':
        return `Currently paused @ ${status.progressPercent}%. ${time} remaining`;

      case 'FINISH':
        this.logger.debug('Times', status.finishTime, status.startTime, elapsedTime);

        return `Finished printing. Print took ${elapsedTime}`;

      case 'IDLE':
        return '';
    }
  }

  private getColor(status: interfaces.Status) {
    switch (status.state) {
      case 'PREPARE':
        return 0x002aff;

      case 'RUNNING':
        return 0x22ff00;

      case 'PAUSE':
        return 0xffff00;

      case 'FINISH':
        return 0x00ffff;

      case 'IDLE':
        return 0xffff00;
    }
  }
}
