import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';
import { Commands } from '@node-bambu/core';
import type { interfaces } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class LightCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'light',
      description: 'Manages lights on a printer',
      options: [
        {
          name: 'get',
          description: 'Returns light information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'item',
              description: 'Item to get light state for',
              type: CommandOptionType.STRING,
              choices: ['chamber', 'work', 'logo', 'nozzle'].map((x) => ({
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
          description: 'Sets light information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'item',
              description: 'Item to set light state on',
              type: CommandOptionType.STRING,
              choices: ['chamber', 'work', 'logo', 'nozzle'].map((x) => ({ name: x, value: x })),
              required: true,
            },
            {
              name: 'mode',
              description: 'Mode to set',
              type: CommandOptionType.STRING,
              required: true,
              choices: ['on', 'off'].map((x) => ({ name: x, value: x })),
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
        return this.getLight(context, printer);
      }

      case 'set': {
        return this.setLight(context, printer);
      }
    }

    return context.send('How did i get here');
  }

  private async getLight(context: CommandContext, printer: BambuRepositoryItem) {
    const item = context.options['get'].item as 'chamber' | 'work' | 'logo' | 'nozzle';
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

    if (item === 'chamber' || item === 'work') {
      const light = printer.client.printerStatus.latestStatus?.lights.find(
        (x) => x.name.replace(/_light$/, '') === item,
      );

      return context.send(`Current state of the ${item} light is \`${light?.mode}\``);
    }

    return context.send("Can't currently get the state of that light.");
  }

  private async setLight(context: CommandContext, printer: BambuRepositoryItem) {
    const item = context.options['set'].item as 'chamber' | 'work' | 'logo' | 'nozzle';
    const mode = context.options['set'].mode as 'on' | 'off';

    if (item === 'chamber') {
      await printer.client.executeCommand(new Commands.UpdateChamberLightCommand(mode));
    } else if (item === 'work') {
      return context.send("This light isn't supported yet");
    } else {
      await printer.client.executeCommand(new Commands.UpdateLightCommand(item, mode));
    }

    return context.send(`${item} light state changed to ${mode}`);
  }
}
