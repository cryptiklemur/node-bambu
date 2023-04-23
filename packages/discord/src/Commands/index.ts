import { PermanentStatusCommand } from './PermanentStatusCommand';
import { PrinterCommand } from './PrinterCommand';
import { StatusCommand } from './StatusCommand';
import { SubscribeCommand } from './SubscribeCommand';
import { UnsubscribeCommand } from './UnsubscribeCommand';
import { TemperatureCommand } from './TemperatureCommand';
import { SpeedCommand } from './SpeedCommand';
import { StateCommand } from './StateCommand';

export { AbstractCommand } from './AbstractCommand';
export { BaseStatusCommand } from './BaseStatusCommand';

export { PermanentStatusCommand } from './PermanentStatusCommand';
export { PrinterCommand } from './PrinterCommand';
export { SpeedCommand } from './SpeedCommand';
export { StateCommand } from './StateCommand';
export { StatusCommand } from './StatusCommand';
export { SubscribeCommand } from './SubscribeCommand';
export { TemperatureCommand } from './TemperatureCommand';
export { UnsubscribeCommand } from './UnsubscribeCommand';

export const Commands = [
  PermanentStatusCommand,
  PrinterCommand,
  SpeedCommand,
  StateCommand,
  StatusCommand,
  SubscribeCommand,
  TemperatureCommand,
  UnsubscribeCommand,
];
