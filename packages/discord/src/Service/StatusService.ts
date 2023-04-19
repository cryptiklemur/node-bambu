import type { ActionRowData, Client, MessageActionRowComponentData, TextChannel } from 'discord.js';
import { Message as DiscordJSMessage, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import prettyMs from 'pretty-ms';
import dayjs from 'dayjs';
import type { ComponentActionRow, Message, MessageFile } from 'slash-create';
import { ButtonStyle, CommandContext, ComponentType } from 'slash-create';
import type { BambuClient, interfaces, Job } from '@node-bambu/core';

import { snakeToPascalCase } from '../Util/snakeToPascalCase';
import { sleep } from '../Util/sleep';
import type { Cache } from '../Interfaces/Cache';

type MessageType = 'permanent' | 'semi-permanent' | 'subscription';

export class StatusService {
  private intervals: Record<string, NodeJS.Timer> = {};

  public constructor(
    private client: Client,
    private bambu: BambuClient,
    private cache: Cache,
    private logger: interfaces.Logger,
  ) {}

  public async initialize() {
    await sleep(5000);
    await Promise.all([
      this.initializeStatuses('permanent'),
      this.initializeStatuses('semi-permanent'),
      this.initializeStatuses('subscription'),
      this.initializeChannelSubscriptions(),
    ]);
  }

  public async sendIdleMessage(ctxOrChannel: CommandContext | TextChannel) {
    const status = this.bambu.printerStatus.latestStatus;

    if (ctxOrChannel instanceof CommandContext) {
      if (!status) {
        return ctxOrChannel.editOriginal({
          content: 'Printer is currently offline',
          embeds: [],
          components: [],
          file: [],
        });
      }

      return ctxOrChannel.editOriginal({
        content: '',
        embeds: [await this.buildEmbed(status)],
        components: this.buildComponents(),
        file: [],
      });
    }

    if (!status) {
      return ctxOrChannel.send({
        content: 'Printer is currently offline',
        embeds: [],
        components: [],
        files: [],
      });
    }

    return ctxOrChannel.send({
      content: '',
      embeds: [await this.buildEmbed(status)],
      components: this.buildComponents() as unknown as ActionRowData<MessageActionRowComponentData>[],
      files: [],
    });
  }

  public async sendStatusMessage(type: MessageType, channel: TextChannel): Promise<DiscordJSMessage>;
  public async sendStatusMessage(type: MessageType, ctx: CommandContext): Promise<Message>;
  public async sendStatusMessage(
    type: MessageType,
    ctxOrChannel: CommandContext | TextChannel,
  ): Promise<Message | DiscordJSMessage> {
    const job = this.bambu.printerStatus.currentJob;

    if (!job) {
      return this.sendIdleMessage(ctxOrChannel);
    }

    let msg: Message | DiscordJSMessage;

    if (ctxOrChannel instanceof CommandContext) {
      msg = await ctxOrChannel.editOriginal({
        content: '',
        embeds: [await this.buildEmbed(job.status)],
        components: this.buildComponents(),
        file: await this.buildFiles(job, true),
      });
    } else {
      msg = await ctxOrChannel.send({
        content: '',
        embeds: [await this.buildEmbed(job.status)],
        components: this.buildComponents() as unknown as ActionRowData<MessageActionRowComponentData>[],
        files: await this.buildFiles(job),
      });
    }

    await this.addNewStatus(msg, type);

    return msg;
  }

  public async addNewStatus(msg: Message | DiscordJSMessage, type: MessageType) {
    const channelId = msg instanceof DiscordJSMessage ? msg.channelId : msg.channelID;
    let messages: [string, string][] | undefined = await this.cache.get(type + '-messages');

    if (!messages) {
      messages = [];
    }

    messages.push([channelId, msg.id]);
    await this.cache.set(type + '-messages', messages);

    this.intervals[`${channelId}:${msg.id}`] = setInterval(
      () => this.updateMessage([channelId, msg.id], type),
      5 * 1000,
    );
  }

  public async updateMessage([channelId, messageId]: [string, string], type: MessageType) {
    const channel = (await this.client.channels.fetch(channelId).catch(() => undefined)) as TextChannel | undefined;
    const message = await channel?.messages
      .fetch({ message: messageId, cache: false, force: true })
      .catch(() => undefined);

    if (!message) {
      return this.removeMessage([channelId, messageId], type);
    }

    let job = this.bambu.printerStatus.currentJob;

    this.logger.debug(`Updating ${type} status message: ${channelId}:${messageId}`);

    if (!job) {
      await this.removeMessage([channelId, messageId], type);

      if (type === 'semi-permanent') {
        job = this.bambu.printerStatus.lastJob;
      }

      if (!job) {
        if (!this.bambu.printerStatus.latestStatus) {
          return message.edit({
            content: 'Printer is currently offline',
            embeds: [],
            components: [],
            files: [],
          });
        }

        await message.edit({
          content: '',
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          embeds: [await this.buildEmbed(this.bambu.printerStatus.latestStatus!)],
          components: this.buildComponents() as unknown as ActionRowData<MessageActionRowComponentData>[],
          files: [],
        });

        return;
      }
    }

    await message
      .edit({
        content: '',
        embeds: [await this.buildEmbed(job.status)],
        files: message.embeds[0].thumbnail === null ? await this.buildFiles(job) : undefined,
        components: this.buildComponents() as unknown as ActionRowData<MessageActionRowComponentData>[],
      })
      .catch(() => {
        // Swallow this error
      });
  }

  /**
   * @param channelId
   * @param addToCache
   */
  public async addChannelSubscription(channelId: string, addToCache = true) {
    this.bambu.on('print:start', (job) => this.createNewStatusMessage(channelId, job));

    if (!addToCache) {
      return;
    }

    let subscriptions = await this.cache.get<string[]>('channel-subscriptions');

    if (!subscriptions) {
      subscriptions = [];
    }

    subscriptions.push(channelId);
    await this.cache.set('channel-subscriptions', subscriptions);
  }

  public async buildFiles(job: Job): Promise<[AttachmentBuilder] | []>;
  public async buildFiles(job: Job, toJson: true): Promise<[MessageFile] | []>;
  public async buildFiles(job: Job, toJson = false): Promise<[AttachmentBuilder | MessageFile] | []> {
    if (!job.gcodeThumbnail) {
      return [];
    }

    const builder = new AttachmentBuilder(job.gcodeThumbnail, { name: 'thumbnail.png' });

    return [toJson ? (builder.toJSON() as MessageFile) : builder];
  }

  public async buildEmbed(status: interfaces.Status) {
    const currentAms = status.amses.find((x) => x.trays.find((y) => y?.active));
    const currentTray = currentAms?.trays.find((x) => x?.active);
    const currentColor = currentTray?.color.toString(16).padStart(8, '0').substring(0, 6);

    return EmbedBuilder.from({
      title: status.subtaskName,
      description: this.getEmbedDescription(status) + '\n\nStage: ' + status.printStage.text,
      color: this.getColor(status),
      footer:
        currentAms && currentTray && currentColor
          ? {
              text: `Current Filament - AMS #${currentAms.id + 1} - Tray #${currentTray.id + 1} - #${currentColor}`,
              icon_url: `https://place-hold.it/128x128/${currentColor}`,
            }
          : undefined,
      thumbnail: { url: 'attachment://thumbnail.png' },
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
            `\`Estimated:\` ${prettyMs(status.estimatedTotalTime, {
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
          name: 'Lights',
          value:
            '' +
            status.lights
              .map((light) => {
                const name = snakeToPascalCase(light.name.replace(/_light$/, ''));

                return `\`${name}:\` ${light.mode}`;
              })
              .join('\n'),
          inline: true,
        },
        {
          name: 'Temps',
          value:
            `\`Bed:\` ${status.temperatures.bed.target}°C/${status.temperatures.bed.actual}°C\n` +
            `\`Nozzle:\` ${status.temperatures.extruder.target}°C/${status.temperatures.extruder.actual}°C\n` +
            `\`Chamber:\` ${status.temperatures.chamber.actual}°C\n` +
            status.temperatures.amses
              .map((ams, index) => `\`AMS ${index + 1}:\` ${status.temperatures.amses[index].actual}°C`)
              .join('\n'),
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
      ].concat(
        ...status.amses.map((ams) => ({
          name: `AMS ${ams.id + 1}`,
          value: `\`Temp:\` ${ams.temp}
\`Humidity:\` ${ams.humidity}
${ams.trays
  .map((tray, index) => {
    if (tray === undefined) {
      return `\`Tray ${index + 1}:\` Empty`;
    }

    return `\`Tray ${index + 1}:\` ${tray.type} - #${tray.color.toString(16).padStart(8, '0').toUpperCase()}${
      tray.active ? '  - ✏️' : ''
    }`;
  })
  .join('\n')}`,
          inline: false,
        })),
      ),
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

  private async initializeChannelSubscriptions() {
    const subscriptions = await this.cache.get<string[]>('channel-subscriptions');

    if (!subscriptions) {
      return;
    }

    subscriptions.forEach((channelId) => this.addChannelSubscription(channelId, false));
  }

  private async initializeStatuses(type: MessageType) {
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

  private async removeMessage([channelId, messageId]: [string, string], type: MessageType) {
    const messages: [string, string][] | undefined = await this.cache.get(type + '-messages');

    if (!messages) {
      return;
    }

    const index = messages.findIndex((x) => x[0] === channelId && x[1] === messageId);

    if (index >= 0) {
      messages.splice(index, 1);

      await this.cache.set(type + '-messages', messages);
    }

    clearInterval(this.intervals[`${channelId}:${messageId}`]);

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.intervals[`${channelId}:${messageId}`];
  }

  /**
   * @TODO
   *
   * Add them to a unique store to make sure that the subscriptions only create one message for each subscription
   *
   * @param channelId
   * @param job
   * @private
   */
  private async createNewStatusMessage(channelId: string, job: Job) {
    let subMessages = await this.cache.get<Record<string, string>>('subscription-channels');

    if (!subMessages) {
      subMessages = {};
    }

    if (subMessages[channelId]) {
      return;
    }

    console.log('Creating new status message from subscription', channelId);

    const channel = (await this.client.channels.fetch(channelId).catch(() => undefined)) as TextChannel | undefined;

    if (!channel) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete subMessages[channelId];
      await this.cache.set('subscription-channels', subMessages);

      return;
    }

    const msg = await channel.send({
      embeds: [await this.buildEmbed(job.status)],
      components: this.buildComponents() as unknown as ActionRowData<MessageActionRowComponentData>[],
      files: await this.buildFiles(job),
    });

    subMessages[channelId] = msg.id;

    await this.cache.set('subscription-channels', subMessages);

    await this.addNewStatus(msg, 'subscription');
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
        return `Currently printing @ ${status.progressPercent}%.\n${time} remaining`;

      case 'PAUSE':
        return `Currently paused @ ${status.progressPercent}%.\n${time} remaining`;

      case 'FINISH':
        return `Finished printing. Print took ${elapsedTime}`;

      case 'IDLE':
      default:
        return '';
    }
  }

  private getColor(status?: interfaces.Status) {
    switch (status?.state) {
      case 'PREPARE':
        return 0x002aff;

      case 'RUNNING':
        return 0x00ffff;

      case 'PAUSE':
        return 0xffff00;

      case 'FINISH':
        return 0x22ff00;

      case 'IDLE':
      default:
        return 0xffffff;
    }
  }
}
