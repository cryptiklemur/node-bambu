import * as os from 'node:os';
import * as path from 'node:path';

import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import debug from 'debug';
import * as events from 'eventemitter3';
import { caching } from 'cache-manager';
import { Cache } from 'cache-manager/dist/caching';
import * as ftp from 'basic-ftp';

import { GET_VERSION, PUSH_ALL } from './Commands';
import {
  isPrintMessage,
  isPushStatusCommand,
  PushStatusCommand,
} from './interfaces/MQTTPacketResponse/print';
import {
  isGetVersionCommand,
  isInfoMessage,
} from './interfaces/MQTTPacketResponse/info';
import {
  getCleanPushInfoCommand,
  isMCPrintMessage,
  isPushInfoCommand,
} from './interfaces/MQTTPacketResponse/mc_print';
import { PrinterStatus } from './util/PrinterStatus';
import { BambuClientEvents, Device, Status } from './interfaces';
import { IntRange } from './types';
import { getStageAsString } from './util/status/getStageAsString';

const baseLog = debug('bambu:BambuClient');

export interface BambuConfig {
  host: string;
  port?: number;
  token: string;
  serial: string;
}

export class BambuClient extends events.EventEmitter<keyof BambuClientEvents> {
  public readonly ftp: ftp.Client = new ftp.Client(2 * 60 * 1000);
  protected mqttClient: mqtt.MqttClient | undefined;
  protected device: Device | undefined;
  protected status: Status | undefined;
  protected printerStatus = new PrinterStatus();
  protected cache: Cache | undefined;

  public constructor(protected config: BambuConfig) {
    super();
  }

  public get connected() {
    return this.mqttClient?.connected ?? false;
  }

  public override emit<K extends keyof BambuClientEvents>(
    event: K,
    ...args: BambuClientEvents[K]
  ): boolean;
  public override emit(event: string, ...args: any[]): boolean {
    return super.emit(event as keyof BambuClientEvents, ...args);
  }

  public override off<K extends keyof BambuClientEvents>(
    event: K,
    listener?: (...args: BambuClientEvents[K]) => void
  ): this;
  public override off(
    event: string,
    listener?: (...args: any[]) => void
  ): this {
    super.off(event as keyof BambuClientEvents, listener);

    return this;
  }

  public override once<K extends keyof BambuClientEvents>(
    event: K,
    listener: (...args: BambuClientEvents[K]) => void
  ): this;
  public override once(
    event: string,
    listener: (...args: any[]) => void
  ): this {
    super.once(event as keyof BambuClientEvents, listener);

    return this;
  }

  public override on<K extends keyof BambuClientEvents>(
    event: K,
    listener: (...args: BambuClientEvents[K]) => void
  ): this;
  public override on(event: string, listener: (...args: any[]) => void): this {
    super.on(event as keyof BambuClientEvents, listener);

    return this;
  }

  public async connect() {
    if (!this.cache) {
      this.cache = await caching('memory', {
        max: 1000,
        ttl: 60 * 60 * 24 * 1000,
      });
    }

    this.printerStatus.setInitialIdle(await this.cache.get('is-printer-idle'));

    return Promise.all([this.connectToMQTT(), this.connectToFTP()]);
  }

  public async disconnect(
    force = false,
    opts?: Parameters<MqttClient['end']>[1]
  ) {
    return new Promise((resolve) => this.mqttClient?.end(force, opts, resolve));
  }

  public getStatus() {
    return this.status;
  }

  public getCache() {
    return this.cache;
  }

  public setCache(cache: Cache) {
    this.cache = cache;
  }

  public subscribe(topic: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.');
      }

      this.mqttClient.subscribe(topic, (error) => {
        this.emit('subscribed', topic, error);
        if (error) {
          return reject(
            `Error subscribing to topic '${topic}': ${error.message}`
          );
        }
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

  public publish(message: object): Promise<void>;

  public publish(message: string): Promise<void>;

  public publish(message: string | object): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.');
      }

      const msg =
        typeof message === 'string' ? message : JSON.stringify(message);

      const topic = `device/${this.config.serial}/request`;
      this.mqttClient.publish(topic, msg, (error) => {
        this.emit('published', topic, msg, error);
        if (error) {
          return reject(
            `Error publishing to topic '${topic}': ${error.message}`
          );
        }
        resolve();
      });
    });
  }

  protected async onConnect(packet: mqtt.IConnackPacket): Promise<void> {
    this.emit('connected', packet);
    const log = baseLog.extend('onConnect');

    log('Connected to printer');
    log('Subscribing to device report');
    await this.subscribe(`device/${this.config.serial}/report`);
    log('Getting version info');
    await this.publish(GET_VERSION);
    log('Request Push All');
    await this.publish(PUSH_ALL);
  }

  protected async onMessage(packet: string) {
    const log = baseLog.extend('onMessage');
    const data = JSON.parse(packet);
    const key = Object.keys(data)[0];
    this.emit('message', data[key]);
    log('Key: %s, Data: %s', key, JSON.stringify(data[key]));
    if (isInfoMessage(data)) {
      this.emit(`command:${data.info.command}`, data.info as any);
      if (isGetVersionCommand(data.info)) {
        this.device = data.info;
      }
    }

    if (isPrintMessage(data)) {
      const command = data.print.command;
      this.emit(`command:${data.print.command}`, data.print as any);
      if (isPushStatusCommand(data.print)) {
        await this.setStatus(data.print);
      }
    }

    if (isMCPrintMessage(data)) {
      this.emit(`command:${data.mc_print.command}`, data.mc_print as any);
      if (isPushInfoCommand(data.mc_print)) {
        this.emit(
          'command:push_info:clean',
          getCleanPushInfoCommand(data.mc_print)
        );
      }
    }
  }

  protected async setStatus(data: PushStatusCommand) {
    this.printerStatus.onStatusUpdate(data.gcode_state);
    await this.cache?.set('is-printer-idle', this.printerStatus.isIdle);
    let finishTime: number | undefined = this.status?.finishTime;
    if (this.status?.state !== 'FINISH' && data.gcode_state === 'FINISH') {
      finishTime = Date.now();
    }

    function getSpeed(lvl: IntRange<1, 5>) {
      switch (lvl) {
        case 1:
          return 'Silent';
        case 2:
          return 'Standard';
        case 3:
          return 'Sport';
        case 4:
          return 'Ludicrous';
      }
    }

    this.status = {
      ams: data.ams,
      currentLayer: data.layer_num,
      maxLayers: data.total_layer_num,
      gcodeFile: data.gcode_file,
      startTime: parseInt(data.gcode_start_time, 10),
      state: this.printerStatus.isIdle ? 'IDLE' : data.gcode_state,
      ipcam: {
        dev: data.ipcam.ipcam_dev === '1',
        record: data.ipcam.ipcam_record === 'enable',
        resolution: data.ipcam.resolution,
        timelapse: data.ipcam.timelapse === 'enable',
      },
      lights: data.lights_report.map((x) => ({ name: x.node, mode: x.mode })),
      printStage: {
        value: Number(data.stg_cur),
        text: getStageAsString(Number(data.stg_cur)),
      },
      progressPercent: Number(data.mc_percent),
      remainingTime: data.mc_remaining_time * 60 * 1000,
      speed: {
        name: getSpeed(data.spd_lvl),
        percent: data.spd_mag,
      },
      finishTime,
      taskName: data.subtask_name,
      fans: {
        big_1: Number(data.big_fan1_speed) as IntRange<0, 100>,
        big_2: Number(data.big_fan2_speed) as IntRange<0, 100>,
        cooling: Number(data.cooling_fan_speed) as IntRange<0, 100>,
        heatbreak: Number(data.heatbreak_fan_speed) as IntRange<0, 100>,
        gear: data.fan_gear,
      },
      temperatures: {
        bed: {
          power: 0, // @todo Remove this if we can't get it
          target: data.bed_target_temper,
          actual: data.bed_temper,
        },
        extruder: {
          power: 0, // @todo Remove this if we can't get it
          target: data.nozzle_target_temper,
          actual: data.nozzle_temper,
        },
        chamber: {
          power: 0, // @todo Remove this if we can't get it
          target: 0,
          actual: data.chamber_temper,
        },
      },
      stream: this.getStream(data.ipcam),
    };
    this.emit('status', this.status);
  }

  protected getStream(ipcam: PushStatusCommand['ipcam']) {
    if (ipcam.ipcam_dev === '0' || ipcam.ipcam_record === 'disable') {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const userDataFolder =
      process.env.APPDATA ||
      (process.platform == 'darwin'
        ? process.env.HOME + '/Library/Preferences'
        : process.env.HOME + '/.local/share');

    switch (os.platform()) {
      case 'win32':
        return path.resolve(
          userDataFolder,
          'BambuStudio',
          'cameratools',
          'ffmpeg.sdp'
        );
      case 'darwin':
        return path.resolve(
          '/Users/',
          os.userInfo().username,
          'Library',
          'Application Support',
          'BambuStudio',
          'cameratools',
          'ffmpeg.sdp'
        );
      default:
        return undefined;
    }
  }

  protected onDisconnect(packet: mqtt.IDisconnectPacket) {
    this.emit('disconnected', packet);
    baseLog.extend('onDisconnect')(
      `Disconnected from printer: ${packet.reasonCode}`
    );
  }

  private async connectToMQTT() {
    return new Promise<void>((resolve, reject) => {
      this.mqttClient = mqtt.connect(
        `mqtts://${this.config.host}:${this.config.port ?? 8883}`,
        {
          username: 'bblp',
          password: this.config.token,
          reconnectPeriod: 1,
          rejectUnauthorized: false,
        }
      );
      this.emit('connecting', this.mqttClient);

      this.mqttClient.once('connect', () => resolve());
      this.mqttClient.on('connect', this.onConnect.bind(this));
      this.mqttClient.on('disconnect', this.onDisconnect.bind(this));
      this.mqttClient.on('message', (topic, packet) =>
        this.emit('rawMessage', topic, packet)
      );

      this.mqttClient.on('error', (error) => {
        console.error('Error connecting to Bambu MQTT server:', error.message);
        reject(error);
      });
    });
  }

  private async connectToFTP() {
    this.ftp.ftp.verbose = true;
    return this.ftp.access({
      host: this.config.host,
      port: 990,
      user: 'bblp',
      password: this.config.token,
      secure: 'implicit',
      secureOptions: {
        timeout: 2 * 60 * 1000,
        sessionTimeout: 30 * 60 * 1000,
        rejectUnauthorized: false,
      },
    });
  }
}
