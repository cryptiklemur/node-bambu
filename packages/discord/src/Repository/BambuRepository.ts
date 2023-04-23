import { BambuClient, interfaces } from '@node-bambu/core';
import { decorate, inject, injectable, unmanaged } from 'inversify';
import { DataSource } from 'typeorm';
import { ActivityType, Client } from 'discord.js';
import prettyMs from 'pretty-ms';

import { Printer } from '../Entity/Printer';
import type { StatusMessage } from '../Entity/StatusMessage';
import { sleep } from '../Util/sleep';

decorate(injectable(), Map);
decorate(unmanaged(), Map, 1);

export interface BambuRepositoryItem {
  client: BambuClient;
  printer: Printer;
}

@injectable()
export class BambuRepository extends Map<string, BambuRepositoryItem> {
  public constructor(
    @inject('database') private database: DataSource,
    @inject('logger') private logger: interfaces.Logger,
    @inject('discord.client') private discord: Client,
  ) {
    super();
  }

  public async initialize() {
    const repo = this.database.getRepository(Printer);
    const printers = await repo.find();

    for (const printer of printers) {
      await this.add(printer);
    }

    await sleep(5000);

    return this;
  }

  public override get(key?: string) {
    if (!key) {
      return [...this.values()][0];
    }

    return super.get(key);
  }

  public async add(printer: Printer) {
    this.set(printer.host, { client: await this.createBambuClient(printer), printer });
  }

  public async createBambuClient(printer: Printer) {
    return new Promise<BambuClient>((resolve) => {
      const client = new BambuClient({
        host: printer.host,
        port: printer.port,
        serial: printer.serialNumber,
        token: printer.token,
      });

      client.on('connected', () => {
        this.logger.info('Bambu client connected', printer);

        resolve(client);
      });
      client.on('print:finish', this.onPrintUpdate.bind(this));
      client.on('print:start', this.onPrintUpdate.bind(this));
      client.on('print:update', this.onPrintUpdate.bind(this));
      client.on('command:push_info:clean', client.printerStatus.onPushInfo.bind(client.printerStatus));

      client.connect();
    });
  }

  public findById(printerId: string | number): BambuRepositoryItem | undefined {
    for (const value of this.values()) {
      if (value.printer.id === +printerId) {
        return value;
      }
    }

    return undefined;
  }

  public findByStatus(status: StatusMessage): BambuRepositoryItem | undefined {
    for (const value of this.values()) {
      if (value.printer.id === status.printer.id) {
        return value;
      }
    }

    return undefined;
  }

  private async onPrintUpdate() {
    const printers = [...this.values()];
    const idle = printers.every((x) => x.client.printerStatus.idle);

    await this.discord.user?.setPresence({
      status: idle ? 'idle' : 'online',
      activities: printers.map((x) => ({
        name: x.client.printerStatus.currentJob
          ? `${x.client.printerStatus.currentJob.status.progressPercent}% (${prettyMs(
              x.client.printerStatus.currentJob.status.remainingTime,
            )} Remaining)`
          : 'Waiting to Print',
        type: x.printer.streamUrl ? ActivityType.Streaming : ActivityType.Watching,
        url: x.printer.streamUrl,
      })),
    });
  }
}
