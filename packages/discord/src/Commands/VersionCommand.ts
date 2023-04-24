import type { CommandContext, SlashCreator } from 'slash-create';
import type { DataSource } from 'typeorm';
import { EmbedBuilder } from 'discord.js';
import type { interfaces } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class VersionCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'version',
      description: 'Returns version information',
      options: [BaseStatusCommand.PRINTER_OPTION],
    });
  }

  public override async runCommand(context: CommandContext, printer?: BambuRepositoryItem) {
    if (!printer) {
      return context.send('Could not find that printer.');
    }

    if (!printer.client.device) {
      return context.send('Could not fetch the information of the printer');
    }

    return context.send({
      embeds: [
        EmbedBuilder.from({
          title: 'Version Information',
          author: {
            name: printer.printer.name,
            icon_url: printer.printer.iconUrl,
          },
          fields: printer.client.device.modules.map((module) => ({
            name: module.name,
            value: this.getDisplay(module),
            inline: true,
          })),
        }).toJSON(),
      ],
    });
  }

  private getDisplay(module: interfaces.Module): string {
    const fields = [];

    if (module.softwareVersion) {
      fields.push(`\`Software:\` ${module.softwareVersion}`);
    }

    if (module.hardwareVersion) {
      fields.push(`\`Hardware:\` ${module.hardwareVersion}`);
    }

    return fields.join('\n');
  }
}
