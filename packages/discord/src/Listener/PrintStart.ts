import type { Client } from 'discord.js';
import { ActivityType } from 'discord.js';
import type { Job } from '@node-bambu/core';
import prettyMs from 'pretty-ms';

export function PrintStart(client: Client, streamUrl?: string) {
  return async function (job: Job) {
    await client.user?.setPresence({
      status: 'online',
      activities: [
        {
          name: `Starting Print (${prettyMs(job.status.remainingTime)} Remaining)`,
          type: streamUrl ? ActivityType.Streaming : ActivityType.Watching,
          url: streamUrl,
        },
      ],
    });
  };
}
