import { Client, GatewayDispatchEvents, GatewayIntentBits } from 'discord.js';
import { GatewayServer, SlashCreator } from 'slash-create';
import type { interfaces } from '@node-bambu/core';
import { ConsoleLogger } from '@node-bambu/core';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { Container, interfaces as inversifyInterfaces } from 'inversify';

import type { Cache } from './Interfaces/Cache';
import { Subscription } from './Entity/Subscription';
import { Printer } from './Entity/Printer';
import { StatusMessage } from './Entity/StatusMessage';
import { BambuRepository } from './Repository/BambuRepository';

// eslint-disable-next-line import/order
import Context = inversifyInterfaces.Context;

import { Commands, PingCommand } from './Commands';
import { StatusService } from './Service/StatusService';
import { MessageSenderService } from './Service/MessageSenderService';
import { InteractionHandler } from './Service/InteractionHandler';
import { SubscriptionService } from './Service/SubscriptionService';
import { Owner } from './Entity/Owner';
import { Queue } from './Entity/Queue';
import { QueueItem } from './Entity/QueueItem';

// eslint-disable-next-line @typescript-eslint/ban-types
export type BambuBotDataSourceOptions = Omit<DataSourceOptions, 'entities'> & { entities?: Function[] };

export interface BambuBotConfiguration {
  cache?: Cache;
  database?: BambuBotDataSourceOptions;
  debug?: boolean;
  discord: {
    clientId: string;
    ownerIds?: string[];
    publicKey: string;
    token: string;
  };
  logger?: interfaces.Logger;
}

export class BambuBot {
  public get printers() {
    return [...this.container.get<BambuRepository>('repository.bambu').values()];
  }

  protected logger: interfaces.Logger;
  protected container: Container;

  public constructor(protected config: BambuBotConfiguration) {
    this.container = new Container({ defaultScope: 'Singleton' });
    this.buildContainer();
  }

  public async start() {
    const discord = this.container.get<Client>('discord.client');

    await Promise.all([
      this.container.get<DataSource>('database').initialize(),
      this.container.get<InteractionHandler>('service.interactionHandler').initialize(),
    ]).catch((error) => {
      this.logger.error('Failed to initialize', { services: ['database', 'interactionHandler'], error });

      throw error;
    });
    this.logger.info('Services initialized', { services: ['database', 'interactionHandler'] });

    await Promise.all([
      this.container.get<BambuRepository>('repository.bambu').initialize(),
      discord.login(this.container.get<BambuBotConfiguration>('config').discord.token),
      this.container
        .get<SlashCreator>('discord.slash-creator')
        .syncCommandsAsync({ syncPermissions: false, deleteCommands: true, syncGuilds: true, skipGuildErrors: false }),
    ]).catch((error) => {
      this.logger.error('Failed to initialize', { services: ['bambuRepository', 'discord', 'slash-creator'], error });

      throw error;
    });
    this.logger.info('Services initialized', { services: ['bambuRepository', 'discord', 'slash-creator'] });

    await Promise.all([
      this.container.get<StatusService>('service.status').initialize(),
      this.container.get<SubscriptionService>('service.subscription').initialize(),
    ]).catch((error) => {
      this.logger.error('Failed to initialize', { services: ['status', 'subscription'], error });

      throw error;
    });
    this.logger.info('Services initialized', { services: ['status', 'subscription'] });
  }

  protected buildContainer() {
    this.container.bind('container').toConstantValue(this);
    this.container.bind('config').toConstantValue(this.config);

    if (this.config.logger) {
      this.container.bind('logger').toConstantValue(this.config.logger);
    } else {
      this.container.bind('logger').toConstantValue(new ConsoleLogger());
    }

    this.logger = this.container.get('logger');

    this.container.bind<BambuRepository>('repository.bambu').to(BambuRepository);
    this.container
      .bind<Client>('discord.client')
      .toDynamicValue(() => new Client({ intents: [GatewayIntentBits.Guilds] }))
      .onActivation((context, client) => {
        client.on('ready', () => context.container.get<interfaces.Logger>('logger').info('Discord client connected'));

        return client;
      });
    this.container.bind('discord.slash-creator-options').toConstantValue({});
    this.container
      .bind<SlashCreator>('discord.slash-creator')
      .toDynamicValue(
        (context) =>
          new SlashCreator({
            applicationID: context.container.get<BambuBotConfiguration>('config').discord.clientId,
            publicKey: context.container.get<BambuBotConfiguration>('config').discord.publicKey,
            token: context.container.get<BambuBotConfiguration>('config').discord.token,
            client: context.container.get<Client>('discord.client'),
          }),
      )
      .onActivation((context, creator) => {
        const logger = context.container.get<interfaces.Logger>('logger');

        return creator
          .on('commandError', (command, error) => logger.error(error, { error, label: 'SlashCommand' }))
          .on('warn', (warning) => {
            if (warning instanceof Error) {
              logger.error(warning, { label: 'SlashCommand' });
            } else {
              logger.warn(warning, { label: 'SlashCommand' });
            }
          })
          .on('debug', (message) => logger.silly?.(message, { label: 'SlashCommand' }))
          .on('error', (error) => logger.error(error, { label: 'SlashCommand' }));
      });

    this.container.bind<DataSource>('database').toDynamicValue(this.getDataSource.bind(this));

    this.container.bind('service.subscription').to(SubscriptionService);
    this.container.bind('service.interactionHandler').to(InteractionHandler);
    this.container.bind('service.messageSender').to(MessageSenderService);
    this.container.bind<StatusService>('service.status').to(StatusService);

    for (const command of Commands) {
      this.container.bind('discord.slash-command').to(command).whenTargetNamed(command.name);
    }

    this.container
      .get<SlashCreator>('discord.slash-creator')
      .withServer(
        new GatewayServer((handler) => {
          this.container.get<Client>('discord.client').ws.on(GatewayDispatchEvents.InteractionCreate, handler);
          // this.container.get<Client>('discord.client').ws.on(GatewayDispatchEvents.InteractionCreate, console.log);
        }),
      )
      .registerCommands(this.container.getAll('discord.slash-command'), false)
      .registerCommand(PingCommand);
  }

  private getDataSource(context: Context): DataSource {
    const userConfig = context.container.get<BambuBotConfiguration>('config').database;
    const entities: BambuBotDataSourceOptions['entities'] = [
      Owner,
      Printer,
      StatusMessage,
      Subscription,
      QueueItem,
      Queue,
    ];
    const config = userConfig
      ? {
          ...userConfig,
          entities: [...(userConfig.entities ?? []), ...entities],
        }
      : {
          type: 'better-sqlite3',
          database: 'bambu-bot.db',
          entities,
          logging: !!this.config.debug,
          synchronize: true,
        };

    return new DataSource(config as DataSourceOptions);
  }
}
