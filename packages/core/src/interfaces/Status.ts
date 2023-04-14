import {PushStatusCommand} from "./MQTTPacketResponse/print";


export interface Status {
  taskName: string;
  gcodeFile: string;
  gcodeStartTime: number;
  gcodeState: PushStatusCommand['gcode_state'] | 'IDLE';
  ipcam: {
    dev: boolean;
    record: boolean;
    resolution: PushStatusCommand['ipcam']['resolution'];
    timelapse: boolean;
  }
  currentLayer: number;
  maxLayers: number;
  lights: Array<{
    name: string;
    mode: PushStatusCommand['lights_report'][0]['mode']
  }>;
  ams: PushStatusCommand['ams'];
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

export interface Temperature<PowerType extends number = number, TargetType extends number = number, ActualType extends number = number> {
  power: PowerType;
  target: TargetType;
  actual: ActualType;
}
