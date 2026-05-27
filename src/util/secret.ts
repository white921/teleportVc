import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { VC_PANEL_MESSAGES } from "../constant/panel";

/**
 * 追加済みメンバーのメンションを表示するembedを生成する。
 * 累積した選択メンバーはこのembedのdescriptionにメンションとして保持し、
 * 次のインタラクションで parseSecretUserIds により読み戻す（ステートレス）。
 */
export function buildSecretEmbed(userIds: string[]): EmbedBuilder {
  const mentions =
    userIds.length === 0
      ? VC_PANEL_MESSAGES.SECRET_SELECTED_NONE
      : userIds.map((id) => `<@${id}>`).join(" ");

  return new EmbedBuilder()
    .setTitle(VC_PANEL_MESSAGES.SECRET_EMBED_TITLE)
    .setDescription(
      `${VC_PANEL_MESSAGES.SECRET_EMBED_DESC}\n\n` +
        `**${VC_PANEL_MESSAGES.SECRET_SELECTED_LABEL}**\n${mentions}`,
    );
}

/**
 * embedのdescriptionからメンション形式のユーザーIDを抽出する。
 */
export function parseSecretUserIds(description: string | null | undefined): string[] {
  if (!description) return [];
  const ids: string[] = [];
  const re = /<@!?(\d+)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/**
 * 1人ずつ選択するユーザーセレクトと確定ボタンの行を生成する。
 */
export function buildSecretComponents(): [
  ActionRowBuilder<UserSelectMenuBuilder>,
  ActionRowBuilder<ButtonBuilder>,
] {
  const select = new UserSelectMenuBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.SECRET_USER_SELECT)
    .setPlaceholder(VC_PANEL_MESSAGES.SECRET_USER_SELECT_PLACEHOLDER)
    .setMinValues(1)
    .setMaxValues(1);

  const confirm = new ButtonBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.SECRET_CONFIRM)
    .setLabel(VC_PANEL_MESSAGES.SECRET_CONFIRM)
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select),
    new ActionRowBuilder<ButtonBuilder>().addComponents(confirm),
  ];
}
