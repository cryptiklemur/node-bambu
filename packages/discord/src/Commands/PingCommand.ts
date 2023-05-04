import type { CommandContext } from 'slash-create';
import { SlashCommand, SlashCommandOptions, SlashCreator } from 'slash-create';
import { inject, injectable } from 'inversify';
import type { Client } from 'discord.js';

@injectable()
export class PingCommand extends SlashCommand<Client> {
  public constructor(
    @inject('discord.slash-creator') creator: SlashCreator,
    @inject('discord.slash-creator-options') options: SlashCommandOptions,
  ) {
    super(creator, {
      name: 'ping',
      description: 'Pong',
    });
  }

  public override run(context: CommandContext) {
    return context.send('Pong', { ephemeral: true });
  }
}
