import axios from 'axios';
import { load } from 'cheerio';

import type { HMS as RawHMS } from '../../interfaces/MQTTPacketResponse/print';
import type { HMS } from '../../interfaces/Status';
import { decimalToFixedSizeHexTwosComplement } from '../decimalToFixedSizeHexTwosComplement';

const cache: Record<string, string> = {};

const attempts: Record<string, number> = {};

const fallbacks: Record<string, string | undefined> = {
  '0300_0100_0003_0008':
    'The temperature of the heated bed exceeds the limit and automatically adjusts to the limit temperature.',
};

async function tryFetchDescription(url: string, code: string): Promise<string> {
  if (attempts[url] > 5 || fallbacks[code]) {
    return fallbacks[code] ?? code;
  }

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
    if (attempts[url]) {
      attempts[url]++;
    } else {
      attempts[url] = 1;
    }

    console.error('Error fetching URL:', (error as Error).message);

    return fallbacks[code] ?? code;
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

    result.push({
      code: `HMS_${fullCode}`,
      url: fallbacks[fullCode] ? undefined : url,
      description: tryFetchDescription(url, fullCode),
    });
  }

  return result;
}
