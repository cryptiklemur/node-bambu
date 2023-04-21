import type { CommandContext, SlashCreator } from 'slash-create';
import { CommandOptionType } from 'slash-create';
import type { DataSource } from 'typeorm';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class StatusCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'status',
      description: 'Replies with the current status of the printer. Stops updating after print is finished.',
      options: [
        {
          name: 'printer',
          description: 'Printer to check',
          type: CommandOptionType.STRING,
          autocomplete: true,
        },
      ],
    });
  }

  public override async run(context: CommandContext) {
    if (!(await this.isPrinterOptionRequiredAndSet(context))) {
      return context.send('You must specify a printer with this command.');
    }

    return this.status.sendStatusMessage('semi-permanent', context);
  }
}
