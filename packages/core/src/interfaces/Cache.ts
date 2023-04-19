export interface Cache {
  get<Value>(key: string): Promise<Value | undefined>;

  set<Value>(key: string, value: Value): Promise<void> | Promise<Value> | Promise<Cache>;
}
