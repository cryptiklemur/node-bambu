import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as nodePath from 'node:path';
import * as fsp from 'node:fs/promises';

import type { interfaces } from '@node-bambu/core';

export class FileCache implements interfaces.Cache {
  constructor(private path: string = process.cwd() + '/cache') {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  }

  public async get<Value>(key: string): Promise<Value | undefined> {
    try {
      const file = await fsp.readFile(this.getFilePathByKey(key));

      return JSON.parse(file.toString('utf8'));
    } catch (err) {
      //file does not exist lets return a cache miss
      if ((err as { code: string }).code === 'ENOENT') {
        return undefined;
      } else {
        throw err;
      }
    }

    return Promise.resolve(undefined);
  }

  public async set<Value>(key: string, value: Value): Promise<void> {
    return fsp.writeFile(this.getFilePathByKey(key), JSON.stringify(value), {
      encoding: 'utf8',
    });
  }

  private getFilePathByKey(key: string) {
    const hash = crypto
      .createHash('md5')
      .update(key + '')
      .digest('hex');

    return nodePath.join(this.path, 'filecache-' + hash);
  }
}
