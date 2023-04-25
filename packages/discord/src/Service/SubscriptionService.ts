import { inject, injectable } from 'inversify';
import { DataSource } from 'typeorm';
import { interfaces } from '@node-bambu/core';
import type { Job } from '@node-bambu/core';
import type { TextChannel } from 'discord.js';
import { Client } from 'discord.js';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { Subscription } from '../Entity/Subscription';
import { BambuRepository } from '../Repository/BambuRepository';
import { MessageSenderService } from './MessageSenderService';
import { StatusService } from './StatusService';
import { StatusMessage } from '../Entity/StatusMessage';

@injectable()
export class SubscriptionService {
  public constructor(
    @inject('database') private database: DataSource,
    @inject('discord.client') private discord: Client,
    @inject('repository.bambu') private bambuRepository: BambuRepository,
    @inject('logger') private logger: interfaces.Logger,
    @inject('service.messageSender') private messageSender: MessageSenderService,
    @inject('service.status') private statusService: StatusService,
  ) {}

  public async initialize() {
    const subscriptions = await this.database.getRepository(Subscription).find();

    for (const subscription of subscriptions) {
      const printer = this.bambuRepository.findById(subscription.printer.id);

      if (!printer) {
        await this.database.manager.remove(subscription);

        continue;
      }

      await this.addChannelSubscription(printer, subscription, false);
    }
  }

  public async addChannelSubscription(printer: BambuRepositoryItem, subscription: Subscription, saveToDatabase = true) {
    printer.client.on('print:start', (job) => this.createNewStatusMessage(printer, subscription, job));

    if (saveToDatabase) {
      await this.database.manager.save(subscription);
    }
  }

  private async createNewStatusMessage(printer: BambuRepositoryItem, subscription: Subscription, job: Job) {
    this.logger.debug('Creating new status message from subscription', { ...printer, subscription });

    const channel = (await this.discord.channels.fetch(subscription.channelId).catch((error) => {
      console.error(error);
    })) as TextChannel | undefined;

    if (!channel) {
      await this.database.manager.remove(subscription);

      return;
    }

    const message = await this.messageSender.sendMessage(channel, {
      content: '',
      embeds: await this.statusService.buildEmbeds(printer, job),
      components: this.statusService.buildComponents(printer),
      files: await this.statusService.buildFiles(job),
    });

    await this.statusService.addMessage(
      await this.database.manager.save(
        new StatusMessage({
          channelId: subscription.channelId,
          messageId: message.id,
          createdBy: subscription.createdBy,
          type: 'subscription',
          printer: printer.printer,
        }),
      ),
    );
  }
}
