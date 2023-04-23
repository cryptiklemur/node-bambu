import type { CommandContext } from 'slash-create';
import { DataSource } from 'typeorm';
import { SlashCommandOptions, SlashCreator } from 'slash-create';
import { inject } from 'inversify';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';
import { StatusService } from '../Service/StatusService';
import { SubscriptionService } from '../Service/SubscriptionService';
import { Subscription } from '../Entity/Subscription';
import { Owner } from '../Entity/Owner';

export class UnsubscribeCommand extends BaseStatusCommand {
  public constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('repository.bambu') bambuRepository: BambuRepository,
    @inject('service.status') status: StatusService,
    @inject('service.subscription') private subscriptionService: SubscriptionService,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, bambuRepository, status, {
      ...options,
      name: 'unsubscribe',
      description: 'Unsubscribes the current channel from posts from the bot when a print starts',
      options: [BaseStatusCommand.PRINTER_OPTION],
    });
  }

  public override async runCommand(context: CommandContext, printer?: BambuRepositoryItem) {
    if (!printer) {
      return context.send('Could not find that printer.');
    }

    await this.database.getRepository(Subscription).delete({
      channelId: context.channelID,
      createdBy: new Owner(context.user.id),
      printer: printer.printer,
    });

    return context.send('Channel unsubscribed from updates', { ephemeral: true });
  }
}
