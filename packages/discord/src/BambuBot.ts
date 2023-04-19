import { Client, GatewayDispatchEvents } from 'discord.js';
import { GatewayServer, SlashCreator } from 'slash-create';
import type { BambuClient, interfaces } from '@node-bambu/core';
import { ConsoleLogger } from '@node-bambu/core';

import { StatusCommand } from './Commands/StatusCommand';
import { PermanentStatusCommand } from './Commands/PermanentStatusCommand';
import { StatusService } from './Service/StatusService';
import { PrintFinished } from './Listener/PrintFinished';
import { PrintStart } from './Listener/PrintStart';
import { PrintUpdate } from './Listener/PrintUpdate';
import { SubscribeCommand } from './Commands/SubscribeCommand';
import { FileCache } from './Util/FileCache';
import type { Cache } from './Interfaces/Cache';

export interface BambuBotConfiguration {
  cache?: Cache;
  discord: {
    clientId: string;
    ownerIds?: string[];
    publicKey: string;
    token: string;
  };
  logger?: interfaces.Logger;
  streamUrl?: string;
}

export class BambuBot {
  public readonly client: Client;
  public readonly creator: SlashCreator;
  public readonly status: StatusService;
  protected cache: Cache;
  protected logger: interfaces.Logger;

  public constructor(public readonly bambu: BambuClient, protected config: BambuBotConfiguration) {
    this.cache = config.cache ?? new FileCache();
    this.logger = config.logger ?? new ConsoleLogger();
    this.client = new Client({ intents: [] });
    this.creator = new SlashCreator({
      applicationID: config.discord.clientId,
      publicKey: config.discord.publicKey,
      token: config.discord.token,
      client: this.client,
    });
    this.status = new StatusService(this.client, this.bambu, this.cache, this.logger);

    this.creator
      .withServer(new GatewayServer((handler) => this.client.ws.on(GatewayDispatchEvents.InteractionCreate, handler)))
      .registerCommands([
        new StatusCommand(this.creator, this.bambu, this.status, this.config),
        new PermanentStatusCommand(this.creator, this.bambu, this.status, this.config),
        new SubscribeCommand(this.creator, this.bambu, this.status, this.config),
      ])
      .syncCommands();
    this.creator.on('error', console.error);
  }

  public async start() {
    this.client.on('ready', () => this.logger.info('Discord client connected'));
    this.bambu.on('connected', () => this.logger.info('Printer connected'));

    await this.client.login(this.config.discord.token);
    await this.bambu.connect();

    this.bambu.on('print:finish', PrintFinished(this.client, this.config.streamUrl));
    this.bambu.on('print:start', PrintStart(this.client, this.config.streamUrl));
    this.bambu.on('print:update', PrintUpdate(this.client, this.config.streamUrl));

    await this.status.initialize();
  }
}
