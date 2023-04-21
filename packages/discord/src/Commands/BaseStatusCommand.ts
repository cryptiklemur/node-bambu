import type { AutocompleteContext, CommandContext } from 'slash-create';
import { SlashCommandOptions, SlashCreator } from 'slash-create';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';

import { AbstractCommand } from './AbstractCommand';
import { BambuRepository } from '../Repository/BambuRepository';
import { StatusService } from '../Service/StatusService';
import { Printer } from '../Entity/Printer';

@injectable()
export abstract class BaseStatusCommand extends AbstractCommand {
  public constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('repository.bambu') bambuRepository: BambuRepository,
    @inject('service.status') protected status: StatusService,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, bambuRepository, options);
  }

  public override async autocomplete(context: AutocompleteContext): Promise<any> {
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

  protected async isPrinterOptionRequiredAndSet(context: CommandContext) {
    const printers = await this.database.getRepository(Printer).find();

    return printers.length > 1 ? context.options['printer'] : true;
  }

  protected getPrinterFromContext(context: CommandContext) {
    return this.bambuRepository.get(context.options['printer']);
  }
}
