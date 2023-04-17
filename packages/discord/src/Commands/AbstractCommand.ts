import type { SlashCommandOptions, SlashCreator } from 'slash-create';
import { SlashCommand } from 'slash-create';
import type { Client } from 'discord.js';
import type { BambuClient } from '@node-bambu/core';

export abstract class AbstractCommand extends SlashCommand<Client> {
  protected constructor(creator: SlashCreator, protected bambu: BambuClient, opts: SlashCommandOptions) {
    super(creator, opts);
  }
}
