export type PrintMessageCommands = 'push_status' | 'resume' | 'gcode_line' | 'gcode_file' | 'project_file';

export type PrintMessage = { print: PrintMessageCommand };
export type PrintMessageCommand = { command: PrintMessageCommands } & Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPrintMessage(data: any): data is PrintMessage {
  return (
    !!data.print &&
    !!data.print.command &&
    (data.print.command as PrintMessageCommands) &&
    ['push_status', 'resume', 'gcode_line', 'gcode_file', 'project_file'].includes(data.print.command)
  );
}
