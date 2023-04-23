import { GCodeCommand } from './GCodeCommand';
import type { IntRange } from '../types';

export class UpdateTemperatureCommand extends GCodeCommand {
  public constructor(part: 'bed' | 'extruder', temperature: IntRange<0, 300>) {
    super([`M140 S${temperature}`]);
  }
}
