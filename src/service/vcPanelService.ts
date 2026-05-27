import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { VC_PANEL_MESSAGES } from "../constant/panel";

export class VcPanelService {
  static createVcPanel() {
    const embed = new EmbedBuilder()
      .setTitle(VC_PANEL_MESSAGES.TITLE)
      .setDescription(VC_PANEL_MESSAGES.DESCRIPTION)
      .setColor(0xff66cc);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_NAME)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_VC_NAME)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_LIMIT)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_VC_LIMIT)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_STATUS)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_VC_STATUS)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_CATEGORY)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_CATEGORY)
        .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.SECRET)
        .setLabel(VC_PANEL_MESSAGES.SECRET)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.SECRET_RELEASE)
        .setLabel(VC_PANEL_MESSAGES.SECRET_RELEASE)
        .setStyle(ButtonStyle.Secondary),
    );

    return {
      embeds: [embed],
      components: [row, row2],
    };
  }
}
