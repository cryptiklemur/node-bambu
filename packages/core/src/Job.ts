import type JSZip from 'JSZip';
import EventEmitter from 'eventemitter3';

import type { PushStatusCommand } from './interfaces/MQTTPacketResponse/print';
import type { Status } from './interfaces';
import { getStatusFromCommand } from './util/status/getStatusFromCommand';

export class Job {
  public get projectSettings(): Buffer | undefined {
    return this._projectSettings;
  }

  public get modelSettings(): Buffer | undefined {
    return this._modelSettings;
  }

  public get sliceInfo(): Buffer | undefined {
    return this._sliceInfo;
  }

  public get gcodeThumbnail(): Buffer | undefined {
    return this._gcodeThumbnail;
  }

  public get zip(): JSZip | undefined {
    return this._zip;
  }

  public get status() {
    return this._status;
  }

  public get prepareStatus(): Status | undefined {
    return this._prepareStatus;
  }

  public get finishStatus(): Status | undefined {
    return this._finishStatus;
  }

  public get startTime() {
    return this.status.startTime;
  }

  public get endTime() {
    return this.status.finishTime;
  }

  private _zip: JSZip | undefined;
  private _gcodeThumbnail?: Buffer;
  private _sliceInfo?: Buffer;
  private _modelSettings?: Buffer;
  private _projectSettings?: Buffer;

  private _status: Status;
  private _prepareStatus: Status | undefined;
  private _finishStatus: Status | undefined;

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

  public getChamberLights() {
    return this.status.lights.find((x) => x.name === 'chamber_light');
  }

  public getState() {
    return this.status.state;
  }

  public getSpeed() {
    return this.status.speed.level;
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

  public async updateZipFields(zip: JSZip) {
    this._zip = zip;

    const plate = this.status.gcodeFile.replace(/\/data\/Metadata\//, '').replace(/\.gcode$/, '');

    [this._gcodeThumbnail, this._sliceInfo, this._modelSettings, this._projectSettings] = await Promise.all([
      this._zip.file('Metadata/' + plate + '.png')?.async('nodebuffer'),
      this._zip.file('Metadata/slice_info.config')?.async('nodebuffer'),
      this._zip.file('Metadata/model_settings.config')?.async('nodebuffer'),
      this._zip.file('Metadata/project_settings.config')?.async('nodebuffer'),
    ]);
  }
}
