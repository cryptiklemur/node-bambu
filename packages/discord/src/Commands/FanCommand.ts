import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';
import { Commands } from '@node-bambu/core';
import type { types } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

const fans = { big_1: 'Aux Fan', big_2: 'Chamber Fan', cooling: 'Part Cooling Fan' };

export class FanCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'fan',
      description: 'Manages fans on a printer',
      options: [
        {
          name: 'get',
          description: 'Returns fan information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'fan',
              description: 'Fan to get speed for',
              type: CommandOptionType.STRING,
              choices: Object.entries(fans).map(([value, name]) => ({ name, value })),
              required: true,
            },
            BaseStatusCommand.PRINTER_OPTION,
          ],
        },
        {
          name: 'set',
          description: 'Sets temperature information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'fan',
              description: 'Fan to set speed on',
              type: CommandOptionType.STRING,
              choices: Object.entries(fans).map(([value, name]) => ({ name, value })),
              required: true,
            },
            {
              name: 'speed',
              description: 'Speed to set the fan to, as a percent',
              type: CommandOptionType.INTEGER,
              required: true,
              min_value: 0,
              max_value: 100,
            },
            BaseStatusCommand.PRINTER_OPTION,
          ],
        },
      ],
    });
  }

  public override async runCommand(context: CommandContext, printer?: BambuRepositoryItem) {
    if (!printer) {
      return context.send('Could not find that printer.');
    }

    if (!printer.client.printerStatus.latestStatus) {
      return context.send('Could not fetch the status of the printer');
    }

    switch (context.subcommands[0]) {
      case 'get': {
        return this.getSpeed(context, printer);
      }

      case 'set': {
        return this.setSpeed(context, printer);
      }
    }

    return context.send('How did i get here');
  }

  private async getSpeed(context: CommandContext, printer: BambuRepositoryItem) {
    const fan = context.options['get'].fan as keyof typeof fans;
    const speed = printer.client.printerStatus.latestStatus?.fans[fan];

    return context.send(`Current speed for the ${fans[fan]} is \`${speed}%\``);
  }

  private async setSpeed(context: CommandContext, printer: BambuRepositoryItem) {
    const fan = context.options['set'].fan as keyof typeof fans;
    const speed = context.options['set'].speed as types.IntRange<0, 101>;

    await printer.client.executeCommand(new Commands.UpdateFanCommand(fan, speed));

    return context.send(`Speed of the ${fans[fan]} set to ${speed}%`);
  }
}
