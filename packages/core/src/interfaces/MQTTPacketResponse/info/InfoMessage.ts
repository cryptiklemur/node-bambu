export type InfoMessageCommands = 'get_version';

export type InfoMessage = { info: InfoMessageCommand };
export type InfoMessageCommand = { command: InfoMessageCommands } & Record<string, unknown>

export function isInfoMessage(data: any): data is InfoMessage {
  return !!data.info
    && !!data.info.command
    && data.info.command as InfoMessageCommands
    && ['info'].includes(data.info.command);
}
