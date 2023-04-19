import type { CommandContext, SlashCreator } from 'slash-create';
import type { BambuClient } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { StatusService } from '../Service/StatusService';
import type { BambuBotConfiguration } from '../BambuBot';

export class SubscribeCommand extends BaseStatusCommand {
  public constructor(creator: SlashCreator, bambu: BambuClient, status: StatusService, config: BambuBotConfiguration) {
    super(creator, bambu, status, config, {
      name: 'subscribe',
      description: 'Subscribes the current channel to posts from the bot when a print starts',
    });
  }

  public override async run(context: CommandContext) {
    await this.status.addChannelSubscription(context.channelID);

    return context.send('Channel subscribed to updates', { ephemeral: true });
  }
}
