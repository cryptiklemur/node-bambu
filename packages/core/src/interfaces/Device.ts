export interface Module {
  hardwareVersion?: string;
  name: string;
  serialNumber: string;
  softwareVersion?: string;
}

export interface Device {
  modules: Module[];
}
