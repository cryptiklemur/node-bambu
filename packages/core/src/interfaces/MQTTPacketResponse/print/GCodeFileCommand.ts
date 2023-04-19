import type { PrintMessageCommand } from './PrintMessage';
import type { StringNumber as StringNumber } from '../../../types';

export interface GCodeFileCommand extends PrintMessageCommand {
  command: 'gcode_file';
  param: `${string}.gcode`;
  reason: 'SUCCESS' | 'FAILURE' | string;
  result: 'SUCCESS' | 'FAILURE' | string;
  sequence_id: StringNumber;
}

export function isGCodeFileCommand(data: PrintMessageCommand): data is GCodeFileCommand {
  return data.command === 'gcode_file';
}
