import type { interfaces } from '@node-bambu/core';
import { EmbedBuilder } from 'discord.js';
import prettyMs from 'pretty-ms';
import dayjs from 'dayjs';

import { AbstractCommand } from './AbstractCommand';

export abstract class BaseStatusCommand extends AbstractCommand {
  protected buildEmbed(status: interfaces.Status) {
    return EmbedBuilder.from({
      title: status.taskName,
      description:
        this.getEmbedDescription(status) + '\n' + status.printStage.text,
      color: this.getColor(status),
      fields: [
        {
          name: 'Print Time',
          value: prettyMs(
            (status.finishTime ?? Date.now()) - status.startTime * 1000,
            {
              millisecondsDecimalDigits: 0,
              secondsDecimalDigits: 0,
              keepDecimalsOnWholeSeconds: false,
            }
          ),
          inline: true,
        },
        {
          name: 'ETA Print Time',
          value: `<t:${dayjs(Date.now() + status.remainingTime).unix()}:R>`,
          inline: true,
        },
        { name: 'Progress', value: status.progressPercent + '%', inline: true },
        {
          name: 'Layer',
          value: `${status.currentLayer}/${status.maxLayers}`,
          inline: true,
        },
        {
          name: 'Speed',
          value: `${status.speed.name} (${status.speed.percent}%)`,
          inline: true,
        },
        {
          name: 'Bed Temp',
          value: `Target: ${status.temperatures.bed.target}°C\nActual: ${status.temperatures.bed.actual}°C`,
          inline: true,
        },
        {
          name: 'Nozzle Temp',
          value: `Target: ${status.temperatures.extruder.target}°C\nActual: ${status.temperatures.extruder.actual}°C`,
          inline: true,
        },
        {
          name: 'Chamber Temp',
          value: `Target: ${status.temperatures.chamber.target}°C\nActual: ${status.temperatures.chamber.actual}°C`,
          inline: true,
        },
        {
          name: 'Main Fans',
          value: `1: ${status.fans.big_1}%\n2: ${status.fans.big_2}%`,
          inline: true,
        },
        { name: 'Cooling Fan', value: `${status.fans.cooling}%`, inline: true },
        {
          name: 'Heatbreak Fan',
          value: `${status.fans.heatbreak}%`,
          inline: true,
        },
      ],
    });
  }

  private getEmbedDescription(status: interfaces.Status) {
    const time = prettyMs(status.remainingTime);
    const elapsedTime = status.finishTime
      ? prettyMs(status.finishTime - status.startTime * 1000, {
          millisecondsDecimalDigits: 0,
          secondsDecimalDigits: 0,
          keepDecimalsOnWholeSeconds: false,
        })
      : '';

    console.log(status.finishTime, status.startTime);

    switch (status.state) {
      case 'PREPARE':
        return `Preparing to print. ${time} to print`;
      case 'RUNNING':
        return `Currently printing @ ${status.progressPercent}%. ${time} remaining`;
      case 'PAUSE':
        return `Currently paused @ ${status.progressPercent}%. ${time} remaining`;
      case 'FINISH':
        return `Finished printing. Print took ${elapsedTime}`;
      case 'IDLE':
        return '';
    }
  }

  private getColor(status: interfaces.Status) {
    switch (status.state) {
      case 'PREPARE':
        return 0x002aff;
      case 'RUNNING':
        return 0x22ff00;
      case 'PAUSE':
        return 0xffff00;
      case 'FINISH':
        return 0x00ffff;
      case 'IDLE':
        return 0xffff00;
    }
  }
}
