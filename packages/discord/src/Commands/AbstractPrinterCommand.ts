import type {
  CommandContext,
  AutocompleteContext,
  ApplicationCommandOption,
  ApplicationCommandOptionSubCommand,
  SlashCommand,
} from 'slash-create';
import { SlashCommandOptions, SlashCreator, CommandOptionType } from 'slash-create';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';
import { Printer } from '../Entity/Printer';
import { AbstractCommand } from './AbstractCommand';

@injectable()
export abstract class AbstractPrinterCommand extends AbstractCommand {
  public static PRINTER_OPTION: ApplicationCommandOption | ApplicationCommandOptionSubCommand = {
    name: 'printer',
    description: 'Printer to check',
    type: CommandOptionType.STRING,
    autocomplete: true,
  };

  protected requiresPrinter = true;

  public constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('bambu.repository') protected bambuRepository: BambuRepository,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, options);
  }

  public override async autocomplete(context: AutocompleteContext) {
    const printers = await this.database
      .getRepository(Printer)
      .createQueryBuilder('printer')
      .leftJoinAndSelect('printer.owners', 'owner')
      .where(`LOWER(printer.name) LIKE :name`, { name: `%${context.options['printer'].toLowerCase()}%` })
      .andWhere('owner.id = :owner', { owner: context.user.id })
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

    const printer = this.requiresPrinter ? this.getPrinterFromContext(context) : undefined;

    if (printer && !printer.printer.owners.some((x) => x.id === context.user.id)) {
      return context.send(`You do not have permissions to run this against that printer (${printer.printer.name}).`);
    }

    return this.runCommand(context, printer);
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
