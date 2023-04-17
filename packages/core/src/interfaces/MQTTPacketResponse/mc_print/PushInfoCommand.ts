import type { MCPrintMessageCommand } from './MCPrintMessage';
import type { StringNum } from '../../../types';

export interface PushInfoCommand extends MCPrintMessageCommand {
  command: 'push_info';
  param: string;
  sequence_id: StringNum;
}

export function isPushInfoCommand(data: MCPrintMessageCommand): data is PushInfoCommand {
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
