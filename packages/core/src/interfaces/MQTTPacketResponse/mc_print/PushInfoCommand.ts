import {MCPrintMessageCommand} from "./MCPrintMessage";
import {StringNum} from "../../../types";


export interface PushInfoCommand extends MCPrintMessageCommand {
  command: 'push_info';
  param: string;
  sequence_id: StringNum;
}

export function isPushInfoCommand(data: MCPrintMessageCommand): data is PushInfoCommand {
  return data.command === 'push_info';
}

export interface CleanPushInfoCommand {
  sequenceId: number;
  category: string;
  subcategory?: string;
  content: string;
  rawParam: string;
}

export function getCleanPushInfoCommand(command: PushInfoCommand): CleanPushInfoCommand {
  const [, category, subcategory, content] = command.param.match(/^\[(.+?)](?:\[(.+?)])?:\s*(.+)$/) ?? [];

  return {
    sequenceId: Number(command.sequence_id),
    category,
    subcategory,
    content,
    rawParam: command.param
  }
}
