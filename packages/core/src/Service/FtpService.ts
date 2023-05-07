import * as path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

import JSZip from 'jszip';
import type ftp from 'basic-ftp';
import { FTPError } from 'basic-ftp';
import { Mutex } from 'async-mutex';

import type { PrinterStatus } from '../util/PrinterStatus';
import type { BambuClient, BambuConfig } from '../BambuClient';
import type { Job } from '../Job/Job';
import type { Logger } from '../interfaces';
import { sleep } from '../util/sleep';
import { debounce } from '../util/debounce';

export class FtpService {
  private readonly tempDir: string;
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
    bambu.on('print:update', debounce(this.tryFetchLatestThumbnail.bind(this), 1000));
    bambu.on('print:finish', this.cleanUpTempDir.bind(this));

    setInterval(() => {
      if (this.ftp.closed) {
        this.connect();
      }
    }, 30 * 1000);
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
        })
        .catch((error) => {
          this.logger.error('Failed to connect to FTP server.');
          this.logger.error(error.message);
        }),
    );
  }

  private async cleanUpTempDir(job: Job) {
    const threemfFileName = job.status.subtaskName.replace(/\.3mf$/, '') + '.3mf';
    const latestThumbnailFilename = `latest-thumbnail-${job.id}.jpg`;

    await Promise.all([
      fsp.unlink(threemfFileName).catch(() => void 0),
      fsp.unlink(latestThumbnailFilename).catch(() => void 0),
    ]);
  }

  private async tryFetchLatestThumbnail(job: Job): Promise<void> {
    try {
      if (this.ftp.closed) {
        return;
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
      if (this.ftp.closed) {
        return;
      }

      this.logger.error('Failed to fetch last thumbnail', { error: (error as Error).message });
    }
  }

  private async tryFetch3MF(job: Job): Promise<void> {
    if (job.status.printType === 'local' || job.status.state === 'IDLE') {
      return;
    }

    try {
      await sleep(5 * 1000);

      if (this.ftp.closed) {
        await sleep(5000);
        await this.connect();

        return this.tryFetch3MF(job);
      }

      const fileName = job.status.subtaskName.replace(/\.3mf$/, '') + '.3mf';

      this.logger.debug(`Fetching ${fileName} from ftp`);
      await this.runTask(() => this.ftp.downloadTo(path.resolve(this.tempDir, fileName), '/cache/' + fileName));

      const zip = new JSZip();

      await zip.loadAsync(await fsp.readFile(path.resolve(this.tempDir, fileName)));
      await job.updateZipFields(zip);

      return;
    } catch (error) {
      if (error instanceof FTPError && error.code === 550) {
        this.logger.error("This print doesn't seem to have a 3mf file", { error: error.message });

        return;
      }

      this.logger.error('Failed to download file. Trying again in 5 seconds.', { error: (error as Error).message });

      return this.tryFetch3MF(job);
    }
  }

  private async runTask<T>(callback: () => Promise<T>) {
    return this.mutex.runExclusive(callback);
  }
}
