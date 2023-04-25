import { Job } from '../Job/Job';
import type { PushStatusCommand } from '../interfaces/MQTTPacketResponse/print';
import type { BambuClient } from '../BambuClient';
import type { Status } from '../interfaces';
import { getStatusFromCommand } from './status/getStatusFromCommand';
import type { CleanPushInfoCommand } from '../interfaces/MQTTPacketResponse/mc_print';
import type { AMSRawData } from '../interfaces/Status';

export class PrinterStatus {
  public get currentJob(): Job | undefined {
    return this._currentJob;
  }

  private set currentJob(value: Job | undefined) {
    if (!!this.currentJob && !!value && this.currentJob.id === value.id) {
      return;
    }

    this._currentJob = value;

    if (this._currentJob) {
      this.bambu.emit('print:start', this._currentJob);
    }
  }

  public get lastJob(): Job | undefined {
    return this._lastJob;
  }

  private set lastJob(value: Job | undefined) {
    this._lastJob = value;

    if (this._lastJob) {
      this.bambu.emit('print:finish', this._lastJob);
    }
  }

  public get latestStatus(): Status | undefined {
    return this._latestStatus;
  }

  public set latestStatus(value: Status | undefined) {
    if (!this._currentJob && value) {
      value.state = 'IDLE';
    }

    this._latestStatus = value;
  }

  public get idle() {
    return !this._currentJob;
  }

  private _currentJob?: Job | undefined;
  private _lastJob?: Job | undefined;
  private _latestStatus?: Status | undefined;

  private _amsData: Record<number, AMSRawData> = {};

  public constructor(private bambu: BambuClient) {}

  /**
   * When the library receives a print.push_status command, we should
   *
   * 1. Check the gcode_state of the push_status
   *    a. If its FINISH
   *        i. Check to see if we have a current job
   *            If we do, end it, move it to previousJob, and update the status
   *        ii. If we don't, check to see if we have a previous job
   *            If we don't, create it and fill it
   *            If we do, update the status
   *    b. If its PREPARE
   *        i. Check to see if we have a current job
   *            If we do, end it, move it to previousJob
   *        ii. Create a new currentJob, fill it with this status
   *    c. Anything else, check to see if we have a current job
   *            If we do, update it
   *            If we don't, create a new one and fill it with this status
   * @param data
   */
  public async onStatus(data: PushStatusCommand) {
    this.latestStatus = getStatusFromCommand(data, this._amsData);

    switch (data.gcode_state) {
      case 'FINISH': {
        if (this.currentJob) {
          this.lastJob = this.currentJob.end(data, this._amsData);
          this.currentJob = undefined;

          return;
        }

        if (!this.lastJob) {
          this.lastJob = new Job(data, this._amsData).end(data, this._amsData);

          return;
        }

        this.latestStatus.state = 'IDLE';
        this.lastJob.updateStatus(data, this._amsData);

        return;
      }

      case 'PREPARE': {
        if (this.currentJob) {
          this.lastJob = this.currentJob.end(data, this._amsData);
        }

        this.currentJob = new Job(data, this._amsData);

        return;
      }

      default: {
        if (this.currentJob) {
          this.currentJob.updateStatus(data, this._amsData);
          this.bambu.emit('print:update', this.currentJob);

          return;
        }

        this.currentJob = new Job(data, this._amsData);
        this.bambu.emit('print:update', this.currentJob);

        return;
      }
    }
  }

  public async onPushInfo(data: CleanPushInfoCommand): Promise<void> {
    switch (data.category) {
      case 'AMS': {
        {
          const amsId = /^ams([0-3])/.exec(data.content)?.[1];

          if (!amsId) {
            return;
          }

          const temporaryAndHumidityRegex = /temp:([\d.]+);humidity:([\d.]+)%;humidity_idx:([0-5])/;

          if (temporaryAndHumidityRegex.test(data.content)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [, realTemporary, humidityPercent, humidityIndex] = temporaryAndHumidityRegex.exec(data.content)!;

            this._amsData[Number.parseInt(amsId, 10)] = {
              humidityIdx: Number.parseInt(humidityIndex, 10),
              humidityPercent: Number.parseInt(humidityPercent, 10),
              realTemp: Number.parseInt(realTemporary, 10),
            };
          }
        }
      }
    }

    return;
  }
}
