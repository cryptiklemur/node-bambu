import {PrintMessageCommand} from "./PrintMessage";
import {StringNum} from "../../../types";

export interface ProjectFileCommand extends PrintMessageCommand {
  command: 'project_file';
  param: `Metadata/${string}.gcode`;
  reason: 'SUCCESS' | 'FAILURE' | string;
  result: 'SUCCESS' | 'FAILURE' | string;
  sequence_id: StringNum;
  subtask_name: `${number}.3mf`;
}

export function isProjectFileCommand(data: PrintMessageCommand): data is ProjectFileCommand {
  return data.command === 'project_file';
}
