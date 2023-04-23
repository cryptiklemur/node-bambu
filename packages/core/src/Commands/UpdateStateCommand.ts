import { AbstractCommand } from './AbstractCommand';
import type { CommandInterface } from './CommandInterface';

const sequenceMap = { pause: 2008, resume: 2009, stop: 2010 };

export class UpdateStateCommand extends AbstractCommand {
  public category: CommandInterface['category'] = 'print';
  public command: CommandInterface['command'];
  public sequenceId: CommandInterface['sequenceId'];

  public constructor(state: 'pause' | 'resume' | 'stop') {
    super();
    this.command = state;
    this.sequenceId = sequenceMap[state];
  }
}
