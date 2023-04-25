import { inject, injectable } from 'inversify';
import type { ComponentActionRow, MessageFile } from 'slash-create';
import { CommandContext } from 'slash-create';
import type { MessageCreateOptions, TextChannel, Message, APIEmbed } from 'discord.js';
import { Client } from 'discord.js';

@injectable()
export class MessageSenderService {
  public constructor(@inject('discord.client') private discord: Client) {}

  public async sendMessage(
    contextOrChannel: CommandContext | TextChannel,
    content: MessageCreateOptions,
  ): Promise<Message<true>> {
    try {
      if (contextOrChannel instanceof CommandContext) {
        const message = await contextOrChannel.sendFollowUp({
          content: content.content,
          embeds: content.embeds as APIEmbed[],
          components: content.components as unknown as ComponentActionRow[],
          file: content.files as unknown as MessageFile[],
        });

        return this.discord.channels
          .fetch(message.channelID)
          .then((x) => (x as TextChannel).messages.fetch(message.id));
      }

      return contextOrChannel.send(content);
    } catch (error) {
      console.error(error);

      throw error;
    }
  }
}
