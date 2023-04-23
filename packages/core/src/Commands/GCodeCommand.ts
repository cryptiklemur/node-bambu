import { AbstractCommand } from './AbstractCommand';
import type { CommandInterface } from './CommandInterface';

export class GCodeCommand extends AbstractCommand {
  public category: CommandInterface['category'] = 'print';
  public command: CommandInterface['command'] = 'gcode_line';
  public sequenceId: CommandInterface['sequenceId'] = 2026;

  public constructor(gcode: string[]) {
    super({ param: gcode.join('\n') + '\n' });
  }
}
