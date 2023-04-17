import type { CommandContext, SlashCreator } from 'slash-create';
import { ButtonStyle, ComponentType } from 'slash-create';
import { Commands } from '@node-bambu/core';
import type { BambuClient, types } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { StatusService } from '../Service/StatusService';

/**
 * @TODO
 * @TODO
 * @TODO
 * @TODO
 * @TODO
 * @TODO
 * @TODO
 *
 * This command should create a semi-permanent message that continues to update until the print is finished
 * it should be a persistent message through bot restarts
 *
 * There should also be a subscribe message. I need to better figure out the "start" event, and a way to track
 * when a print is started, and when a print is finished
 */
export class StatusCommand extends BaseStatusCommand {
  public constructor(creator: SlashCreator, bambu: BambuClient, status: StatusService) {
    super(creator, bambu, status, {
      name: 'status',
      description: 'Replies with the current status of the printer',
    });

    creator.registerGlobalComponent('toggle-lights', async (interaction) => {
      const lightMode = bambu.printerStatus.latestStatus?.lights.find((x) => x.name === 'chamber_light')?.mode;

      if (lightMode === undefined) {
        await interaction.sendFollowUp("Can't change lights right now.", {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_CHAMBER_LIGHT(lightMode === 'on' ? 'off' : 'on'));
    });
    creator.registerGlobalComponent('toggle-print-status', async (interaction) => {
      const state = bambu.printerStatus.currentJob?.getState();

      if (state === undefined) {
        await interaction.sendFollowUp("Can't change state right now.", {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_STATE(state === 'PAUSE' ? 'resume' : 'pause'));
    });
    creator.registerGlobalComponent('stop-print', async (interaction) => {
      if (!bambu.printerStatus.currentJob) {
        await interaction.sendFollowUp('Nothing to stop right now.', {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_STATE('stop'));
    });
    creator.registerGlobalComponent('speed-up', async (interaction) => {
      const currentSpeed = bambu.printerStatus.currentJob?.getSpeed();

      if (currentSpeed === undefined) {
        await interaction.sendFollowUp("Can't change speed right now.", {
          ephemeral: true,
        });

        return;
      }

      const newSpeed = (currentSpeed + 1) as types.IntRange<1, 5>;

      if (newSpeed > 4) {
        await interaction.sendFollowUp("Can't increase the speed anymore.", {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_SPEED(newSpeed));
    });
    creator.registerGlobalComponent('slow-down', async (interaction) => {
      const currentSpeed = bambu.printerStatus.currentJob?.getSpeed();

      if (currentSpeed === undefined) {
        await interaction.sendFollowUp("Can't change speed right now.", {
          ephemeral: true,
        });

        return;
      }

      const newSpeed = (currentSpeed - 1) as types.IntRange<1, 5>;

      if (newSpeed < 1) {
        await interaction.sendFollowUp("Can't decrease the speed anymore.", {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_SPEED(newSpeed));
    });
  }

  public override async run(ctx: CommandContext) {
    const job = this.bambu.printerStatus.currentJob;

    if (!job) {
      return ctx.send('Printer is currently idle');
    }

    const msg = await ctx.editOriginal({
      content: '',
      embeds: [await this.status.buildEmbed(job.status)],
      components: this.status.buildComponents(),
    });

    await this.status.addNewStatus(msg, 'semi-permanent');

    return msg;
  }
}
