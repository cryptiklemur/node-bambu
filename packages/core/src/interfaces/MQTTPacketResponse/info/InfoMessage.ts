export type InfoMessageCommands = 'get_version';

export interface InfoMessage {
  info: InfoMessageCommand;
}

export type InfoMessageCommand = { command: InfoMessageCommands } & Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInfoMessage(data: any): data is InfoMessage {
  return !!data?.info && !!data?.info?.command && ['info'].includes(data.info.command);
}
