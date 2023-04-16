export class PrinterStatus {
  // The idle state of the printer
  private idle: boolean | undefined;

  // A NodeJS.Timeout object to handle the timeout for checking if the printer is idle
  private idleTimeout: NodeJS.Timeout | null = null;

  // The desired interval (5 minutes) in milliseconds to wait before setting `idle` to true
  private idleCheckInterval = 5 * 60 * 1000;

  // The previous value of `gcode_state`
  private previousGcodeState: string | null = null;

  // Starts the idle check by clearing any existing timeout and setting a new timeout
  // to update the `idle` property after the specified interval
  private startIdleCheck(): void {
    this.clearIdleCheck();

    this.idleTimeout = setTimeout(() => {
      this.idle = true;
    }, this.idleCheckInterval);
  }

  // Clears the existing idle check timeout if there is one
  private clearIdleCheck(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  // This method should be called with each status update
  // If `gcode_state` is 'FINISH', it starts the idle check only if the previous `gcode_state` was not 'FINISH'
  // If `gcode_state` changes to anything else, it stops the check and sets `idle` to false
  public onStatusUpdate(gcode_state: string): void {
    if (gcode_state === 'FINISH') {
      if (this.previousGcodeState !== 'FINISH') {
        this.startIdleCheck();
      }
    } else {
      this.clearIdleCheck();
      this.idle = false;
    }
    this.previousGcodeState = gcode_state;
  }

  public get isIdle() {
    return this.idle === true;
  }

  public setInitialIdle(idle?: boolean) {
    console.log('Setting initial idle status to: ', idle);
    this.idle = idle;
  }
}
