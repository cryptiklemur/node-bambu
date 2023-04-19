import type { Client } from 'discord.js';
import { ActivityType } from 'discord.js';

import { sleep } from '../Util/sleep';

export function PrintFinished(client: Client, streamUrl?: string) {
  return async function () {
    await client.user?.setPresence({
      status: 'online',
      activities: [
        {
          name: `Finished Printing`,
          type: streamUrl ? ActivityType.Streaming : ActivityType.Watching,
          url: streamUrl,
        },
      ],
    });

    await sleep(30_000);
    await client.user?.setPresence({
      status: 'idle',
      activities: [
        {
          name: `Waiting to Print`,
          type: streamUrl ? ActivityType.Streaming : ActivityType.Watching,
          url: streamUrl,
        },
      ],
    });
  };
}
