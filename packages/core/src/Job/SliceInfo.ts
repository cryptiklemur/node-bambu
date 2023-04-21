import * as util from 'node:util';

import * as xml2js from 'xml2js';

interface XmlMetadata {
  $: {
    key: string;
    value: string;
  };
}

interface XmlFilament {
  $: {
    color: string;
    id: string;
    type: string;
    used_g: string;
    used_m: string;
  };
}

interface XmlPlate {
  filament: XmlFilament[];
  metadata: XmlMetadata[];
}

interface XmlConfig {
  config: {
    plate: XmlPlate[];
  };
}

export class SliceInfo {
  public static async create(xml: Buffer): Promise<SliceInfo> {
    try {
      const parseString = util.promisify<xml2js.convertableToString, XmlConfig>(xml2js.parseString);
      const result = await parseString(xml);
      const plate = result.config.plate[0];
      const metadataMap: Record<string, string> = {};

      for (const meta of plate.metadata) {
        metadataMap[meta.$.key] = meta.$.value;
      }

      return new SliceInfo({
        index: Number.parseInt(metadataMap.index),
        prediction: Number.parseInt(metadataMap.prediction),
        weight: Number.parseFloat(metadataMap.weight),
        outside: metadataMap.outside === 'true',
        supportUsed: metadataMap.support_used === 'true',
        filaments: plate.filament.map(({ $: filament }) => ({
          id: Number.parseInt(filament.id),
          type: filament.type,
          color: filament.color,
          usedM: Number.parseFloat(filament.used_m),
          usedG: Number.parseFloat(filament.used_g),
        })),
      });
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw error;
    }
  }

  public readonly index: number;
  public readonly prediction: number;
  public readonly weight: number;
  public readonly outside: boolean;
  public readonly supportUsed: boolean;
  public readonly filaments: {
    color: string;
    id: number;
    type: string;
    usedG: number;
    usedM: number;
  }[];

  public constructor(init: SliceInfo) {
    this.index = init.index;
    this.prediction = init.prediction;
    this.weight = init.weight;
    this.outside = init.outside;
    this.supportUsed = init.supportUsed;
    this.filaments = init.filaments;
  }
}
