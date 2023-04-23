import type { BambuClient } from '../BambuClient';

export interface CommandInterface {
  category: 'info' | 'pushing' | 'system' | 'print';
  command: string;
  extra?: Record<string, unknown>;
  invoke(client: BambuClient): Promise<void>;
  sequenceId: number;

  userId: 123_456_789;
}
