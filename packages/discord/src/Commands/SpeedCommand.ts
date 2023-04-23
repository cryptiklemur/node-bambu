import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';
import type { types } from '@node-bambu/core';
import { Commands } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class SpeedCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'speed',
      description: 'Manages speed on a printer',
      options: [
        {
          name: 'get',
          description: 'Returns speed',
          type: CommandOptionType.SUB_COMMAND,
          options: [BaseStatusCommand.PRINTER_OPTION],
        },
        {
          name: 'set',
          description: 'Sets speed',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'speed',
              description: 'Speed to set',
              type: CommandOptionType.STRING,
              required: true,
              choices: ['Silent', 'Standard', 'Sport', 'Ludicrous'].map((x) => ({ name: x, value: x.toLowerCase() })),
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
    const speed = printer.client.printerStatus.latestStatus?.speed;

    return context.send(`Current speed for the ${printer.printer.name} is \`${speed?.name} (${speed?.percent}%)\``);
  }

  private async setSpeed(context: CommandContext, printer: BambuRepositoryItem) {
    const speed = context.options['set'].speed as 'silent' | 'standard' | 'sport' | 'ludicrous';
    const speedMap = { silent: 1, standard: 2, sport: 3, ludicrous: 4 };
    const speedPercentMap = { silent: 50, standard: 100, sport: 124, ludicrous: 166 };

    await printer.client.executeCommand(new Commands.UpdateSpeedCommand(speedMap[speed] as types.IntRange<1, 5>));

    return context.send(`Speed set to \`${speed} (${speedPercentMap[speed]}%)\``);
  }
}
