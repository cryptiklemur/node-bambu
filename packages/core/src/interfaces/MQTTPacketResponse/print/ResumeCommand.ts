import type { PrintMessageCommand } from './PrintMessage';
import type { StringNumber as StringNumber } from '../../../types';

export interface ResumeCommand extends PrintMessageCommand {
  command: 'resume';
  param: ``;
  reason: 'SUCCESS' | 'FAILURE' | string;
  result: 'SUCCESS' | 'FAILURE' | string;
  sequence_id: StringNumber;
}

export function isResumeCommand(data: PrintMessageCommand): data is ResumeCommand {
  return data.command === 'resume';
}
