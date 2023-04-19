import type { SlashCommandOptions, SlashCreator } from 'slash-create';
import type { BambuClient } from '@node-bambu/core';

import { AbstractCommand } from './AbstractCommand';
import type { StatusService } from '../Service/StatusService';
import type { BambuBotConfiguration } from '../BambuBot';

export abstract class BaseStatusCommand extends AbstractCommand {
  protected constructor(
    creator: SlashCreator,
    bambu: BambuClient,
    protected status: StatusService,
    protected config: BambuBotConfiguration,
    options: SlashCommandOptions,
  ) {
    super(creator, bambu, options);
  }
}
