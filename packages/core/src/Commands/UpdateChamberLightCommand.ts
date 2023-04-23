import { AbstractCommand } from './AbstractCommand';
import type { CommandInterface } from './CommandInterface';

export class UpdateChamberLightCommand extends AbstractCommand {
  public category: CommandInterface['category'] = 'system';
  public command: CommandInterface['command'] = 'ledctrl';
  public sequenceId: CommandInterface['sequenceId'] = 2003;

  public constructor(
    mode: 'on' | 'off' | 'flashing',
    // eslint-disable-next-line unicorn/no-object-as-default-parameter
    loopOptions = { led_on_time: 500, led_off_time: 500, loop_times: 0, interval_time: 0 },
  ) {
    super({
      led_node: 'chamber_light',
      led_mode: mode,
      ...loopOptions,
    });
  }
}
