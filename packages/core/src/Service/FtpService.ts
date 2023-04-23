import path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

import JSZip from 'JSZip';
import type ftp from 'basic-ftp';
import { FTPError } from 'basic-ftp';
import { Mutex } from 'async-mutex';

import type { PrinterStatus } from '../util/PrinterStatus';
import type { BambuClient, BambuConfig } from '../BambuClient';
import type { Job } from '../Job/Job';
import type { Logger } from '../interfaces';
import { sleep } from '../util/sleep';

export class FtpService {
  private tempDir: string;
  private connecting = false;
  private mutex = new Mutex();

  public constructor(
    private bambu: BambuClient,
    private ftp: ftp.Client,
    private printerStatus: PrinterStatus,
    private logger: Logger,
    private config: BambuConfig,
  ) {
    this.tempDir = path.resolve(process.cwd(), '.temp-ftp');

    if (fs.existsSync(this.tempDir)) {
      fs.readdir(this.tempDir, (error, files) => {
        if (error) {
          throw error;
        }

        for (const file of files) {
          fs.unlink(path.resolve(this.tempDir, file), (error2) => {
            if (error2) {
              throw error2;
            }
          });
        }
      });
    } else {
      fs.mkdirSync(this.tempDir);
    }

    bambu.on('print:start', this.tryFetch3MF.bind(this));
    bambu.on('print:update', this.tryFetchLatestThumbnail.bind(this));
    bambu.on('print:finish', this.cleanUpTempDir.bind(this));
  }

  public async connect() {
    if (this.connecting || !this.ftp.closed) {
      return;
    }

    this.connecting = true;

    return this.runTask(() =>
      this.ftp
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
          this.connecting = false;

          return x;
        }),
    );
  }

  private async cleanUpTempDir(job: Job) {
    const threemfFileName = job.status.subtaskName.replace(/\.3mf$/, '') + '.3mf';
    const latestThumbnailFilename = `latest-thumbnail-${job.id}.jpg`;

    await Promise.all([fsp.unlink(threemfFileName).catch(void 0), fsp.unlink(latestThumbnailFilename).catch(void 0)]);
  }

  private async tryFetchLatestThumbnail(job: Job): Promise<void> {
    try {
      if (this.ftp.closed) {
        await this.connect();

        return this.tryFetchLatestThumbnail(job);
      }

      const response = await this.runTask(() => this.ftp.list('/ipcam/thumbnail'));
      const files = response
        .map((x) => ({ file: x, modifiedAt: new Date(x.rawModifiedAt) }))
        .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));

      const fileName = `latest-thumbnail-${job.id}-${files[0].modifiedAt.getTime()}.jpg`;

      await this.runTask(() =>
        this.ftp.downloadTo(path.resolve(this.tempDir, fileName), '/ipcam/thumbnail/' + files[0].file.name),
      );

      job.updateThumbnail(path.resolve(this.tempDir, fileName));
    } catch (error) {
      this.logger.error('Failed to fetch last thumbnail', { error });
    }
  }

  private async tryFetch3MF(job: Job): Promise<void> {
    if (job.status.printType === 'local') {
      return;
    }

    try {
      if (this.ftp.closed) {
        await this.connect();

        return this.tryFetch3MF(job);
      }

      const fileName = job.status.subtaskName.replace(/\.3mf$/, '') + '.3mf';

      this.logger.info(`Fetching ${fileName} from ftp`);
      await this.runTask(() => this.ftp.downloadTo(path.resolve(this.tempDir, fileName), '/cache/' + fileName));

      const zip = new JSZip();

      await zip.loadAsync(await fsp.readFile(path.resolve(this.tempDir, fileName)));
      await job.updateZipFields(zip);

      return;
    } catch (error) {
      if (error instanceof FTPError && error.code === 550) {
        this.logger.error("This print doesn't seem to have a 3mf file");

        return;
      }

      this.logger.error('Failed to download file. Trying again in 5 seconds.', { error });
      await sleep(5000);

      return this.tryFetch3MF(job);
    }
  }

  private async runTask<T>(callback: () => Promise<T>) {
    return this.mutex.runExclusive(callback);
  }
}
