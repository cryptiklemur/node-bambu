import type { StringNumber as StringNumber } from '../../../types';
import type { InfoMessageCommand } from './InfoMessage';

export interface VersionModule {
  hw_ver: string;
  name: string;
  sn: string;
  sw_ver: string;
}

export interface GetVersionCommand extends InfoMessageCommand {
  command: 'get_version';
  module: VersionModule[];
  sequence_id: StringNumber;
}

export function isGetVersionCommand(data: InfoMessageCommand): data is GetVersionCommand {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return data.command === 'get_version';
}
