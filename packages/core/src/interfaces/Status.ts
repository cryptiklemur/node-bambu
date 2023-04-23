import type { PushStatusCommand } from './MQTTPacketResponse/print';
import type { IntRange } from '../types';

export interface AMSTray {
  active: boolean;
  bedTemp: number;
  bedTempType: number;
  color: number;
  diameter: number;
  drying: {
    temp: number;
    time: number;
  };
  id: IntRange<0, 4>;
  idName: string;
  infoIdx: string;
  nozzleTemp: {
    max: number;
    min: number;
  };
  type: string;
  weight: number;
}

export interface AMS extends AMSRawData {
  humidity: number;
  id: number;
  temp: number;
  trays: [AMSTray | undefined, AMSTray | undefined, AMSTray | undefined, AMSTray | undefined];
}

export interface AMSRawData {
  humidityIdx: number;
  humidityPercent: number;
  realTemp: number;
}

export interface HMS {
  code: `HMS_${string}`;
  description: Promise<string | undefined>;
  url: string | undefined;
}

export interface Status {
  amses: AMS[];
  /**
   * Current layer number
   */
  currentLayer: number;
  /**
   * Estimated total time
   */
  estimatedTotalTime: number;
  fans: {
    big_1: IntRange<0, 100>;
    big_2: IntRange<0, 100>;
    cooling: IntRange<0, 100>;
    gear: number;
    heatbreak: IntRange<0, 100>;
  };
  /**
   * Time that the job finished in milliseconds
   */
  finishTime?: number;
  /**
   * Name of the gcode file
   */
  gcodeFile: string;
  hms: HMS[];
  ipcam: {
    dev: boolean;
    record: boolean;
    resolution: PushStatusCommand['ipcam']['resolution'];
    timelapse: boolean;
  };
  lights: Light[];
  /**
   * Max number of layers
   */
  maxLayers: number;
  /**
   * Current stage of the build
   */
  printStage: {
    completedStages: number[];
    text: string;
    value: number;
  };
  printType: 'local' | 'cloud';
  profileId: number;
  /**
   * Current progress, as a percent
   */
  progressPercent: number;
  projectId: number;
  /**
   * Time remaining to print the job  in milliseconds
   */
  remainingTime: number;
  sdCard: boolean;
  /**
   * Speed of the print
   */
  speed: {
    level: IntRange<1, 5>;
    name: string;
    percent: number;
  };
  /**
   * Time that the job started in milliseconds
   */
  startTime: number;
  /**
   * Current state of the bot
   */
  state: PushStatusCommand['gcode_state'] | 'IDLE';
  /**
   * The link to the stream file, if any
   */
  stream?: string;
  subtaskId: number;
  subtaskName: string;
  taskId: number;
  /**
   * Name of the task
   */
  taskName: string;
  temperatures: {
    amses:
      | [Temperature<0, 0>]
      | [Temperature<0, 0>, Temperature<0, 0>]
      | [Temperature<0, 0>, Temperature<0, 0>, Temperature<0, 0>]
      | [Temperature<0, 0>, Temperature<0, 0>, Temperature<0, 0>, Temperature<0, 0>];
    bed: Temperature<0>;
    chamber: Temperature<0, 0>;
    extruder: Temperature<0>;
  };
  wifiSignal: string;
}

export interface Temperature<
  PowerType extends number = number,
  TargetType extends number = number,
  ActualType extends number = number,
> {
  actual: ActualType;
  power: PowerType;
  target: TargetType;
}

export interface Light {
  mode: PushStatusCommand['lights_report'][0]['mode'];
  name: string;
}
