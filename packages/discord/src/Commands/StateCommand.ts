import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';
import { Commands } from '@node-bambu/core';
import type { interfaces } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository, BambuRepositoryItem } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class StateCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'state',
      description: 'Manage the state of the printer',
      options: [
        {
          name: 'get',
          description: 'Returns state information',
          type: CommandOptionType.SUB_COMMAND,
          options: [BaseStatusCommand.PRINTER_OPTION],
        },
        {
          name: 'set',
          description: 'Sets state information',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'state',
              description: 'State to set',
              type: CommandOptionType.STRING,
              choices: ['pause', 'resume', 'stop'].map((x) => ({ name: x, value: x })),
              required: true,
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
        return this.getState(context, printer);
      }

      case 'set': {
        return this.setState(context, printer);
      }
    }

    return context.send('How did i get here');
  }

  private async getState(context: CommandContext, printer: BambuRepositoryItem) {
    const stateMap: Record<interfaces.Status['state'], string> = {
      PAUSE: 'paused',
      PREPARE: 'preparing',
      FINISH: 'finished',
      IDLE: 'idle',
      RUNNING: 'printing',
    };

    return context.send(
      `Current state for the printer is \`${stateMap[printer.client.printerStatus.latestStatus?.state ?? 'IDLE']}\``,
    );
  }

  private async setState(context: CommandContext, printer: BambuRepositoryItem) {
    const state = context.options['set'].state as 'pause' | 'resume' | 'stop';

    await printer.client.executeCommand(new Commands.UpdateStateCommand(state));

    switch (state) {
      case 'pause': {
        return context.send(`Pausing the print`);
      }
      case 'resume': {
        return context.send('Resuming the print');
      }
      case 'stop': {
        return context.send('Stopping the print');
      }
    }
  }
}
