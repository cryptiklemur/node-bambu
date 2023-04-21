import type * as mqtt from 'mqtt';

import type { GetVersionCommand } from './MQTTPacketResponse/info';
import type {
  GCodeFileCommand,
  GCodeLineCommand,
  ProjectFileCommand,
  PushStatusCommand,
  ResumeCommand,
} from './MQTTPacketResponse/print';
import type { CleanPushInfoCommand, PushInfoCommand } from './MQTTPacketResponse/mc_print';
import type { Job } from '../Job/Job';

export interface BambuClientEvents {
  'command:gcode_file': [data: GCodeFileCommand];
  'command:gcode_line': [data: GCodeLineCommand];
  'command:get_version': [data: GetVersionCommand];
  'command:project_file': [data: ProjectFileCommand];
  'command:push_info': [data: PushInfoCommand];
  'command:push_info:clean': [data: CleanPushInfoCommand];
  'command:push_status': [data: PushStatusCommand];
  'command:resume': [data: ResumeCommand];
  connected: [packet: mqtt.IConnackPacket];
  connecting: [client: mqtt.MqttClient];
  disconnected: [packet: mqtt.IDisconnectPacket];
  'ftp:debug': [message: string];
  message: [packet: unknown];
  'print:finish': [job: Job];
  'print:start': [job: Job];
  'print:update': [job: Job];
  published: [topic: string, message: string, error?: Error];
  rawMessage: [topic: string, payload: Buffer];
  subscribed: [topic: string, error?: Error];
}
