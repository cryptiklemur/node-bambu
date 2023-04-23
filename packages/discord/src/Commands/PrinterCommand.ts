import { inject, injectable } from 'inversify';
import { DataSource } from 'typeorm';
import type { AutocompleteContext, CommandContext } from 'slash-create';
import { CommandOptionType, SlashCommandOptions, SlashCreator } from 'slash-create';

import { AbstractCommand } from './AbstractCommand';
import { BambuRepository } from '../Repository/BambuRepository';
import { Printer } from '../Entity/Printer';

@injectable()
export class PrinterCommand extends AbstractCommand {
  protected override requiresPrinter = false;

  constructor(
    @inject('database') database: DataSource,
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('repository.bambu') bambuRepository: BambuRepository,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(database, creator, bambuRepository, {
      ...options,
      name: 'printer',
      description: 'Manage printers on this bot',
      deferEphemeral: true,
      options: [
        {
          name: 'add',
          description: 'Adds a printer to this bot',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'name',
              description: 'Name of the printer',
              type: CommandOptionType.STRING,
              required: true,
            },
            {
              name: 'host',
              description: 'IP Address of the printer',
              type: CommandOptionType.STRING,
              required: true,
            },
            {
              name: 'serial_number',
              description: 'Serial Number of the printer',
              type: CommandOptionType.STRING,
              required: true,
            },
            {
              name: 'token',
              description: 'Access Token of the printer',
              type: CommandOptionType.STRING,
              required: true,
            },
            {
              name: 'port',
              description: 'Port of the printer (default: 8883)',
              type: CommandOptionType.NUMBER,
            },
            {
              name: 'stream_url',
              description: 'Twitch or Youtube Stream URL',
              type: CommandOptionType.STRING,
            },
            {
              name: 'icon_url',
              description: 'URL to the icon/image of the printer',
              type: CommandOptionType.STRING,
            },
          ],
        },
        {
          name: 'remove',
          description: 'Removes a printer from this bot',
          type: CommandOptionType.SUB_COMMAND,
          options: [
            {
              name: 'name',
              description: 'Name of the printer',
              type: CommandOptionType.STRING,
              autocomplete: true,
            },
            {
              name: 'host',
              description: 'IP Address of the printer',
              type: CommandOptionType.STRING,
              autocomplete: true,
            },
          ],
        },
        {
          name: 'list',
          description: "Lists all the printer's this bot manages",
          type: CommandOptionType.SUB_COMMAND,
        },
      ],
    });
  }

  public override async autocomplete(context: AutocompleteContext) {
    if (context.subcommands[0] !== 'remove') {
      return super.autocomplete(context);
    }

    const focused = context.options['remove'][context.focused];
    const printers = await this.database
      .getRepository(Printer)
      .createQueryBuilder('printer')
      .where(`LOWER(printer.${context.focused}) LIKE :focused`, { focused: `%${focused.toLowerCase()}%` })
      .getMany();

    return printers.map((x) => ({
      name: `${x.name} (${x.host}:${x.port})`,
      value: x[context.focused as 'name' | 'host'],
    }));
  }

  public override async runCommand(context: CommandContext) {
    const owner = await this.getOwner(context);

    switch (context.subcommands[0]) {
      case 'add': {
        const {
          name,
          host,
          port = 8883,
          serial_number: serialNumber,
          token,
          stream_url: streamUrl,
          icon_url: iconUrl,
        } = context.options['add'];
        const printer = new Printer({
          name,
          host,
          port,
          serialNumber,
          token,
          streamUrl,
          iconUrl,
          owners: [owner],
          createdBy: owner,
        });

        await this.database.manager.save(printer);
        await this.bambuRepository.add(printer);

        return context.send('Printer added', { ephemeral: true });
      }

      case 'remove': {
        const { name, host } = context.options['remove'];
        const printer = await this.database.getRepository(Printer).findOneBy({ name, host, createdBy: owner });

        if (!printer) {
          return context.send("Couldn't find a printer matching that request");
        }

        await this.database.manager.remove(printer);

        return context.send('Printer removed', { ephemeral: true });
      }

      case 'list': {
        const printers = await this.database.getRepository(Printer).findBy({ owners: [owner] });

        return context.send(
          printers
            .map((printer, index) => `${index + 1}. ${printer.name} (\`${printer.host}:${printer.port}\`)`)
            .join('\n'),
          { ephemeral: true },
        );
      }

      default: {
        throw new Error('Unexpected code path');
      }
    }
  }
}
