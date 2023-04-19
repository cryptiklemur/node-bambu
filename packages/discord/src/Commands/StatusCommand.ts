import type { CommandContext, SlashCreator, ComponentContext } from 'slash-create';
import { Commands } from '@node-bambu/core';
import type { BambuClient, types } from '@node-bambu/core';

import { BaseStatusCommand } from './BaseStatusCommand';
import type { StatusService } from '../Service/StatusService';
import type { BambuBotConfiguration } from '../BambuBot';

export class StatusCommand extends BaseStatusCommand {
  public constructor(creator: SlashCreator, bambu: BambuClient, status: StatusService, config: BambuBotConfiguration) {
    super(creator, bambu, status, config, {
      name: 'status',
      description: 'Replies with the current status of the printer',
    });

    creator.registerGlobalComponent('toggle-lights', async (interaction) => {
      if (!this.checkOwner(interaction)) {
        await interaction.sendFollowUp("You don't have permission to do that.", { ephemeral: true });

        return;
      }

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
      if (!this.checkOwner(interaction)) {
        await interaction.sendFollowUp("You don't have permission to do that.", { ephemeral: true });

        return;
      }

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
      if (!this.checkOwner(interaction)) {
        await interaction.sendFollowUp("You don't have permission to do that.", { ephemeral: true });

        return;
      }

      if (!bambu.printerStatus.currentJob) {
        await interaction.sendFollowUp('Nothing to stop right now.', {
          ephemeral: true,
        });

        return;
      }

      await bambu.publish(Commands.UPDATE_STATE('stop'));
    });
    creator.registerGlobalComponent('speed-up', async (interaction) => {
      if (!this.checkOwner(interaction)) {
        await interaction.sendFollowUp("You don't have permission to do that.", { ephemeral: true });

        return;
      }

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
      if (!this.checkOwner(interaction)) {
        await interaction.sendFollowUp("You don't have permission to do that.", { ephemeral: true });

        return;
      }

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

  public override async run(context: CommandContext) {
    return this.status.sendStatusMessage('semi-permanent', context);
  }

  private checkOwner(interaction: ComponentContext) {
    if (!this.config.discord.ownerIds) {
      return true;
    }

    if (this.config.discord.ownerIds.includes(interaction.user.id)) {
      return true;
    }

    return false;
  }
}
