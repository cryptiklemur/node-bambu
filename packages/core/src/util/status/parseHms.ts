import axios from 'axios';
import { load } from 'cheerio';

import type { HMS as RawHMS } from '../../interfaces/MQTTPacketResponse/print';
import type { HMS } from '../../interfaces/Status';
import { decimalToFixedSizeHexTwosComplement } from '../decimalToFixedSizeHexTwosComplement';

const cache: Record<string, string> = {};

async function tryFetchDescription(url: string): Promise<string> {
  if (cache[url]) {
    return cache[url];
  }

  try {
    const response = await axios.get(url);
    const $ = load(response.data);
    const targetElement = $('#what-it-is');
    const followingElement = targetElement.next('p');
    const html = followingElement.html();

    if (html) {
      cache[url] = html;

      return cache[url];
    }

    return '';
  } catch (error) {
    console.error('Error fetching URL:', (error as Error).message);

    return '';
  }
}

export function parseHms(hms?: RawHMS[]): HMS[] {
  if (!hms) {
    return [];
  }

  const result: HMS[] = [];

  for (const hmsCode of hms) {
    const attribute = decimalToFixedSizeHexTwosComplement(hmsCode.attr);
    const code = decimalToFixedSizeHexTwosComplement(hmsCode.code);
    let fullCode = (attribute + code).replace(/(.{4})/g, '$1_');

    fullCode = fullCode.slice(0, Math.max(0, fullCode.length - 1));
    const url = 'https://wiki.bambulab.com/en/x1/troubleshooting/hmscode/' + fullCode;

    result.push({ code: `HMS_${fullCode}`, url: url, description: tryFetchDescription(url) });
  }

  return result;
}
