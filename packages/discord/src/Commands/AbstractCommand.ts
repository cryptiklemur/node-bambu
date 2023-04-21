import type { CommandContext } from 'slash-create';
import { SlashCommandOptions, SlashCreator, SlashCommand } from 'slash-create';
import type { Client } from 'discord.js';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';

import { BambuRepository } from '../Repository/BambuRepository';
import { Owner } from '../Entity/Owner';

@injectable()
export abstract class AbstractCommand extends SlashCommand<Client> {
  public constructor(
    @inject('database') protected database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('bambu.repository') protected bambuRepository: BambuRepository,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(creator, options);
  }

  protected async getOwner(context: CommandContext) {
    const owner = await this.database.getRepository(Owner).findOneBy({ id: context.user.id });

    if (owner) {
      return owner;
    }

    return this.database.manager.save(new Owner(context.user.id));
  }
}
