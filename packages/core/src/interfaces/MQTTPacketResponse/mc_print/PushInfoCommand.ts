import type { MCPrintMessageCommand } from './McPrintMessage';
import type { StringNumber as StringNumber } from '../../../types';

export interface PushInfoCommand extends MCPrintMessageCommand {
  command: 'push_info';
  param: string;
  sequence_id: StringNumber;
}

export function isPushInfoCommand(data: MCPrintMessageCommand): data is PushInfoCommand {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return data.command === 'push_info';
}

export interface CleanPushInfoCommand {
  category: string;
  content: string;
  rawParam: string;
  sequenceId: number;
  subcategory?: string;
}

export function getCleanPushInfoCommand(command: PushInfoCommand): CleanPushInfoCommand {
  const [, category, subcategory, content] = command.param.match(/^\[(.+?)](?:\[(.+?)])?:\s*(.+)$/) ?? [];

  return {
    sequenceId: Number(command.sequence_id),
    category,
    subcategory,
    content,
    rawParam: command.param,
  };
}
