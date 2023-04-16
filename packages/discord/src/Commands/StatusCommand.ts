import { CommandContext, SlashCreator } from 'slash-create';
import { BambuClient } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';

export class StatusCommand extends BaseStatusCommand {
  constructor(creator: SlashCreator, bambu: BambuClient) {
    super(creator, bambu, {
      name: 'status',
      description: 'Replies with the current status of the printer',
    });
  }

  public override async run(ctx: CommandContext) {
    const status = this.bambu.getStatus();
    if (!status) {
      return ctx.send('Printer is currently unavailable');
    }
    if (status.state === 'IDLE') {
      return ctx.send('Printer is currently idle');
    }

    return ctx.send({
      embeds: [this.buildEmbed(status).toJSON()],
      ephemeral: false,
    });
  }
}
