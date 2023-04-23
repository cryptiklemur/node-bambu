import type { CommandContext, SlashCreator } from 'slash-create';
import type { DataSource } from 'typeorm';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepository } from '../Repository/BambuRepository';
import type { StatusService } from '../Service/StatusService';

export class PermanentStatusCommand extends BaseStatusCommand {
  public constructor(
    database: DataSource,
    creator: SlashCreator,
    bambuRepository: BambuRepository,
    status: StatusService,
  ) {
    super(database, creator, bambuRepository, status, {
      name: 'perm-status',
      description: 'Replies with the current status of the printer. Continues to update it.',
      options: [BaseStatusCommand.PRINTER_OPTION],
    });
  }

  public override async runCommand(context: CommandContext) {
    return this.status.sendStatusMessage('permanent', context);
  }
}
