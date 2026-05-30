import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { TWO_SHOT_CATEGORY_ID, VC_PANEL_MESSAGES } from "../constant/panel";

export class VcPanelService {
  static createVcPanel(categoryId?: string | null) {
    const isTwoShot = categoryId === TWO_SHOT_CATEGORY_ID;

    const descriptionLines = [
      "このVCを操作できます。",
      "・VC設定を変更: VC名 / ステータス / 人数制限 をまとめて変更",
      "・権限を確認: 公開/シークレット状態と人数制限を表示",
      "・カテゴリを移動: 親カテゴリを変更",
    ];
    if (isTwoShot) {
      descriptionLines.push(
        "・シークレット: 指定メンバーだけが入れる非公開VCにする",
      );
    }
    descriptionLines.push(
      "・パネルを再配置: チャットで流れたパネルを最下部に出し直す",
    );

    const embed = new EmbedBuilder()
      .setTitle(VC_PANEL_MESSAGES.TITLE)
      .setDescription(descriptionLines.join("\n"))
      .setColor(0xff66cc);

    const buttons: ButtonBuilder[] = [
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_SETTINGS)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_VC_SETTINGS)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.VIEW_PERMISSIONS)
        .setLabel(VC_PANEL_MESSAGES.VIEW_PERMISSIONS)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.CHANGE_CATEGORY)
        .setLabel(VC_PANEL_MESSAGES.CHANGE_CATEGORY)
        .setStyle(ButtonStyle.Secondary),
    ];
    if (isTwoShot) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(PANEL_COMMAND_NAMES.SECRET)
          .setLabel(VC_PANEL_MESSAGES.SECRET)
          .setStyle(ButtonStyle.Danger),
      );
    }
    buttons.push(
      new ButtonBuilder()
        .setCustomId(PANEL_COMMAND_NAMES.RELOCATE_PANEL)
        .setLabel(VC_PANEL_MESSAGES.RELOCATE_PANEL)
        .setStyle(ButtonStyle.Secondary),
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);

    return {
      embeds: [embed],
      components: [row],
    };
  }
}
