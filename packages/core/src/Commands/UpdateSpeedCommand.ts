import { AbstractCommand } from './AbstractCommand';
import type { CommandInterface } from './CommandInterface';
import type { IntRange } from '../types';

export class UpdateSpeedCommand extends AbstractCommand {
  public category: CommandInterface['category'] = 'print';
  public command: CommandInterface['command'] = 'print_speed';
  public sequenceId: CommandInterface['sequenceId'] = 2004;

  public constructor(speed: IntRange<1, 5>) {
    super({ param: speed.toString() });
  }
}
