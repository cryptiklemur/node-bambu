import type { PushStatusCommand } from './interfaces/MQTTPacketResponse/print';
import type { Status } from './interfaces';
import { getStatusFromCommand } from './util/status/getStatusFromCommand';

export class Job {
  public get prepareStatus(): Status | undefined {
    return this._prepareStatus;
  }

  public get finishStatus(): Status | undefined {
    return this._finishStatus;
  }
  private _status: Status;
  private _prepareStatus: Status | undefined;
  private _finishStatus: Status | undefined;

  public getChamberLights() {
    return this.status.lights.find((x) => x.name === 'chamber_light');
  }

  public getState() {
    return this.status.state;
  }
  public getSpeed() {
    return this.status.speed.level;
  }

  public get status() {
    return this._status;
  }

  public get startTime() {
    return this.status?.startTime;
  }

  public get endTime() {
    return this.status?.finishTime;
  }

  public constructor(command: PushStatusCommand, ended = false) {
    if (command.gcode_state === 'PREPARE') {
      this._prepareStatus = getStatusFromCommand(command);
    } else if (command.gcode_state === 'FINISH') {
      this._finishStatus = getStatusFromCommand(command);
    }

    this._status = getStatusFromCommand(command);

    if (ended) {
      this.end(command);
    }
  }

  public updateStatus(command: PushStatusCommand) {
    this._status = getStatusFromCommand(command);
  }

  public end(command: PushStatusCommand) {
    const status = getStatusFromCommand(command);

    status.finishTime = Date.now();
    this._status = status;
    this._finishStatus = status;

    return this;
  }
}
