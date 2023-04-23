import { GCodeCommand } from './GCodeCommand';
import type { IntRange } from '../types';
import type { Status } from '../interfaces';

const fanMap = { cooling: 'P1', big_1: 'P2', big_2: 'P3' };

export class UpdateFanCommand extends GCodeCommand {
  public constructor(fan: keyof Status['fans'], percent: IntRange<0, 101>) {
    console.log(fan, fanMap, fan in fanMap);

    if (!(fan in fanMap)) {
      throw new Error('Cannot set this fan speed.');
    }

    super([`M106 ${fanMap[fan as keyof typeof fanMap]} S${(255 * percent) / 100}`]);
  }
}
