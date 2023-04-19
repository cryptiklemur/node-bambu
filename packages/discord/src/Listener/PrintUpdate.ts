import type { ActivityOptions, Client } from 'discord.js';
import { ActivityType } from 'discord.js';
import type { Job } from '@node-bambu/core';
import prettyMs from 'pretty-ms';

export function PrintUpdate(client: Client, streamUrl?: string) {
  return async function (job: Job) {
    const activities: ActivityOptions[] = [
      {
        name: `${job.status.progressPercent}% (${prettyMs(job.status.remainingTime)} Remaining)`,
        type: streamUrl ? ActivityType.Streaming : ActivityType.Watching,
        url: streamUrl,
      },
    ];

    let changed = false;

    if (client.user?.presence.status !== 'online') {
      changed = true;
    }

    if (!areActivitiesEqual(client, activities)) {
      changed = true;
    }

    if (changed) {
      await client.user?.setPresence({
        status: 'online',
        activities,
      });
    }
  };
}

function areActivitiesEqual(client: Client, activities: ActivityOptions[]) {
  if (client.user?.presence.activities.length !== activities.length) {
    return false;
  }

  for (let i = 0; i < activities.length; i++) {
    const activity = client.user.presence.activities[0];

    if (activities[i].name !== activity.name) {
      return false;
    }

    if (activities[i].type !== activity.type) {
      return false;
    }
  }

  return true;
}
