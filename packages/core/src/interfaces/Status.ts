import { PushStatusCommand } from './MQTTPacketResponse/print';
import { IntRange } from '../types';

export interface Status {
  /**
   * Name of the task
   */
  taskName: string;
  /**
   * Name of the gcode file
   */
  gcodeFile: string;
  /**
   * Current state of the bot
   */
  state: PushStatusCommand['gcode_state'] | 'IDLE';
  /**
   * Current layer number
   */
  currentLayer: number;
  /**
   * Max number of layers
   */
  maxLayers: number;
  /**
   * Current progress, as a percent
   */
  progressPercent: number;
  /**
   * Time that the job started in milliseconds
   */
  startTime: number;
  /**
   * Time that the job finished in milliseconds
   */
  finishTime: number | undefined;
  /**
   * Time remaining to print the job  in milliseconds
   */
  remainingTime: number;
  /**
   * Speed of the print
   */
  speed: {
    name: string;
    percent: number;
  };
  /**
   * Current stage of the build
   */
  printStage: {
    value: number;
    text: string;
  };
  /**
   * The link to the stream file, if any
   */
  stream?: string;
  ipcam: {
    dev: boolean;
    record: boolean;
    resolution: PushStatusCommand['ipcam']['resolution'];
    timelapse: boolean;
  };
  lights: Array<{
    name: string;
    mode: PushStatusCommand['lights_report'][0]['mode'];
  }>;
  ams: PushStatusCommand['ams'];
  temperatures: {
    bed: Temperature<0>;
    extruder: Temperature<0>;
    chamber: Temperature<0, 0>;
  };
  fans: {
    big_1: IntRange<0, 100>;
    big_2: IntRange<0, 100>;
    cooling: IntRange<0, 100>;
    heatbreak: IntRange<0, 100>;
    gear: number;
  };
}

export interface Temperature<
  PowerType extends number = number,
  TargetType extends number = number,
  ActualType extends number = number
> {
  power: PowerType;
  target: TargetType;
  actual: ActualType;
}
