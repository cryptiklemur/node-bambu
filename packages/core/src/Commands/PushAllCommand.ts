import { AbstractCommand } from './AbstractCommand';
import type { CommandInterface } from './CommandInterface';

export class PushAllCommand extends AbstractCommand {
  public category: CommandInterface['category'] = 'pushing';
  public command: CommandInterface['command'] = 'pushall';
  public sequenceId: CommandInterface['sequenceId'] = 1;
}
