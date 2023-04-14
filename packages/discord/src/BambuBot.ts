import {ActivityOptions, ActivityType, Client, GatewayDispatchEvents, PresenceStatusData} from "discord.js";
import {GatewayServer, SlashCreator} from "slash-create";
import equal from 'fast-deep-equal';
import {BambuClient, BambuConfig} from "@node-bambu/core";

export interface BambuBotConfiguration {
  discord: {
    token: string;
    clientId: string;
    publicKey: string;
  };
  printer: BambuConfig
}

export class BambuBot {
  protected client: Client<boolean>;
  protected creator: SlashCreator;
  protected bambu: BambuClient;

  public constructor(private config: BambuBotConfiguration) {
    this.client = new Client({intents: []});
    this.creator = new SlashCreator({
      applicationID: config.discord.clientId,
      publicKey: config.discord.publicKey,
      token: config.discord.token,
      client: this.client,
    });
    this.bambu = new BambuClient(this.config.printer);

    this.creator.withServer(new GatewayServer(
      (handler) => this.client.ws.on(GatewayDispatchEvents.IntegrationCreate, handler)
    ))
      .registerCommands([])
      .syncCommands();

  }

  public async start() {
    await this.bambu.connect();
    await this.client.login(this.config.discord.token);
    this.bambu.on('status', (printerStatus) => {
      const idle = printerStatus.gcodeState === 'IDLE';
      const status: PresenceStatusData = idle ? 'idle' : 'online';
      const activities: ActivityOptions[] = [];
      if (!idle) {
        activities.push({name: `${printerStatus.progressPercent}% (${printerStatus.remainingTime}m Remaining)`, type: ActivityType.Watching})
      }

      let changed = false;
      if (this.client.user?.presence.status !== status) {
        changed = true;
      }

      if (!this.areActivitiesEqual(activities)) {
        changed = true;
      }

      if (changed) {
        console.log('New Status', {status, activities});
        this.client.user?.setPresence({
          status,
          activities
        })
      }
    })
  }

  private areActivitiesEqual(activities: ActivityOptions[]) {
    if (this.client.user?.presence.activities.length !== activities.length) {
      return false;
    }

    for (let i = 0; i < activities.length; i++) {
      const activity = this.client.user?.presence.activities[0]
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
