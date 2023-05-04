import type { AutocompleteContext, CommandContext, SlashCommand } from 'slash-create';
import { CommandOptionType, SlashCommandOptions, SlashCreator } from 'slash-create';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';
import type { Channel, Message, MessageCreateOptions, MessageEditOptions } from 'discord.js';
import { BaseGuildTextChannel, EmbedBuilder } from 'discord.js';

import { AbstractCommand } from './AbstractCommand';
import { Queue } from '../Entity/Queue';
import { QueueItem } from '../Entity/QueueItem';

@injectable()
export class QueueCommand extends AbstractCommand {
  public constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, {
      name: 'queue',
      description: 'Manage queues for your printers',
      deferEphemeral: true,
      options: [
        {
          name: 'create',
          description: 'Create a new print queue',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'name',
              description: 'Name of the print queue',
              type: CommandOptionType.STRING,
              required: true,
            },
            {
              name: 'description',
              description: 'Description of the print queue',
              type: CommandOptionType.STRING,
            },
            {
              name: 'channel',
              description: 'Channel to display the queue in',
              type: CommandOptionType.CHANNEL,
            },
          ],
        },
        {
          name: 'edit',
          description: 'Edit a print queue',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'queue',
              description: 'Queue to edit',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true,
            },
            {
              name: 'name',
              description: 'New name of the print queue',
              type: CommandOptionType.STRING,
            },
            {
              name: 'description',
              description: 'New description of the print queue',
              type: CommandOptionType.STRING,
            },
            {
              name: 'channel',
              description: 'New channel to display the queue in (will delete the old one)',
              type: CommandOptionType.CHANNEL,
            },
          ],
        },
        {
          name: 'item',
          description: 'Manage queue items',
          type: CommandOptionType.SUB_COMMAND_GROUP,
          options: [
            {
              name: 'add',
              description: 'Add item to print queue',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'queue',
                  description: 'Queue to add item to',
                  type: CommandOptionType.STRING,
                  required: true,
                  autocomplete: true,
                },
                {
                  name: 'name',
                  description: "Name of the item you're adding",
                  type: CommandOptionType.STRING,
                  required: true,
                },
                {
                  name: 'description',
                  description: "Description of the item you're adding",
                  type: CommandOptionType.STRING,
                },
                {
                  name: 'link',
                  description: "URL to the item you're adding",
                  type: CommandOptionType.STRING,
                },
              ],
            },
            {
              name: 'remove',
              description: 'Remove item item from print queue',
              type: CommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: 'queue',
                  description: 'Queue to remove item from',
                  type: CommandOptionType.STRING,
                  required: true,
                  autocomplete: true,
                },
                {
                  name: 'name',
                  description: "Name of the item you're removing",
                  type: CommandOptionType.STRING,
                  required: true,
                  autocomplete: true,
                },
                {
                  name: 'purge',
                  description: 'If yes, will just remove the item from the queue, instead of marking as printed',
                  type: CommandOptionType.STRING,
                  choices: [
                    { name: 'Yes', value: 'yes' },
                    { name: 'No', value: 'no' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }

  public override async autocomplete(context: AutocompleteContext) {
    switch (context.subcommands[0]) {
      case 'edit':
      case 'item': {
        if (context.focused === 'queue') {
          const name =
            context.subcommands[0] === 'edit'
              ? context.options['edit'].name
              : context.options['item'][context.subcommands[1]].queue;

          const queues = await this.database
            .getRepository(Queue)
            .createQueryBuilder('queue')
            .leftJoinAndSelect('queue.createdBy', 'owner')
            .where(`LOWER(queue.name) LIKE :name`, { name: `%${name.toLowerCase()}%` })
            .andWhere('owner.id = :owner', { owner: context.user.id })
            .getMany();

          console.log(queues, name);

          return queues.map((x) => ({
            name: `${x.name} (${x.description})`,
            value: '' + x.id,
          }));
        } else if (context.subcommands[0] === 'edit') {
          return super.autocomplete(context);
        } else if (context.subcommands[0] === 'item' && context.focused === 'name') {
          console.log(context);

          return [];
        }

        return super.autocomplete(context);
      }

      default: {
        return super.autocomplete(context);
      }
    }
  }

  public override async run(context: CommandContext): ReturnType<SlashCommand['run']> {
    switch (context.subcommands[0]) {
      case 'create': {
        return this.createQueue(context);
      }
      case 'edit': {
        return this.editQueue(context);
      }
      case 'item': {
        switch (context.subcommands[1]) {
          case 'add': {
            return this.addToQueue(context);
          }
        }
      }
    }
  }

  private async createQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { name, description, channel: channelId } = context.options['create'];

    let message: Message | undefined;
    const queue = repo.create({
      name,
      description,
      updateDate: new Date(),
      createdBy: await this.getOwner(context),
      channel: channelId,
    });

    if (channelId) {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !(channel instanceof BaseGuildTextChannel)) {
        return context.send("That channel either doesn't exist, or cant be sent messages.", { ephemeral: true });
      }

      message = await (channel as BaseGuildTextChannel).send(this.buildQueueMessage(queue));
      queue.message = message.id;
    }

    await repo.save(queue);

    return context.send('Queue created', { ephemeral: true });
  }

  private async editQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { queue: id, name, description, channel: channelId } = context.options['edit'];

    const queue = await repo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    if (name) {
      queue.name = name;
    }

    if (description) {
      queue.description = description;
    }

    let channel: Channel | undefined;
    let message: Message | undefined;

    if (channelId) {
      channel = (await this.client.channels.fetch(channelId)) ?? undefined;

      if (!channel || !(channel instanceof BaseGuildTextChannel)) {
        return context.send("That channel either doesn't exist, or cant be sent messages.", { ephemeral: true });
      }

      if (queue.channel && queue.message) {
        const existingChannel = (await this.client.channels.fetch(queue.channel)) as BaseGuildTextChannel | undefined;
        const existingMessage = await existingChannel?.messages.fetch(queue.message);

        await existingMessage?.delete();
      }

      queue.channel = channelId;
      message = await this.updateQueueMessage(queue);
      queue.message = message?.id;
    } else if (queue.channel && queue.message) {
      channel = (await this.client.channels.fetch(channelId)) ?? undefined;

      if (!channel || !(channel instanceof BaseGuildTextChannel)) {
        return context.send("That channel either doesn't exist, or cant be sent messages.", { ephemeral: true });
      }

      await this.updateQueueMessage(queue);
    }

    await repo.save(queue);

    return context.send('Queue updated', { ephemeral: true });
  }

  private async addToQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const queueRepo = this.database.getRepository(Queue);
    const queueItemRepo = this.database.getRepository(QueueItem);
    const { queue: id, name, description, link } = context.options['item'].add;

    const queue = await queueRepo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    await this.updateQueueMessage(queue);

    const item = queueItemRepo.create({
      queue,
      name,
      description,
      link,
      createdBy: await this.getOwner(context),
      updateDate: new Date(),
    });

    await queueItemRepo.save(item);
    await this.updateQueueMessage(queue);

    return context.send('Queue item added', { ephemeral: true });
  }

  private buildQueueMessage(queue: Queue): MessageCreateOptions & MessageEditOptions {
    return {
      embeds: [
        EmbedBuilder.from({
          title: queue.name,
          description: queue.description,
          timestamp: queue.updateDate,
          fields: queue.items
            ?.filter((item) => !item.printed)
            .map((item, index) => ({ name: '' + (index + 1), value: `[${item.name}](${item.link})` })),
        }),
      ],
    };
  }

  private async updateQueueMessage(queue: Queue) {
    console.log(queue);

    if (!queue.channel) {
      return;
    }

    const channel = (await this.client.channels.fetch(queue.channel)) as BaseGuildTextChannel | null;

    if (!queue.message) {
      return channel?.send(this.buildQueueMessage(queue));
    }

    const message = await channel?.messages.fetch(queue.message);

    console.log({ message: message?.id });

    return message ? message.edit(this.buildQueueMessage(queue)) : channel?.send(this.buildQueueMessage(queue));
  }
}
