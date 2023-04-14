import {PrintMessageCommand} from "./PrintMessage";
import {StringNum} from "../../../types";

export interface ResumeCommand extends PrintMessageCommand {
  command: 'resume';
  param: ``;
  reason: 'SUCCESS' | 'FAILURE' | string;
  result: 'SUCCESS' | 'FAILURE' | string;
  sequence_id: StringNum;
}

export function isResumeCommand(data: PrintMessageCommand): data is ResumeCommand {
  return data.command === 'resume';
}
