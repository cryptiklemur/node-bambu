import { SlashCommandOptions, SlashCreator } from 'slash-create';
import { DataSource } from 'typeorm';
import { inject, injectable } from 'inversify';

import { AbstractPrinterCommand } from './AbstractPrinterCommand';
import { BambuRepository } from '../Repository/BambuRepository';
import { StatusService } from '../Service/StatusService';

@injectable()
export abstract class BaseStatusCommand extends AbstractPrinterCommand {
  public constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('repository.bambu') bambuRepository: BambuRepository,
    @inject('service.status') protected status: StatusService,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, bambuRepository, options);
  }
}
