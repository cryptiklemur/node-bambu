import type { PushStatusCommand } from './MQTTPacketResponse/print';
import type { IntRange } from '../types';

export interface Status {
  ams: PushStatusCommand['ams'];
  /**
   * Current layer number
   */
  currentLayer: number;
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
  ipcam: {
    dev: boolean;
    record: boolean;
    resolution: PushStatusCommand['ipcam']['resolution'];
    timelapse: boolean;
  };
  lights: Array<{
    mode: PushStatusCommand['lights_report'][0]['mode'];
    name: string;
  }>;
  /**
   * Max number of layers
   */
  maxLayers: number;
  /**
   * Current stage of the build
   */
  printStage: {
    text: string;
    value: number;
  };
  /**
   * Current progress, as a percent
   */
  progressPercent: number;
  /**
   * Time remaining to print the job  in milliseconds
   */
  remainingTime: number;
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
  /**
   * Name of the task
   */
  taskName: string;
  temperatures: {
    bed: Temperature<0>;
    chamber: Temperature<0, 0>;
    extruder: Temperature<0>;
  };
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
