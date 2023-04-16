import {SlashCommand, SlashCommandOptions, SlashCreator} from "slash-create";
import {Client} from "discord.js";
import {BambuClient} from "@node-bambu/core";

export abstract class AbstractCommand extends SlashCommand<Client> {
  public constructor(creator: SlashCreator, protected bambu: BambuClient, opts: SlashCommandOptions) {
    super(creator, opts);
  }
}
