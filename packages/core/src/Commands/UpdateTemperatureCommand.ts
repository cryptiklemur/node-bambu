import { GCodeCommand } from './GCodeCommand';
import type { IntRange } from '../types';

export class UpdateTemperatureCommand extends GCodeCommand {
  public constructor(part: 'extruder', temperature: IntRange<0, 301>);
  public constructor(part: 'bed', temperature: IntRange<0, 111>);
  public constructor(part: 'bed' | 'extruder', temperature: IntRange<0, 111> | IntRange<0, 301>) {
    super([`M140 S${temperature}`]);
  }
}
