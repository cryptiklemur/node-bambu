import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import * as fsp from 'node:fs/promises';

import type { Cache } from '../Interfaces/Cache';

export class FileCache implements Cache {
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
  }

  public async set<Value>(key: string, value: Value): Promise<void> {
    return fsp.writeFile(this.getFilePathByKey(key), JSON.stringify(value), {
      encoding: 'utf8',
    });
  }

  private getFilePathByKey(key: string) {
    return nodePath.join(this.path, 'filecache-' + key);
  }
}
