import * as mqtt from 'mqtt';
import debug from 'debug';
import {GET_VERSION, PUSH_ALL} from "./Commands";
import * as events from 'eventemitter3';
import {PushStatus} from "./interfaces/MQTTPacketResponse/PushStatus";
import * as os from "os";
import * as path from "path";

const baseLog = debug('bambu:BambuClient');

interface BambuConfig {
  host: string;
  port?: number;
  token: string;
  serial: string;
}

export interface Status {
  taskName: string;
  gcodeFile: string;
  gcodeStartTime: number;
  gcodeState: PushStatus['gcode_state'];
  ipcam: {
    dev: boolean;
    record: boolean;
    resolution: PushStatus['ipcam']['resolution'];
    timelapse: boolean;
  }
  currentLayer: number;
  maxLayers: number;
  lights: Array<{
    name: string;
    mode: PushStatus['lights_report'][0]['mode']
  }>;
  ams: any;
  progressPercent: number;
  printStage: number;
  remainingTime: number;
  temperatures: {
    bed: Temperature<0>;
    extruder: Temperature<0>;
    chamber: Temperature<0, 0>;
  }
  stream?: string;
}

interface Temperature<PowerType extends number = number, TargetType extends number = number, ActualType extends number = number> {
  power: PowerType;
  target: TargetType;
  actual: ActualType;
}

export class BambuClient extends events.EventEmitter {
  private mqttClient: mqtt.MqttClient | undefined;

  private device: any;

  private status: Status | undefined;

  public get connected() {
    return this.mqttClient?.connected ?? false;
  }

  public constructor(private config: BambuConfig) {
    super();
  }

  public async connect() {
    return new Promise((resolve) => {
      this.mqttClient = mqtt.connect(`mqtts://${this.config.host}:${this.config.port ?? 8883}`, {
        username: 'bblp',
        password: this.config.token,
        reconnectPeriod: 1,
        rejectUnauthorized: false
      });
      this.emit('connecting', this.mqttClient);

      this.mqttClient.once('connect', resolve);
      this.mqttClient.on('connect', this.onConnect.bind(this));
      this.mqttClient.on('disconnect', this.onDisconnect.bind(this))

      this.mqttClient.on('error', (error) => {
        console.error('Error connecting to Bambu MQTT server:', error.message);
      });
    })
  }

  public async disconnect(force = false, opts?: Object) {
    return new Promise((resolve) => this.mqttClient?.end(force, opts, resolve));
  }

  public getStatus() {
    return this.status;
  }

  public subscribe(topic: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.')
      }

      this.mqttClient.subscribe(topic, (error) => {
        this.emit('subscribed', topic, error);
        if (error) {
          return reject(`Error subscribing to topic '${topic}': ${error.message}`)
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
    })
  }

  public publish(message: object): Promise<void>
  public publish(message: string): Promise<void>
  public publish(message: string | object): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.mqttClient) {
        return reject('Client not connected.')
      }

      const msg = typeof message === 'string' ? message : JSON.stringify(message);

      const topic = `device/${this.config.serial}/request`;
      this.mqttClient.publish(topic, msg, (error) => {
        this.emit('published', topic, message, error);
        if (error) {
          return reject(`Error publishing to topic '${topic}': ${error.message}`)
        }
        resolve();
      });
    })
  }

  private async onConnect(packet: mqtt.IConnackPacket): Promise<void> {
    this.emit('connected', packet);
    const log = baseLog.extend('onConnect');

    log('Connected to printer');
    log('Subscribing to device report');
    await this.subscribe(`device/${this.config.serial}/report`);
    log('Getting version info');
    await this.publish(GET_VERSION);
    log('Request Push All')
    await this.publish(PUSH_ALL);
  }

  private onMessage(packet: string) {
    this.emit('message', packet);
    const log = baseLog.extend('onMessage');
    const data = JSON.parse(packet);
    const key = Object.keys(data)[0];
    log('Key: %s, Data: %s', key, JSON.stringify(data[key]));
    if (data?.info?.command === 'get_version') {
      log('Got version command data', data.info);
      this.device = data.info;

      return;
    }

    if (data?.print?.command === 'push_status') {
      log('Got status.');
      this.setStatus(data.print);
      this.emit('status', this.status);
    }
  }

  private setStatus(data: PushStatus) {
    this.status = {
      ams: data.ams,
      currentLayer: data.layer_num,
      maxLayers: data.total_layer_num,
      gcodeFile: data.gcode_file,
      gcodeStartTime: parseInt(data.gcode_start_time, 10),
      gcodeState: data.gcode_state,
      ipcam: {
        dev: data.ipcam.ipcam_dev === '1',
        record: data.ipcam.ipcam_record === 'enable',
        resolution: data.ipcam.resolution,
        timelapse: data.ipcam.timelapse === 'enable'
      },
      lights: data.lights_report.map((x) => ({name: x.node, mode: x.mode})),
      printStage: Number(data.mc_print_stage),
      progressPercent: Number(data.mc_percent),
      remainingTime: data.mc_remaining_time,
      taskName: data.subtask_name,
      temperatures: {
        bed: {
          power: 0,
          target: data.bed_target_temper,
          actual: data.bed_temper
        },
        extruder: {
          power: 0,
          target: data.nozzle_target_temper,
          actual: data.nozzle_temper,
        },
        chamber: {
          power: 0,
          target: 0,
          actual: data.chamber_temper
        }
      },
      stream: this.getStream(data.ipcam)
    };
  }

  private getStream(ipcam: PushStatus['ipcam']) {
    if (ipcam.ipcam_dev === '0' || ipcam.ipcam_record === 'disable') {
      return undefined;
    }

    switch (os.platform()) {
      case 'win32':
        return path.resolve('%appdata%', 'BambuStudio', 'cameratools', 'ffmpeg.sdp');
      case 'darwin':
        return path.resolve('/Users/', os.userInfo().username, 'Library', 'Application Support', 'BambuStudio', 'cameratools', 'ffmpeg.sdp');
      default:
        return undefined;
    }
  }

  private onDisconnect(packet: mqtt.IDisconnectPacket) {
    this.emit('disconnected', packet);
    baseLog.extend('onDisconnect')(`Disconnected from printer: ${packet.reasonCode}`)
  }
}
