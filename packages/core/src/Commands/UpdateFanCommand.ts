import { GCodeCommand } from './GCodeCommand';
import type { IntRange } from '../types';

const fanMap = { partCooling: 'P1', aux: 'P2', chamber: 'P3' };

export class UpdateFanCommand extends GCodeCommand {
  public constructor(fan: 'partCooling' | 'aux' | 'chamber', percent: IntRange<0, 101>) {
    super([`M106 ${fanMap[fan]} ${(255 * percent) / 100}`]);
  }
}
