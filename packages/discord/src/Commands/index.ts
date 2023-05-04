import { PermanentStatusCommand } from './PermanentStatusCommand';
import { PrinterCommand } from './PrinterCommand';
import { StatusCommand } from './StatusCommand';
import { SubscribeCommand } from './SubscribeCommand';
import { UnsubscribeCommand } from './UnsubscribeCommand';
import { TemperatureCommand } from './TemperatureCommand';
import { SpeedCommand } from './SpeedCommand';
import { StateCommand } from './StateCommand';
import { LightCommand } from './LightCommand';
import { FanCommand } from './FanCommand';
import { VersionCommand } from './VersionCommand';
import { QueueCommand } from './QueueCommand';

export { AbstractPrinterCommand } from './AbstractPrinterCommand';
export { BaseStatusCommand } from './BaseStatusCommand';

export { FanCommand } from './FanCommand';
export { LightCommand } from './LightCommand';
export { PermanentStatusCommand } from './PermanentStatusCommand';
export { PingCommand } from './PingCommand';
export { PrinterCommand } from './PrinterCommand';
export { QueueCommand } from './QueueCommand';
export { SpeedCommand } from './SpeedCommand';
export { StateCommand } from './StateCommand';
export { StatusCommand } from './StatusCommand';
export { SubscribeCommand } from './SubscribeCommand';
export { TemperatureCommand } from './TemperatureCommand';
export { UnsubscribeCommand } from './UnsubscribeCommand';
export { VersionCommand } from './VersionCommand';

export const Commands = [
  FanCommand,
  LightCommand,
  PermanentStatusCommand,
  PrinterCommand,
  QueueCommand,
  SpeedCommand,
  StateCommand,
  StatusCommand,
  SubscribeCommand,
  TemperatureCommand,
  UnsubscribeCommand,
  VersionCommand,
];
