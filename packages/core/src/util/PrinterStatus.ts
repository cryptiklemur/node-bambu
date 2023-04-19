import { Job } from '../Job';
import type { PushStatusCommand } from '../interfaces/MQTTPacketResponse/print';
import type { BambuClient } from '../BambuClient';
import type { Status } from '../interfaces';
import { getStatusFromCommand } from './status/getStatusFromCommand';

export class PrinterStatus {
  public get currentJob(): Job | undefined {
    return this._currentJob;
  }

  private set currentJob(value: Job | undefined) {
    this._currentJob = value;
    this.bambu.cache.set('printer-status:current-job', this._currentJob);

    if (this._currentJob) {
      this.bambu.emit('print:start', this._currentJob);
    }
  }

  public get lastJob(): Job | undefined {
    return this._lastJob;
  }

  private set lastJob(value: Job | undefined) {
    this._lastJob = value;
    this.bambu.cache.set('printer-status:last-job', this._lastJob);

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
    this.bambu.cache.set('printer-status:latest-status', this._latestStatus);
  }

  public get idle() {
    return !this._currentJob;
  }

  private _currentJob?: Job | undefined;
  private _lastJob?: Job | undefined;
  private _latestStatus?: Status | undefined;

  public constructor(private bambu: BambuClient) {}

  public async initialize() {
    [this._currentJob, this._lastJob, this._latestStatus] = await Promise.all([
      this.bambu.cache.get<Job>('printer-status:current-job'),
      this.bambu.cache.get<Job>('printer-status:last-job'),
      this.bambu.cache.get<Status>('printer-status:latest-status'),
    ]);
  }

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
    this.latestStatus = getStatusFromCommand(data);

    switch (data.gcode_state) {
      case 'FINISH':
        if (this.currentJob) {
          this.lastJob = this.currentJob.end(data);
          this.currentJob = undefined;

          return;
        }

        if (!this.lastJob) {
          this.lastJob = new Job(data).end(data);

          return;
        }

        this.latestStatus.state = 'IDLE';
        this.lastJob.updateStatus(data);

        return;

      case 'PREPARE':
        if (this.currentJob) {
          this.lastJob = this.currentJob.end(data);
        }

        this.currentJob = new Job(data);

        return;

      default:
        if (this.currentJob) {
          this.currentJob.updateStatus(data);
          this.bambu.emit('print:update', this.currentJob);

          return;
        }

        this.currentJob = new Job(data);
        this.bambu.emit('print:update', this.currentJob);

        return;
    }
  }
}
