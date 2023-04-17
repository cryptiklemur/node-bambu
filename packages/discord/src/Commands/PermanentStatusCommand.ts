import type { CommandContext, SlashCreator } from 'slash-create';
import type { BambuClient } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { StatusService } from '../Service/StatusService';

export class PermanentStatusCommand extends BaseStatusCommand {
  public constructor(creator: SlashCreator, bambu: BambuClient, status: StatusService) {
    super(creator, bambu, status, {
      name: 'perm-status',
      description: 'Replies with the current status of the printer, and continues to update it every minute',
    });
  }

  public override async run(ctx: CommandContext) {
    await ctx.send('Fetching status');

    const job = this.bambu.printerStatus.currentJob;

    if (!job) {
      return ctx.editOriginal('Printer is currently idle');
    }

    const msg = await ctx.editOriginal({
      content: '',
      embeds: [await this.status.buildEmbed(job.status)],
    });

    await this.status.addNewStatus(msg, 'permanent');

    return msg;
  }
}
