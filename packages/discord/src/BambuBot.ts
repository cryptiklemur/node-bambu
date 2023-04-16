import {
  ActivityOptions,
  ActivityType,
  Client,
  GatewayDispatchEvents,
  PresenceStatusData,
} from 'discord.js';
import { GatewayServer, SlashCreator } from 'slash-create';
import { BambuClient, BambuConfig } from '@node-bambu/core';
import prettyMs from 'pretty-ms';

import { StatusCommand } from './Commands/StatusCommand';
import { PermanentStatusCommand } from './Commands/PermanentStatusCommand';

export interface BambuBotConfiguration {
  discord: {
    token: string;
    clientId: string;
    publicKey: string;
  };
  printer: BambuConfig;
  streamUrl?: string;
}

export class BambuBot {
  public readonly client: Client<boolean>;
  public readonly creator: SlashCreator;
  public readonly bambu: BambuClient;

  public constructor(private config: BambuBotConfiguration) {
    this.client = new Client({ intents: [] });
    this.creator = new SlashCreator({
      applicationID: config.discord.clientId,
      publicKey: config.discord.publicKey,
      token: config.discord.token,
      client: this.client,
    });
    this.bambu = new BambuClient(this.config.printer);

    this.creator
      .withServer(
        new GatewayServer((handler) =>
          this.client.ws.on(GatewayDispatchEvents.InteractionCreate, handler)
        )
      )
      .registerCommands([
        new StatusCommand(this.creator, this.bambu),
        new PermanentStatusCommand(this.creator, this.bambu),
      ])
      .syncCommands();
  }

  public async start() {
    await this.bambu.connect();
    await this.client.login(this.config.discord.token);
    this.bambu.on(
      'command:gcode_file',
      console.log.bind(console, 'command:gcode_file')
    );
    this.bambu.on(
      'command:gcode_line',
      console.log.bind(console, 'command:gcode_line')
    );
    this.bambu.on(
      'command:project_file',
      console.log.bind(console, 'command:project_file')
    );
    this.bambu.on('status', (printerStatus) => {
      const idle = printerStatus.state === 'IDLE';
      const status: PresenceStatusData = idle ? 'idle' : 'online';
      const activities: ActivityOptions[] = [];
      if (!idle) {
        activities.push({
          name: `${printerStatus.progressPercent}% (${prettyMs(
            printerStatus.remainingTime
          )} Remaining)`,
          type: this.config.streamUrl
            ? ActivityType.Streaming
            : ActivityType.Watching,
          url: this.config.streamUrl,
        });
      }

      let changed = false;
      if (this.client.user?.presence.status !== status) {
        changed = true;
      }

      if (!this.areActivitiesEqual(activities)) {
        changed = true;
      }

      if (changed) {
        console.log('New Status', { status, activities });
        this.client.user?.setPresence({
          status,
          activities,
        });
      }
    });
  }

  private areActivitiesEqual(activities: ActivityOptions[]) {
    if (this.client.user?.presence.activities.length !== activities.length) {
      return false;
    }

    for (let i = 0; i < activities.length; i++) {
      const activity = this.client.user?.presence.activities[0];
      if (activities[i].name !== activity.name) {
        return false;
      }
      if (activities[i].type !== activity.type) {
        return false;
      }
    }

    return true;
  }
}
