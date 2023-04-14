import {Status} from "./Status";
import * as mqtt from "mqtt";
import {GetVersionCommand} from "./MQTTPacketResponse/info";
import {
  GCodeFileCommand,
  GCodeLineCommand,
  ProjectFileCommand,
  PushStatusCommand,
  ResumeCommand
} from "./MQTTPacketResponse/print";
import {CleanPushInfoCommand, PushInfoCommand} from "./MQTTPacketResponse/mc_print";


export interface BambuClientEvents {
  // status(status: Status): void;
  status: [status: Status];
  connecting: [client: mqtt.MqttClient];
  connected: [packet: mqtt.IConnackPacket];
  disconnected: [packet: mqtt.IDisconnectPacket];
  subscribed: [topic: string, error?: Error];
  published: [topic: string, message: string, error?: Error];
  rawMessage: [topic: string, payload: Buffer];
  message: [packet: unknown];
  'command:get_version': [data: GetVersionCommand];
  'command:push_status': [data: PushStatusCommand];
  'command:resume': [data: ResumeCommand];
  'command:gcode_line': [data: GCodeLineCommand];
  'command:gcode_file': [data: GCodeFileCommand];
  'command:project_file': [data: ProjectFileCommand];
  'command:push_info': [data: PushInfoCommand];
  'command:push_info:clean': [data: CleanPushInfoCommand];
}
