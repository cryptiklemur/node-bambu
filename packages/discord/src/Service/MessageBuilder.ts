import path from 'node:path';

import prettyMs from 'pretty-ms';
import dayjs from 'dayjs';
import { Job } from '@node-bambu/core';
import type { interfaces } from '@node-bambu/core';
import type {
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  APIEmbed,
  APIEmbedField,
  Attachment,
} from 'discord.js';
import { EmbedBuilder, AttachmentBuilder, ComponentType, ButtonStyle } from 'discord.js';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { snakeToPascalCase } from '../Util/snakeToPascalCase';

export class MessageBuilder {
  public static async buildMessage(
    printer: BambuRepositoryItem,
    message?: Message,
    jobOrStatus?: Job | interfaces.Status,
  ): Promise<MessageCreateOptions & MessageEditOptions> {
    return new MessageBuilder(printer, message, jobOrStatus).create();
  }

  public static async editMessage(
    message: Message,
    printer: BambuRepositoryItem,
    jobOrStatus?: Job | interfaces.Status,
  ) {
    return message.edit(await MessageBuilder.buildMessage(printer, message, jobOrStatus));
  }

  private constructor(
    protected printer: BambuRepositoryItem,
    protected message?: Message,
    protected jobOrStatus?: Job | interfaces.Status,
  ) {}

  public async create(): Promise<MessageCreateOptions & MessageEditOptions> {
    if (!this.jobOrStatus) {
      if (!this.printer.client.printerStatus.latestStatus) {
        return { content: 'Printer is currently offline', embeds: [], components: [], files: [] };
      }

      return {
        content: '',
        embeds: await this.buildEmbeds(this.printer.client.printerStatus.latestStatus),
        components: await this.buildComponents(),
        files: await this.buildFiles(),
      };
    }

    return {
      content: '',
      embeds: await this.buildEmbeds(),
      components: await this.buildComponents(),
      files: await this.buildFiles(),
    };
  }

  private async buildEmbeds(statusOverride?: interfaces.Status): Promise<[APIEmbed] | []> {
    const job = this.jobOrStatus instanceof Job ? this.jobOrStatus : undefined;
    const status = statusOverride ?? job?.status;

    if (!status) {
      return [];
    }

    const currentAms = status.amses.find((x) => x.trays.find((y) => y?.active));
    const currentTray = currentAms?.trays.find((x) => x?.active);
    const currentColor = currentTray?.color.toString(16).padStart(8, '0').slice(0, 6);

    const plate = status.gcodeFile.replace(/\/data\/Metadata\//, '').replace(/\.gcode$/, '');

    return [
      EmbedBuilder.from({
        author: {
          name: this.printer.printer.name,
          icon_url: this.printer.printer.iconUrl,
        },
        title: status.printType === 'cloud' ? status.subtaskName : 'Local Print - Unable to get more info',
        description: `${this.getEmbedDescription(status)}${
          status.printStage.text ? '\n\nStage: ' + status.printStage.text : ''
        }${this.printer.printer.streamUrl ? `\n\n[Link to stream](${this.printer.printer.streamUrl})` : ''}`,
        color: this.getColor(status),
        footer:
          currentAms && currentTray && currentColor
            ? {
                text: `Current Filament - AMS #${currentAms.id + 1} - Tray #${currentTray.id + 1} - #${currentColor}`,
                icon_url: `https://place-hold.it/128x128/${currentColor}&text=&nbsp;`,
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
    if (!tray?.type) {
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

  private async buildComponents(): Promise<MessageCreateOptions['components']> {
    return [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: '',
            custom_id: `${this.printer.printer.id}:toggle-print-status`,
            emoji: {
              name: '⏸️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            label: '',
            custom_id: `${this.printer.printer.id}:stop-print`,
            emoji: {
              name: '🛑',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Speed',
            custom_id: `${this.printer.printer.id}:speed-up`,
            emoji: {
              name: '⬆️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Speed',
            custom_id: `${this.printer.printer.id}:slow-down`,
            emoji: {
              name: '⬇️',
            },
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: 'Toggle',
            custom_id: `${this.printer.printer.id}:toggle-lights`,
            emoji: {
              name: '💡',
            },
          },
        ],
      },
    ];
  }

  private async buildFiles(toJson = false): Promise<(Attachment | AttachmentBuilder)[] | [] | undefined> {
    if (!(this.jobOrStatus instanceof Job)) {
      return;
    }

    if (!this.jobOrStatus.gcodeThumbnail && !this.jobOrStatus.latestThumbnail) {
      return [];
    }

    const files: AttachmentBuilder[] = [];

    const plate = this.jobOrStatus.status.gcodeFile.replace(/\/data\/Metadata\//, '').replace(/\.gcode$/, '');

    const hasAttachments =
      this.message &&
      (!!this.message.embeds[0]?.thumbnail?.proxyURL?.includes(`${plate}.png`) ||
        !!this.message.attachments.some((x) => x.proxyURL.includes(`${plate}.png`))) &&
      !!this.jobOrStatus.latestThumbnail &&
      !!this.message.embeds[0]?.image?.proxyURL?.includes(path.basename(this.jobOrStatus.latestThumbnail));

    console.dir(
      {
        hasAttachments,
        message: {
          thumbnail: this.message?.embeds[0]?.thumbnail,
          image: this.message?.embeds[0].image,
          files: this.message?.attachments,
        },
      },
      { depth: 10 },
    );

    if (
      this.jobOrStatus.gcodeThumbnail &&
      (!hasAttachments || (!this.jobOrStatus.latestThumbnail && !this.message?.embeds[0]?.thumbnail?.url))
    ) {
      files.push(new AttachmentBuilder(this.jobOrStatus.gcodeThumbnail, { name: `${plate}.png` }));
    }

    if (this.jobOrStatus.latestThumbnail && !hasAttachments) {
      files.push(
        new AttachmentBuilder(this.jobOrStatus.latestThumbnail, {
          name: path.basename(this.jobOrStatus.latestThumbnail),
        }),
      );
    }

    if (files.length === 0) {
      return undefined;
    }

    return toJson ? (files.map((x) => x.toJSON()) as Attachment[]) : files;
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
