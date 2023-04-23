import { inject, injectable } from 'inversify';
import type { Interaction, ButtonInteraction } from 'discord.js';
import { Client } from 'discord.js';
import type { types } from '@node-bambu/core';
import { Commands, interfaces } from '@node-bambu/core';

import type { BambuRepositoryItem } from '../Repository/BambuRepository';
import { BambuRepository } from '../Repository/BambuRepository';

@injectable()
export class InteractionHandler {
  public constructor(
    @inject('discord.client') private discord: Client,
    @inject('repository.bambu') private bambuRepository: BambuRepository,
    @inject('logger') private logger: interfaces.Logger,
  ) {
    discord.on('interactionCreate', this.onComponentInteraction.bind(this));
  }

  private async onComponentInteraction(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const [printerId, action] = interaction.customId.split(':');
    const printer = this.bambuRepository.findById(printerId);

    if (!printer) {
      this.logger.error('Failed to find a printer for this interaction', { interaction: interaction.customId });

      return;
    }

    if (!this.checkOwner(interaction, printer)) {
      await interaction.followUp({ content: "You don't have permission to do that", ephemeral: true });

      return;
    }

    switch (action) {
      case 'toggle-print-status': {
        return this.togglePrintStatus(interaction, printer);
      }
      case 'stop-print': {
        return this.stopPrint(interaction, printer);
      }
      case 'speed-up': {
        return this.changeSpeed(interaction, printer, true);
      }
      case 'slow-down': {
        return this.changeSpeed(interaction, printer, false);
      }
      case 'toggle-lights': {
        return this.toggleLights(interaction, printer);
      }
    }
  }

  private checkOwner(interaction: ButtonInteraction, { printer: { owners } }: BambuRepositoryItem) {
    return owners.map((x) => x.id).includes(interaction.user.id);
  }

  private async changeSpeed(interaction: ButtonInteraction, printer: BambuRepositoryItem, speedUp: boolean) {
    const currentSpeed = printer.client.printerStatus.currentJob?.getSpeed();

    if (currentSpeed === undefined) {
      await interaction.followUp({ content: "Can't change speed right now.", ephemeral: true });

      return;
    }

    const newSpeed = (currentSpeed + (speedUp ? 1 : -1)) as types.IntRange<1, 5>;

    if (newSpeed > 4) {
      await interaction.followUp({
        content: `Can't ${speedUp ? 'increase' : 'decrease'} the speed anymore.`,
        ephemeral: true,
      });

      return;
    }

    await printer.client.executeCommand(new Commands.UpdateSpeedCommand(newSpeed));
  }
  private async toggleLights(interaction: ButtonInteraction, printer: BambuRepositoryItem) {
    const lightMode = printer.client.printerStatus.latestStatus?.lights.find((x) => x.name === 'chamber_light')?.mode;

    if (lightMode === undefined) {
      await interaction.followUp({ content: "Can't change lights right now.", ephemeral: true });

      return;
    }

    await printer.client.executeCommand(new Commands.UpdateChamberLightCommand(lightMode === 'on' ? 'off' : 'on'));
  }
  private async togglePrintStatus(interaction: ButtonInteraction, printer: BambuRepositoryItem) {
    const state = printer.client.printerStatus.currentJob?.getState();

    if (state === undefined) {
      await interaction.followUp({ content: "Can't change state right now.", ephemeral: true });

      return;
    }

    await printer.client.executeCommand(new Commands.UpdateStateCommand(state === 'PAUSE' ? 'resume' : 'pause'));
  }
  private async stopPrint(interaction: ButtonInteraction, printer: BambuRepositoryItem) {
    if (!printer.client.printerStatus.currentJob) {
      await interaction.followUp({ content: 'Nothing to stop right now.', ephemeral: true });

      return;
    }

    await printer.client.executeCommand(new Commands.UpdateStateCommand('stop'));
  }
}
