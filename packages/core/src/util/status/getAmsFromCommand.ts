import type { PushStatusCommand } from '../../interfaces/MQTTPacketResponse/print';
import type { AMS, AMSTray } from '../../interfaces';
import type { IntRange } from '../../types';
import type { AMSRawData } from '../../interfaces/Status';

export function getAmsFromCommand(data: PushStatusCommand['ams'], amsData?: Record<number, AMSRawData>): AMS[] {
  return data.ams.map(
    (ams, index) =>
      ({
        id: Number(ams.id),
        humidity: Number(ams.humidity),
        humidityPercent: amsData?.[index]?.humidityPercent,
        humidityIdx: amsData?.[index]?.humidityIdx,
        realTemp: amsData?.[index]?.realTemp,
        temp: Number(ams.temp),
        trays: [
          getAMSTrayFromCommand(ams.tray[0], data.tray_now === '0'),
          getAMSTrayFromCommand(ams.tray[1], data.tray_now === '1'),
          getAMSTrayFromCommand(ams.tray[2], data.tray_now === '2'),
          getAMSTrayFromCommand(ams.tray[3], data.tray_now === '3'),
        ],
      } as AMS),
  );
}

function getAMSTrayFromCommand(
  tray: PushStatusCommand['ams']['ams'][0]['tray'][0],
  isActive: boolean,
): AMSTray | undefined {
  if (!tray) {
    return undefined;
  }

  return {
    id: Number(tray.id) as IntRange<0, 4>,
    active: isActive,
    bedTemp: Number(tray.bed_temp),
    bedTempType: Number(tray.bed_temp_type),
    color: Number.parseInt(tray.tray_color, 16),
    diameter: Number(tray.tray_diameter),
    drying: {
      temp: Number(tray.drying_temp),
      time: Number(tray.drying_time),
    },
    idName: tray.tray_id_name,
    infoIdx: tray.tray_info_idx,
    nozzleTemp: {
      min: Number(tray.nozzle_temp_min),
      max: Number(tray.nozzle_temp_max),
    },
    type: tray.tray_type,
    weight: Number(tray.tray_weight),
  };
}
