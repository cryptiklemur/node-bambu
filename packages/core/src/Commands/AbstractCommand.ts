import type { CommandInterface } from './CommandInterface';
import type { BambuClient } from '../BambuClient';

export abstract class AbstractCommand implements CommandInterface {
  public userId: CommandInterface['userId'] = 123_456_789;

  public abstract category: CommandInterface['category'];

  public abstract command: CommandInterface['command'];

  public abstract sequenceId: CommandInterface['sequenceId'];

  public constructor(public extra: CommandInterface['extra'] = {}) {}

  public invoke(client: BambuClient): Promise<void> {
    return client.publish({
      [this.category]: { sequence_id: '' + this.sequenceId, command: this.command, ...this.extra },
      user_id: this.userId,
    });
  }
}
