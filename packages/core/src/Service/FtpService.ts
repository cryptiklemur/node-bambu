import path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

import JSZip from 'JSZip';
import type ftp from 'basic-ftp';
import { FTPError } from 'basic-ftp';

import type { PrinterStatus } from '../util/PrinterStatus';
import type { BambuClient, BambuConfig } from '../BambuClient';
import type { Job } from '../Job/Job';
import type { Logger } from '../interfaces';
import { sleep } from '../util/sleep';

export class FtpService {
  private tempDir: string;
  private connecting = false;
  private taskRunning = false;

  public constructor(
    private bambu: BambuClient,
    private ftp: ftp.Client,
    private printerStatus: PrinterStatus,
    private logger: Logger,
    private config: BambuConfig,
  ) {
    this.tempDir = path.resolve(process.cwd(), '.temp-ftp');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir);
    }

    bambu.on('print:start', this.tryFetch3MF.bind(this));
  }

  public async connect() {
    if (this.connecting || !this.ftp.closed || this.taskRunning) {
      return;
    }

    this.connecting = true;
    this.taskRunning = true;

    return this.ftp
      .access({
        host: this.config.host,
        port: 990,
        user: 'bblp',
        password: this.config.token,
        secure: 'implicit',
        secureOptions: {
          timeout: 5 * 1000,
          sessionTimeout: 30 * 60 * 1000,
          rejectUnauthorized: false,
        },
      })
      .then((x) => {
        this.taskRunning = false;
        this.connecting = false;

        return x;
      });
  }

  private async tryFetch3MF(job: Job): Promise<void> {
    if (this.taskRunning) {
      return;
    }

    try {
      if (this.ftp.closed) {
        await this.connect();
      }

      const fileName = job.status.subtaskName.replace(/$\.3mf/, '') + '.3mf';

      this.logger.info(`Fetching ${fileName} from ftp`);
      const file = await this.runTask(() =>
        this.ftp.downloadTo(path.resolve(this.tempDir, fileName), '/cache/' + fileName),
      );

      const zip = new JSZip();

      await zip.loadAsync(await fsp.readFile(path.resolve(this.tempDir, fileName)));
      await job.updateZipFields(zip);

      return;
    } catch (error) {
      if (error instanceof FTPError && error.code === 550) {
        this.logger.error("This print doesn't seem to have a 3mf file");

        return;
      }

      this.logger.error('Failed to download file. Trying again in 5 seconds.', { error: error });
      await sleep(5000);

      return this.tryFetch3MF(job);
    }
  }

  private async awaitTask() {
    do {
      if (!this.taskRunning) {
        return;
      }

      await sleep(100);
      // eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
    } while (true);
  }

  private async runTask<T>(callback: () => Promise<T>) {
    await this.awaitTask();
    this.taskRunning = true;
    const response = await callback();

    this.taskRunning = false;

    return response;
  }
}
