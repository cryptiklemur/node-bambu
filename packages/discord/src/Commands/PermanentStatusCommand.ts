import type { CommandContext, SlashCreator } from 'slash-create';
import type { BambuClient } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { StatusService } from '../Service/StatusService';
import type { BambuBotConfiguration } from '../BambuBot';

export class PermanentStatusCommand extends BaseStatusCommand {
  public constructor(creator: SlashCreator, bambu: BambuClient, status: StatusService, config: BambuBotConfiguration) {
    super(creator, bambu, status, config, {
      name: 'perm-status',
      description: 'Replies with the current status of the printer, and continues to update it every minute',
    });
  }

  public override async run(context: CommandContext) {
    return this.status.sendStatusMessage('permanent', context);
  }
}
