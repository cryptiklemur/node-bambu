import { Client, GatewayDispatchEvents } from 'discord.js';
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

import { Commands } from './Commands';
import { StatusService } from './Service/StatusService';
import { MessageSenderService } from './Service/MessageSenderService';
import { InteractionHandler } from './Service/InteractionHandler';
import { SubscriptionService } from './Service/SubscriptionService';
import { Owner } from './Entity/Owner';

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
  protected logger: interfaces.Logger;
  protected container: Container;

  public constructor(protected config: BambuBotConfiguration) {
    this.container = new Container({ defaultScope: 'Singleton' });
    this.buildContainer();
  }

  public async start() {
    this.container.get('service.interactionHandler');
    await this.container.get<DataSource>('database').initialize();
    await this.container.get<SlashCreator>('discord.slash-creator').syncCommandsAsync();

    await this.container.get<BambuRepository>('repository.bambu').initialize();

    await this.container.get<StatusService>('service.status').initialize();
    await this.container.get<SubscriptionService>('service.subscription').initialize();
  }

  protected buildContainer() {
    this.container.bind('container').toConstantValue(this);
    this.container.bind('config').toConstantValue(this.config);

    if (this.config.logger) {
      this.container.bind('logger').toConstantValue(this.config.logger);
    } else {
      this.container.bind('logger').toConstantValue(new ConsoleLogger());
    }

    this.container.bind<BambuRepository>('repository.bambu').to(BambuRepository);
    this.container
      .bind<Client>('discord.client')
      .toDynamicValue(() => new Client({ intents: [] }))
      .onActivation((context, client) => {
        client
          .on('ready', () => context.container.get<interfaces.Logger>('logger').info('Discord client connected'))
          .login(context.container.get<BambuBotConfiguration>('config').discord.token);

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
        return creator.on('error', (error) => context.container.get<interfaces.Logger>('logger').error(error));
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
        new GatewayServer((handler) =>
          this.container.get<Client>('discord.client').ws.on(GatewayDispatchEvents.InteractionCreate, handler),
        ),
      )
      .registerCommands(this.container.getAll('discord.slash-command'));
  }

  private getDataSource(context: Context): DataSource {
    const userConfig = context.container.get<BambuBotConfiguration>('config').database;
    const entities: BambuBotDataSourceOptions['entities'] = [Printer, StatusMessage, Subscription, Owner];
    const config = userConfig
      ? {
          ...userConfig,
          entities: [...(userConfig.entities ?? []), ...entities],
        }
      : {
          type: 'better-sqlite3',
          database: 'bambu-bot.db',
          entities,
          logging: this.config.debug,
          logger: this.logger,
          synchronize: true,
        };

    return new DataSource(config as DataSourceOptions);
  }
}
