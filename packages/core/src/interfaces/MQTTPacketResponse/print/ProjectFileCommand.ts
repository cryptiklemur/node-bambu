import type { PrintMessageCommand } from './PrintMessage';
import type { StringNumber as StringNumber } from '../../../types';

export interface ProjectFileCommand extends PrintMessageCommand {
  command: 'project_file';
  param: `Metadata/${string}.gcode`;
  reason: 'SUCCESS' | 'FAILURE' | string;
  result: 'SUCCESS' | 'FAILURE' | string;
  sequence_id: StringNumber;
  subtask_name: `${number}.3mf`;
}

export function isProjectFileCommand(data: PrintMessageCommand): data is ProjectFileCommand {
  return data.command === 'project_file';
}
