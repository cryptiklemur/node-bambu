import type {
  CommandContext,
  AutocompleteContext,
  ApplicationCommandOption,
  ApplicationCommandOptionSubCommand,
} from 'slash-create';
import { SlashCommandOptions, SlashCreator, SlashCommand, CommandOptionType } from 'slash-create';
import type { Client } from 'discord.js';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';
import { Owner } from '../Entity/Owner';
import { Printer } from '../Entity/Printer';

@injectable()
export abstract class AbstractCommand extends SlashCommand<Client> {
  public static PRINTER_OPTION: ApplicationCommandOption | ApplicationCommandOptionSubCommand = {
    name: 'printer',
    description: 'Printer to check',
    type: CommandOptionType.STRING,
    autocomplete: true,
  };

  protected requiresPrinter = true;

  public constructor(
    @inject('database') protected database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('bambu.repository') protected bambuRepository: BambuRepository,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(creator, options);
  }

  public override async autocomplete(context: AutocompleteContext) {
    const printers = await this.database
      .getRepository(Printer)
      .createQueryBuilder('printer')
      .where(`LOWER(printer.name LIKE :name`, { name: `%${context.options['printer'].toLowerCase()}%` })
      .getMany();

    return printers.map((x) => ({
      name: `${x.name} (${x.host}:${x.port})`,
      value: x.host,
    }));
  }

  public override async run(context: CommandContext): ReturnType<SlashCommand['run']> {
    if (this.requiresPrinter && !(await this.isPrinterOptionRequiredAndSet(context))) {
      return context.send('You must specify a printer with this command.');
    }

    return this.runCommand(context, this.requiresPrinter ? this.getPrinterFromContext(context) : undefined);
  }

  protected async getOwner(context: CommandContext) {
    const owner = await this.database.getRepository(Owner).findOneBy({ id: context.user.id });

    if (owner) {
      return owner;
    }

    return this.database.manager.save(new Owner(context.user.id));
  }

  protected async isPrinterOptionRequiredAndSet(context: CommandContext) {
    const printers = await this.database.getRepository(Printer).find();

    return printers.length > 1 ? context.options['printer'] : true;
  }

  protected getPrinterFromContext(context: CommandContext) {
    return this.bambuRepository.get(context.options['printer']);
  }

  protected abstract runCommand(
    context: CommandContext,
    printer?: BambuRepositoryItem,
  ): ReturnType<SlashCommand['run']>;
}
