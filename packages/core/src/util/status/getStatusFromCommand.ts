import type { PushStatusCommand } from '../../interfaces/MQTTPacketResponse/print';
import type { Status } from '../../interfaces';
import type { IntRange } from '../../types';
import { getStageAsString } from './getStageAsString';
import { getStream } from './getStream';

export function getStatusFromCommand(data: PushStatusCommand): Status {
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

  return {
    ams: data.ams,
    currentLayer: data.layer_num,
    maxLayers: data.total_layer_num,
    gcodeFile: data.gcode_file,
    startTime: parseInt(data.gcode_start_time, 10) * 1000,
    state: data.gcode_state,
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
      level: data.spd_lvl,
      name: getSpeed(data.spd_lvl),
      percent: data.spd_mag,
    },
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
    stream: getStream(data.ipcam),
  };
}
