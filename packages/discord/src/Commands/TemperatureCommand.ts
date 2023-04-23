import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';
import { Commands } from '@node-bambu/core';
import type { interfaces, types } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class TemperatureCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'temperature',
      description: 'Manages temperatures on a printer',
      options: [
        {
          name: 'get',
          description: 'Returns temperature information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'item',
              description: 'Item to get temperature for',
              type: CommandOptionType.STRING,
              choices: ['extruder', 'bed', 'chamber', 'ams 1', 'ams 2', 'ams 3', 'ams 4'].map((x) => ({
                name: x,
                value: x,
              })),
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
              name: 'item',
              description: 'Item to set temperature on',
              type: CommandOptionType.STRING,
              choices: ['extruder', 'bed'].map((x) => ({ name: x, value: x })),
              required: true,
            },
            {
              name: 'temperature',
              description: 'Temperature to set',
              type: CommandOptionType.INTEGER,
              required: true,
              min_value: 0,
              max_value: 300,
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
        return this.getTemperature(context, printer);
      }

      case 'set': {
        return this.setTemperature(context, printer);
      }
    }

    return context.send('How did i get here');
  }

  private async getTemperature(context: CommandContext, printer: BambuRepositoryItem) {
    const item = context.options['get'].item as 'extruder' | 'bed' | 'chamber' | 'ams 1' | 'ams 2' | 'ams 3' | 'ams 4';
    let temperature: interfaces.Temperature | undefined;

    if (item.startsWith('ams ')) {
      const index = Number.parseInt(item.replace(/ams /, ''), 10);

      temperature = printer.client.printerStatus.latestStatus?.temperatures.amses[index - 1];
    } else {
      temperature = printer.client.printerStatus.latestStatus?.temperatures[item as 'extruder' | 'bed' | 'chamber'];
    }

    if (temperature?.target) {
      return context.send(
        `Current temperature for the ${context.options['get'].item} is \`${temperature.actual}°C\` of \`${temperature.target}°C\``,
      );
    }

    return context.send(`Current temperature for the ${context.options['get'].item} is \`${temperature?.actual}°C\``);
  }

  private async setTemperature(context: CommandContext, printer: BambuRepositoryItem) {
    const item = context.options['set'].item as 'extruder' | 'bed';
    const temperature = context.options['set'].temperature as types.IntRange<0, 300>;

    await printer.client.executeCommand(new Commands.UpdateTemperatureCommand(item, temperature));

    return context.send(`Temperature for the ${item} set to ${temperature}°C`);
  }
}
