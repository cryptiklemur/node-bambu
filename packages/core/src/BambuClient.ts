import * as mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import * as events from 'eventemitter3';
import * as ftp from 'basic-ftp';

import { GET_VERSION, PUSH_ALL } from './Commands';
import { isPrintMessage, isPushStatusCommand } from './interfaces/MQTTPacketResponse/print';
import type { GetVersionCommand } from './interfaces/MQTTPacketResponse/info';
import { isGetVersionCommand, isInfoMessage } from './interfaces/MQTTPacketResponse/info';
import { getCleanPushInfoCommand, isMCPrintMessage, isPushInfoCommand } from './interfaces/MQTTPacketResponse/mc_print';
import { PrinterStatus } from './util/PrinterStatus';
import type { BambuClientEvents, Device, Logger, Cache } from './interfaces';
import { MemoryCache } from './util/MemoryCache';
import { ConsoleLogger } from './util/ConsoleLogger';
import { FTPService } from './Service/FTPService';

export interface BambuConfig {
  cache?: Cache;
  debugFtp?: boolean;
  host: string;
  logger?: Logger;
  port?: number;
  serial: string;
  token: string;
}

export class BambuClient extends events.EventEmitter<keyof BambuClientEvents> {
  public get connected() {
    return this.mqttClient?.connected ?? false;
  }

  public readonly ftp: ftp.Client = new ftp.Client(2 * 60 * 1000);
  public readonly printerStatus;
  public readonly cache: Cache;
  protected mqttClient: mqtt.MqttClient | undefined;
  protected device: Device | undefined;
  protected logger: Logger;
  protected ftpService: FTPService;

  public constructor(protected config: BambuConfig) {
    super();

    this.cache = config.cache ?? new MemoryCache();
    this.logger = config.logger ?? new ConsoleLogger();
    this.printerStatus = new PrinterStatus(this);
    this.ftpService = new FTPService(this, this.ftp, this.printerStatus, this.logger, this.config);
  }

  public override emit<K extends keyof BambuClientEvents>(event: K, ...args: BambuClientEvents[K]): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public override emit(event: string, ...args: any[]): boolean {
    return super.emit(event as keyof BambuClientEvents, ...args);
  }

  public override off<K extends keyof BambuClientEvents>(
    event: K,
    listener?: (...args: BambuClientEvents[K]) => void,
  ): this;
  public override off(
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener?: (...args: any[]) => void,
  ): this {
    super.off(event as keyof BambuClientEvents, listener);

    return this;
  }

  public override once<K extends keyof BambuClientEvents>(
    event: K,
    listener: (...args: BambuClientEvents[K]) => void,
  ): this;
  public override once(
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void,
  ): this {
    super.once(event as keyof BambuClientEvents, listener);

    return this;
  }

  public override on<K extends keyof BambuClientEvents>(
    event: K,
    listener: (...args: BambuClientEvents[K]) => void,
  ): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public override on(event: string, listener: (...args: any[]) => void): this {
    super.on(event as keyof BambuClientEvents, listener);

    return this;
  }

  public async connect() {
    await this.printerStatus.initialize();

    return Promise.all([this.connectToMQTT(), this.connectToFTP()]);
  }

  public async disconnect(force = false, opts?: Parameters<MqttClient['end']>[1]) {
    return new Promise((resolve) => this.mqttClient?.end(force, opts, resolve));
  }

  public subscribe(topic: string): Promise<void> {
    this.logger.silly?.('Subscribing to printer', { topic });

    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.');
      }

      this.mqttClient.subscribe(topic, (error) => {
        this.emit('subscribed', topic, error);

        if (error) {
          return reject(`Error subscribing to topic '${topic}': ${error.message}`);
        }

        this.logger.silly?.('Subscribed to printer', { topic });
      });

      const listener = (receivedTopic: string, payload: Buffer) => {
        if (receivedTopic !== topic) {
          return;
        }

        this.onMessage(payload.toString());
      };

      this.mqttClient.on('message', listener);

      resolve();
    });
  }

  public publish(message: string | object): Promise<void> {
    this.logger.silly?.('Publishing to printer', { message });

    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.');
      }

      const msg = typeof message === 'string' ? message : JSON.stringify(message);

      const topic = `device/${this.config.serial}/request`;

      this.mqttClient.publish(topic, msg, (error) => {
        this.emit('published', topic, msg, error);

        if (error) {
          return reject(`Error publishing to topic '${topic}': ${error.message}`);
        }

        this.logger.silly?.('Published to printer', { message });
        resolve();
      });
    });
  }

  protected async onConnect(packet: mqtt.IConnackPacket): Promise<void> {
    this.emit('connected', packet);

    this.logger.debug('onConnect: Connected to printer');
    this.logger.silly?.('onConnect: Subscribing to device report');
    await this.subscribe(`device/${this.config.serial}/report`);
    this.logger.silly?.('onConnect: Getting version info');
    await this.publish(GET_VERSION);
    this.logger.silly?.('onConnect: Request Push All');
    await this.publish(PUSH_ALL);
  }

  protected async onMessage(packet: string) {
    const data = JSON.parse(packet);
    const key = Object.keys(data)[0];

    this.emit('message', data[key]);
    this.logger.silly?.('onMessage: ', { key, data: JSON.stringify(data[key]) });

    if (isInfoMessage(data)) {
      this.emit(`command:${data.info.command}`, data.info as GetVersionCommand);

      if (isGetVersionCommand(data.info)) {
        this.device = data.info;
      }
    }

    if (isPrintMessage(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`command:${data.print.command}`, data.print as any);

      if (isPushStatusCommand(data.print)) {
        await this.printerStatus.onStatus(data.print);
      }
    }

    if (isMCPrintMessage(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`command:${data.mc_print.command}`, data.mc_print as any);

      if (isPushInfoCommand(data.mc_print)) {
        this.emit('command:push_info:clean', getCleanPushInfoCommand(data.mc_print));
      }
    }
  }

  protected onDisconnect(packet: mqtt.IDisconnectPacket) {
    this.emit('disconnected', packet);
    this.logger.debug(`onDisconnect: Disconnected from printer: ${packet.reasonCode}`);
  }

  private async connectToMQTT() {
    return new Promise<void>((resolve, reject) => {
      this.mqttClient = mqtt.connect(`mqtts://${this.config.host}:${this.config.port ?? 8883}`, {
        username: 'bblp',
        password: this.config.token,
        reconnectPeriod: 1,
        rejectUnauthorized: false,
      });
      this.emit('connecting', this.mqttClient);

      this.mqttClient.once('connect', () => resolve());
      this.mqttClient.on('connect', this.onConnect.bind(this));
      this.mqttClient.on('disconnect', this.onDisconnect.bind(this));
      this.mqttClient.on('message', (topic, packet) => this.emit('rawMessage', topic, packet));

      this.mqttClient.on('error', (error) => {
        this.logger.error('Error connecting to Bambu MQTT server:', error.message);
        reject(error);
      });
    });
  }

  private async connectToFTP() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.ftp.ftp.log = this.logger.silly || (() => {});

    this.ftp.trackProgress((info) => {
      this.logger.silly?.('FTP Progress: ', info);
    });

    setInterval(() => {
      if (this.ftp.closed) {
        this.ftpService.connect();
      }
    }, 5000);

    return this.ftpService.connect();
  }
}
