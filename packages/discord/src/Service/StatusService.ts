import { inject, injectable } from 'inversify';
import { Client } from 'discord.js';
import type { TextChannel, Message } from 'discord.js';
import { DataSource } from 'typeorm';
import { interfaces } from '@node-bambu/core';
import { CommandContext } from 'slash-create';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';
import { Subscription } from '../Entity/Subscription';
import { MessageSenderService } from './MessageSenderService';
import { StatusMessage } from '../Entity/StatusMessage';
import { Owner } from '../Entity/Owner';
import { MessageBuilder } from './MessageBuilder';

type MessageType = 'permanent' | 'semi-permanent' | 'subscription';

@injectable()
export class StatusService {
  private intervals: Record<string, NodeJS.Timer> = {};

  public constructor(
    @inject('discord.client') private discord: Client,
    @inject('database') private database: DataSource,
    @inject('repository.bambu') private bambuRepository: BambuRepository,
    @inject('logger') private logger: interfaces.Logger,
    @inject('service.messageSender') private messageSender: MessageSenderService,
  ) {}

  public async initialize() {
    const statusMessages = await this.database.getRepository(StatusMessage).find();

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    const promises: Promise<void | Message<true>>[] = [];

    for (const statusMessage of statusMessages) {
      promises.push(this.addMessage(statusMessage));
    }

    await Promise.all(promises);
  }

  public async addMessage(statusMessage: StatusMessage) {
    this.logger.debug(
      'StatusService: %s message found %s:%s',
      statusMessage.type,
      statusMessage.channelId,
      statusMessage.messageId,
    );
    this.intervals[statusMessage.id] = setInterval(() => this.updateMessage(statusMessage), 5 * 1000);
    await this.updateMessage(statusMessage);
  }

  public async sendStatusMessage(type: MessageType, contextOrChannel: CommandContext | TextChannel) {
    const printer = await this.getPrinter(contextOrChannel);

    if (!printer) {
      await this.messageSender.sendMessage(contextOrChannel, { content: 'Printer not found' });

      return;
    }

    const job = printer.client.printerStatus.currentJob;

    if (!job) {
      await this.sendIdleMessage(contextOrChannel);

      return;
    }

    const message = await this.messageSender
      .sendMessage(contextOrChannel, await MessageBuilder.buildMessage(printer, undefined, job))
      .catch(this.logger.error);

    if (!message) {
      return;
    }

    const owner = await this.getOwner(contextOrChannel);
    const status = await this.database.manager.save(
      new StatusMessage({
        channelId: message.channelId,
        messageId: message.id,
        createdBy: contextOrChannel instanceof CommandContext && owner ? owner : undefined,
        type,
        printer: printer.printer,
      }),
    );

    this.intervals[status.id] = setInterval(() => this.updateMessage(status), 5 * 1000);
  }

  public async sendIdleMessage(contextOrChannel: CommandContext | TextChannel) {
    const printer = await this.getPrinter(contextOrChannel);

    if (!printer) {
      return this.messageSender.sendMessage(contextOrChannel, { content: 'Printer not found' });
    }

    const status = printer.client.printerStatus.latestStatus;

    return this.messageSender.sendMessage(
      contextOrChannel,
      await MessageBuilder.buildMessage(printer, undefined, status),
    );
  }

  public async getOwner(contextOrChannel: CommandContext | TextChannel): Promise<Owner | undefined> {
    if (contextOrChannel instanceof CommandContext) {
      const owner = await this.database.getRepository(Owner).findOneBy({ id: contextOrChannel.user.id });

      if (owner) {
        return owner;
      }

      return this.database.manager.save(new Owner(contextOrChannel.user.id));
    }

    return;
  }

  private async updateMessage(status: StatusMessage) {
    const channel = (await this.discord.channels.fetch(status.channelId).catch(() => {})) as TextChannel | undefined;
    const message = await channel?.messages.fetch({ message: status.messageId }).catch(() => {});

    const printer = this.bambuRepository.findByStatus(status);

    if (!printer || !message || !channel) {
      if (status.type === 'permanent') {
        return;
      }

      return this.removeStatus(status);
    }

    let job = printer.client.printerStatus.currentJob;

    this.logger.debug(`StatusService: Updating status message`, {
      printer: status.printer.name,
      type: status.type,
      msgId: status.channelId + ':' + status.messageId,
      job: job?.id,
    });

    if (!job) {
      if (status.type !== 'permanent') {
        await this.removeStatus(status);
      }

      if (status.type === 'semi-permanent') {
        job = printer.client.printerStatus.lastJob;
      }
    }

    await MessageBuilder.editMessage(message, printer, job);
  }

  private async removeStatus(status: StatusMessage) {
    clearInterval(this.intervals[status.id]);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.intervals[status.id];

    await this.database.manager.remove(status).catch(this.logger.error);
  }

  private async getPrinter(contextOrChannel: CommandContext | TextChannel): Promise<BambuRepositoryItem | undefined> {
    if (contextOrChannel instanceof CommandContext) {
      return this.bambuRepository.get(contextOrChannel.options['printer']);
    }

    const subscription = await this.database.getRepository(Subscription).findOneBy({ channelId: contextOrChannel.id });

    return subscription ? this.bambuRepository.get(subscription.printer.host) : undefined;
  }
}
