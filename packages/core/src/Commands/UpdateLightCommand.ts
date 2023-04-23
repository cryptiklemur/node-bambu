import { GCodeCommand } from './GCodeCommand';

const lightMap = { logo: 'S5', nozzle: 'S4' };

export class UpdateLightCommand extends GCodeCommand {
  public constructor(light: 'logo' | 'nozzle', mode: 'on' | 'off') {
    super([`M960 ${lightMap[light]} ${mode === 'on' ? 'P1' : 'P0'}`]);
  }
}
