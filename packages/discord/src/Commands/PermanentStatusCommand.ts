import { CommandContext, Message, SlashCreator } from 'slash-create';
import { BambuClient } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';

export class PermanentStatusCommand extends BaseStatusCommand {
  constructor(creator: SlashCreator, bambu: BambuClient) {
    super(creator, bambu, {
      name: 'perm-status',
      description:
        'Replies with the current status of the printer, and continues to update it every minute',
    });
  }

  public override async run(ctx: CommandContext) {
    await ctx.send('Fetching status');
    const status = this.bambu.getStatus();
    if (!status) {
      return ctx.editOriginal('Printer is currently unavailable');
    }
    if (status.state === 'IDLE') {
      return ctx.editOriginal('Printer is currently idle');
    }

    const msg = await ctx.editOriginal({
      content: '',
      embeds: [this.buildEmbed(status).toJSON()],
    });
    setInterval(() => this.updateMessage(msg), 30 * 1000);

    return msg;
  }

  private updateMessage(msg: Message) {
    const status = this.bambu.getStatus();
    if (!status) {
      return msg.edit('Printer is currently unavailable');
    }
    if (status.state === 'IDLE') {
      return msg.edit('Printer is currently idle');
    }

    return msg.edit({ embeds: [this.buildEmbed(status).toJSON()] });
  }
}
