import { PermanentStatusCommand } from './PermanentStatusCommand';
import { PrinterCommand } from './PrinterCommand';
import { StatusCommand } from './StatusCommand';
import { SubscribeCommand } from './SubscribeCommand';
import { UnsubscribeCommand } from './UnsubscribeCommand';
import { TemperatureCommand } from './TemperatureCommand';
import { SpeedCommand } from './SpeedCommand';

export { AbstractCommand } from './AbstractCommand';
export { BaseStatusCommand } from './BaseStatusCommand';
export { PermanentStatusCommand } from './PermanentStatusCommand';
export { PrinterCommand } from './PrinterCommand';
export { SpeedCommand } from './SpeedCommand';
export { StatusCommand } from './StatusCommand';
export { SubscribeCommand } from './SubscribeCommand';
export { TemperatureCommand } from './TemperatureCommand';
export { UnsubscribeCommand } from './UnsubscribeCommand';

export const Commands = [
  PermanentStatusCommand,
  PrinterCommand,
  SpeedCommand,
  StatusCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  TemperatureCommand,
];
