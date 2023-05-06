import type { AutocompleteContext, CommandContext, MessageOptions, SlashCommand } from 'slash-create';
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
    @inject('discord.slash-creator-options') _options: SlashCommandOptions,
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
        {
          name: 'refresh',
          description: 'Refreshes the queue message, if there is one',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'queue',
              description: 'Queue to refresh',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'list',
          description: 'List all the queues',
          type: CommandOptionType.SUB_COMMAND,
        },
        {
          name: 'get',
          description: 'Prints the specified queue',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'queue',
              description: 'Queue to print',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'delete',
          description: 'Deletes the specified queue',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'queue',
              description: 'Queue to delete',
              type: CommandOptionType.STRING,
              required: true,
              autocomplete: true,
            },
          ],
        },
      ],
    });
  }

  private async fetchQueuesByName(name: string, owner: string) {
    const queryBuilder = this.database
      .getRepository(Queue)
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.createdBy', 'owner')
      .where(`LOWER(queue.name) LIKE :name`, { name: `%${name.toLowerCase()}%` })
      .andWhere('owner.id = :owner', { owner });

    return queryBuilder.getMany();
  }

  public override async autocomplete(context: AutocompleteContext) {
    if (context.focused === 'queue') {
      let queueName: string | undefined;

      switch (context.subcommands[0]) {
        case 'delete':
        case 'get':
        case 'refresh':
        case 'edit': {
          queueName = context.options[context.subcommands[0]].queue;

          break;
        }
        case 'item': {
          queueName = context.options[context.subcommands[0]][context.subcommands[1]].queue;

          break;
        }
      }

      if (queueName === undefined) {
        return [];
      }

      return this.fetchQueuesByName(queueName, context.user.id).then((queues) =>
        queues.map((x) => ({
          name: `${x.name} (${x.description.slice(0, Math.max(0, 100 - x.name.length - 3))})`,
          value: '' + x.id,
        })),
      );
    }

    if (context.focused === 'name' && context.subcommands[0] === 'item' && context.subcommands[1] === 'remove') {
      const input = context.options[context.subcommands[0]][context.subcommands[1]][context.focused];
      const repo = this.database.getRepository(Queue);
      const queue = await repo.findOneBy({ id: context.options[context.subcommands[0]][context.subcommands[1]].queue });

      return (
        queue?.items
          ?.filter((x) => x.name.includes(input) || x.description?.includes(input))
          .map((x) => ({
            name: x.name + (x.description ? ` (${x.description.slice(0, 100 - x.name.length - 3)}) ` : ''),
            value: x.name,
          })) ?? []
      );
    }

    return [];
  }

  public override async run(context: CommandContext): ReturnType<SlashCommand['run']> {
    switch (context.subcommands[0]) {
      case 'create': {
        return this.createQueue(context);
      }
      case 'edit': {
        return this.editQueue(context);
      }
      case 'refresh': {
        return this.refreshQueue(context);
      }
      case 'get': {
        return this.getQueue(context);
      }
      case 'delete': {
        return this.deleteQueue(context);
      }
      case 'item': {
        switch (context.subcommands[1]) {
          case 'add': {
            return this.addToQueue(context);
          }
          case 'remove': {
            return this.removeFromQueue(context);
          }
          default: {
            break;
          }
        }

        break;
      }
      case 'list': {
        return this.listQueues(context);
      }
    }
  }

  private async listQueues(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const queues = await repo.findBy({ createdBy: await this.getOwner(context) });

    return context.send({
      embeds: [
        EmbedBuilder.from({
          title: `Found ${queues.length} queues`,
          description: queues.map((x, index) => `${index + 1}) ${x.name} - ${x.description}`).join('\n'),
        }).toJSON(),
      ],
    });
  }

  private async getQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { queue: id } = context.options[context.subcommands[0]];

    const queue = await repo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    return context.send(this.buildQueueMessage(queue) as unknown as MessageOptions);
  }

  private async deleteQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { queue: id } = context.options[context.subcommands[0]];

    const queue = await repo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    if (queue.channel && queue.message) {
      const channel = (await this.client.channels.fetch(queue.channel)) as BaseGuildTextChannel | null;
      const message = await channel?.messages.fetch(queue.message);

      await message?.delete();
    }

    await repo.remove(queue);

    return context.send('Queue has been deleted.', { ephemeral: true });
  }

  private async createQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { name, description, channel: channelId } = context.options[context.subcommands[0]];

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

  private async refreshQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { queue: id } = context.options[context.subcommands[0]];

    const queue = await repo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    await this.updateQueueMessage(queue);

    return context.send('Queue Refreshed.', { ephemeral: true });
  }

  private async editQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const repo = this.database.getRepository(Queue);
    const { queue: id, name, description, channel: channelId } = context.options[context.subcommands[0]];

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
        const existingChannel = (await this.client.channels.fetch(queue.channel).catch(() => {})) as
          | BaseGuildTextChannel
          | undefined;
        const existingMessage = await existingChannel?.messages.fetch(queue.message).catch(() => {});

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
    const { queue: id, name, description, link } = context.options[context.subcommands[0]][context.subcommands[1]];

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
    await this.updateQueueMessage(await queueRepo.findOneOrFail({ where: { id } }));

    return context.send('Queue item added', { ephemeral: true });
  }

  private async removeFromQueue(context: CommandContext): ReturnType<SlashCommand['run']> {
    const queueRepo = this.database.getRepository(Queue);
    const queueItemRepo = this.database.getRepository(QueueItem);
    const {
      queue: id,
      name,
      purge: purgeString = 'no',
    } = context.options[context.subcommands[0]][context.subcommands[1]];
    const purge = purgeString === 'yes';

    const queue = await queueRepo.findOneBy({ id, createdBy: await this.getOwner(context) });

    if (!queue) {
      return context.send("Couldn't find a queue matching your request", { ephemeral: true });
    }

    if (!queue.items) {
      return context.send("That queue doesn't have any items in it.", { ephemeral: true });
    }

    await this.updateQueueMessage(queue);

    const index = queue.items.findIndex((x) => x.name === name);

    if (index < 0) {
      return context.send("Couldn't find that item in that queue.", { ephemeral: true });
    }

    if (purge) {
      await queueItemRepo.remove(queue.items[index]);
      queue.items.splice(index, 1);
    } else {
      queue.items[index].printed = true;
      queue.items[index].printedAt = new Date();
      await queueItemRepo.save(queue.items[index]);
    }

    await queueRepo.save(queue);
    await this.updateQueueMessage(await queueRepo.findOneOrFail({ where: { id } }));

    return context.send('Queue item removed', { ephemeral: true });
  }

  private buildQueueMessage(queue: Queue): MessageCreateOptions & MessageEditOptions {
    return {
      embeds: [
        EmbedBuilder.from({
          title: queue.name,
          description:
            queue.description +
            '\n\n' +
            (queue.items
              ?.filter((item) => !item.printed)
              .sort((a, b) => (a.id > b.id ? 1 : -1))
              .map((item, index) => this.getItemDisplay(item, index + 1))
              .join('\n') ?? 'No Items Yet'),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          timestamp: queue.updateDate,
        }),
      ],
    };
  }

  private getItemDisplay(item: QueueItem, prefix: number) {
    const name = item.link ? `[${item.name}](${item.link})` : item.name;

    return `${prefix}) ${name}${item.description ? ' - ' + item.description : ''}`;
  }

  private async updateQueueMessage(queue: Queue) {
    if (!queue.channel) {
      return;
    }

    const channel = (await this.client.channels.fetch(queue.channel).catch(() => {})) as
      | BaseGuildTextChannel
      | undefined;

    if (!queue.message) {
      return channel?.send(this.buildQueueMessage(queue));
    }

    const message = await channel?.messages.fetch(queue.message).catch(() => {});

    return message ? message.edit(this.buildQueueMessage(queue)) : channel?.send(this.buildQueueMessage(queue));
  }
}
