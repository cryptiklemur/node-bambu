import * as path from 'node:path';

import { inject, injectable } from 'inversify';
import { ComponentType, Client, EmbedBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import type {
  MessageCreateOptions,
  TextChannel,
  Attachment,
  Message,
  APIEmbedField,
  MessageEditOptions,
} from 'discord.js';
import { DataSource } from 'typeorm';
import { Job, interfaces } from '@node-bambu/core';
import { CommandContext } from 'slash-create';
import prettyMs from 'pretty-ms';
import dayjs from 'dayjs';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';
import { Subscription } from '../Entity/Subscription';
import { MessageSenderService } from './MessageSenderService';
import { snakeToPascalCase } from '../Util/snakeToPascalCase';
import { StatusMessage } from '../Entity/StatusMessage';
import { Owner } from '../Entity/Owner';

type MessageType = 'permanent' | 'semi-permanent' | 'subscription';

@injectable()
export class StatusService {
  private intervals: Record<string, NodeJS.Timer> = {};

  public constructor(
    @inject('discord.client') private discord: Client,
    @inject('database') private database: DataSource,
    @inject('repository.bambu') private bambuRepository: BambuRepository,
    @inject('logger') private logger: interfaces.Logger,
    @inject('service.messageSender') private messageSender: MessageSenderService,
  ) {}

  public async initialize() {
    const statusMessages = await this.database.getRepository(StatusMessage).find();
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    const promises: Promise<void | Message<true>>[] = [];

    for (const statusMessage of statusMessages) {
      this.logger.debug(`${statusMessage.type} message found: ${statusMessage.channelId}:${statusMessage.messageId}`);
      promises.push(this.updateMessage(statusMessage));
      this.intervals[statusMessage.id] = setInterval(() => this.updateMessage(statusMessage), 5 * 1000);
    }

    await Promise.all(promises);
  }

  public async sendStatusMessage(type: MessageType, contextOrChannel: CommandContext | TextChannel) {
    const printer = await this.getPrinter(contextOrChannel);

    if (!printer) {
      await this.messageSender.sendMessage(contextOrChannel, { content: 'Printer not found' });

      return;
    }

    const job = printer.client.printerStatus.currentJob;

    if (!job) {
      await this.sendIdleMessage(contextOrChannel);

      return;
    }

    const message = await this.messageSender
      .sendMessage(contextOrChannel, {
        content: '',
        embeds: await this.buildEmbeds(printer, job),
        components: this.buildComponents(printer),
        files: await this.buildFiles(job),
      })
      .catch(this.logger.error);

    if (!message) {
      return;
    }

    const owner = await this.getOwner(contextOrChannel);
    const status = await this.database.manager.save(
      new StatusMessage({
        channelId: message.channelId,
        messageId: message.id,
        createdBy: contextOrChannel instanceof CommandContext ? owner : undefined,
        type,
        printer: printer.printer,
      }),
    );

    this.intervals[status.id] = setInterval(() => this.updateMessage(status), 5 * 1000);
  }

  public async sendIdleMessage(contextOrChannel: CommandContext | TextChannel) {
    const printer = await this.getPrinter(contextOrChannel);

    if (!printer) {
      return this.messageSender.sendMessage(contextOrChannel, { content: 'Printer not found' });
    }

    const status = printer.client.printerStatus.latestStatus;

    if (!status) {
      return this.messageSender.sendMessage(contextOrChannel, {
        content: 'Printer is currently offline',
        embeds: [],
        components: [],
        files: [],
      });
    }

    return this.messageSender.sendMessage(contextOrChannel, {
      content: '',
      embeds: await this.buildEmbeds(printer, status),
      components: this.buildComponents(printer),
      files: [],
    });
  }

  public async buildEmbeds({ printer }: BambuRepositoryItem, jobOrStatus: Job | interfaces.Status) {
    const job = jobOrStatus instanceof Job ? jobOrStatus : undefined;
    const status = jobOrStatus instanceof Job ? jobOrStatus.status : jobOrStatus;

    const currentAms = status.amses.find((x) => x.trays.find((y) => y?.active));
    const currentTray = currentAms?.trays.find((x) => x?.active);
    const currentColor = currentTray?.color.toString(16).padStart(8, '0').slice(0, 6);

    const plate = status.gcodeFile.replace(/\/data\/Metadata\//, '').replace(/\.gcode$/, '');

    return [
      EmbedBuilder.from({
        author: {
          name: printer.name,
          icon_url: printer.iconUrl,
        },
        title: status.printType === 'cloud' ? status.subtaskName : 'Local Print - Unable to get more info',
        description: this.getEmbedDescription(status) + '\n\nStage: ' + status.printStage.text,
        color: this.getColor(status),
        footer:
          currentAms && currentTray && currentColor
            ? {
                text: `Current Filament - AMS #${currentAms.id + 1} - Tray #${currentTray.id + 1} - #${currentColor}`,
                icon_url: `https://place-hold.it/128x128/${currentColor}`,
              }
            : undefined,
        thumbnail: job?.gcodeThumbnail ? { url: `attachment://${plate}.png` } : undefined,
        image: job?.latestThumbnail ? { url: `attachment://${path.basename(job.latestThumbnail)}` } : undefined,
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
            value: `\`Percent:\` ${status.progressPercent}%\n\`Layer:\` ${status.currentLayer} / ${status.maxLayers}\n\`Speed:\` ${status.speed.name} (${status.speed.percent}%)`,
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
              `\`Bed:\` ${status.temperatures.bed.actual}°C/${status.temperatures.bed.target}°C\n` +
              `\`Nozzle:\` ${status.temperatures.extruder.actual}°C/${status.temperatures.extruder.target}°C\n` +
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
          ...status.amses.map((ams) => ({
            name: `AMS ${ams.id + 1}`,
            value: `\`Temp:\` ${ams.realTemp ?? ams.temp}º C
\`Humidity:\` ${ams.humidityPercent ?? 'Unknown'}%
${ams.trays
  .map((tray, index) => {
    if (tray === undefined) {
      return `\`T${index + 1}:\` Empty`;
    }

    return `\`T${index + 1}:\` ${tray.type} - #${tray.color.toString(16).padStart(8, '0').toUpperCase()}`;
  })
  .join('\n')}`,
            inline: true,
          })),
          status.hms.length > 0
            ? {
                name: 'Errors',
                value: await Promise.all(
                  status.hms.map(async (x, index) => {
                    if (x.url) {
                      return `\`${index + 1}:\` [${(await x.description) ?? x.code}](${x.url})`;
                    }

                    return `\`${index + 1}:\` ${(await x.description) ?? x.code}`;
                  }),
                ).then((x) => x.join('\n')),
              }
            : undefined,
        ].filter(Boolean) as APIEmbedField[],
      }).toJSON(),
    ];
  }

  public buildComponents({ printer }: BambuRepositoryItem): MessageCreateOptions['components'] {
    return [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: '',
            custom_id: `${printer.id}:toggle-print-status`,
            emoji: {
              name: '⏸️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            label: '',
            custom_id: `${printer.id}:stop-print`,
            emoji: {
              name: '🛑',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Speed',
            custom_id: `${printer.id}:speed-up`,
            emoji: {
              name: '⬆️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Speed',
            custom_id: `${printer.id}:slow-down`,
            emoji: {
              name: '⬇️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Toggle',
            custom_id: `${printer.id}:toggle-lights`,
            emoji: {
              name: '💡',
            },
          },
        ],
      },
    ];
  }

  public async buildFiles(
    job: Job,
    toJson = false,
    message?: Message,
  ): Promise<(Attachment | AttachmentBuilder)[] | [] | undefined> {
    if (!job.gcodeThumbnail && !job.latestThumbnail) {
      return [];
    }

    const files: AttachmentBuilder[] = [];

    const plate = job.status.gcodeFile.replace(/\/data\/Metadata\//, '').replace(/\.gcode$/, '');

    const hasAttachments =
      message?.embeds[0]?.thumbnail?.url &&
      job.latestThumbnail &&
      message.embeds[0]?.image?.url.includes(path.basename(job.latestThumbnail));

    if (job.gcodeThumbnail && (!hasAttachments || (!job.latestThumbnail && !message.embeds[0]?.thumbnail?.url))) {
      files.push(new AttachmentBuilder(job.gcodeThumbnail, { name: `${plate}.png` }));
    }

    if (job.latestThumbnail && !hasAttachments) {
      files.push(new AttachmentBuilder(job.latestThumbnail, { name: path.basename(job.latestThumbnail) }));
    }

    if (files.length === 0) {
      return undefined;
    }

    return toJson ? (files.map((x) => x.toJSON()) as Attachment[]) : files;
  }

  public async getOwner(contextOrChannel: CommandContext | TextChannel) {
    if (contextOrChannel instanceof CommandContext) {
      const owner = await this.database.getRepository(Owner).findOneBy({ id: contextOrChannel.user.id });

      if (owner) {
        return owner;
      }

      return this.database.manager.save(new Owner(contextOrChannel.user.id));
    }

    return;
  }

  private async updateMessage(status: StatusMessage) {
    const channel = (await this.discord.channels.fetch(status.channelId).catch(() => {})) as TextChannel | undefined;
    const message = await channel?.messages
      .fetch({ message: status.messageId, cache: false, force: true })
      .catch(() => {});

    if (!message || !channel) {
      return this.removeStatus(status);
    }

    const printer = this.bambuRepository.findByStatus(status);

    if (!printer) {
      return this.removeStatus(status);
    }

    let job = printer.client.printerStatus.currentJob;

    this.logger.silly?.(`Updating status message`, {
      printer: status.printer.name,
      type: status.type,
      channel: status.channelId,
      message: status.messageId,
    });

    if (!job) {
      await this.removeStatus(status);

      if (status.type === 'semi-permanent') {
        job = printer.client.printerStatus.lastJob;
      }

      if (!job) {
        if (!printer.client.printerStatus.latestStatus) {
          return this.messageSender.sendMessage(channel, {
            content: 'Printer is currently offline',
            embeds: [],
            components: [],
            files: [],
          });
        }

        await message.edit({
          content: '',
          embeds: await this.buildEmbeds(printer, printer.client.printerStatus.latestStatus),
          components: this.buildComponents(printer),
          files: [],
        });

        return;
      }
    }

    const content: MessageEditOptions = {
      content: '',
      embeds: await this.buildEmbeds(printer, job),
      components: this.buildComponents(printer),
      files: await this.buildFiles(job, false, message),
    };

    await message.edit(content).catch(this.logger.error);
  }

  private async removeStatus(status: StatusMessage) {
    if (status.type === 'permanent') {
      return;
    }

    clearInterval(this.intervals[status.id]);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.intervals[status.id];

    await this.database.manager.remove(status);
  }

  private async getPrinter(contextOrChannel: CommandContext | TextChannel): Promise<BambuRepositoryItem | undefined> {
    if (contextOrChannel instanceof CommandContext) {
      return this.bambuRepository.get(contextOrChannel.options['printer']);
    }

    const subscription = await this.database.getRepository(Subscription).findOneBy({ channelId: contextOrChannel.id });

    return subscription ? this.bambuRepository.get(subscription.printer.host) : undefined;
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
      case 'PREPARE': {
        return `Preparing to print. ${time} to print`;
      }

      case 'RUNNING': {
        return `Currently printing @ ${status.progressPercent}%.\n${time} remaining`;
      }

      case 'PAUSE': {
        return `Currently paused @ ${status.progressPercent}%.\n${time} remaining`;
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

  private getColor(status?: interfaces.Status) {
    switch (status?.state) {
      case 'PREPARE': {
        return 0x00_2a_ff;
      }

      case 'RUNNING': {
        return 0x00_ff_ff;
      }

      case 'PAUSE': {
        return 0xff_ff_00;
      }

      case 'FINISH': {
        return 0x22_ff_00;
      }

      // case 'IDLE':
      default: {
        return 0xff_ff_ff;
      }
    }
  }
}
