import type { Cache } from '../interfaces';

export class MemoryCache implements Cache {
  private store: Record<string, unknown> = {};

  public get<Value>(key: string): Promise<Value | undefined> {
    return Promise.resolve(this.store[key] as Value);
  }

  public set<Value>(key: string, value: Value): Promise<void> | Promise<Value> | Promise<Cache> {
    return Promise.resolve((this.store[key] = value));
  }
}
