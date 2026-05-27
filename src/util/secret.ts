import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
  VoiceChannel,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { VC_PANEL_MESSAGES } from "../constant/panel";

// シークレット適用中のVC名に付けるプレフィックス。
export const SECRET_NAME_PREFIX = "🔒";

/**
 * 現在VC内にいる非BotメンバーのID一覧を返す。
 */
export function getCurrentVcMemberIds(voiceChannel: VoiceChannel): string[] {
  return voiceChannel.members
    .filter((m) => !m.user.bot)
    .map((m) => m.id);
}

/**
 * 「権限ページに名前が載っている」＝メンバー単位の権限上書きで
 * 閲覧(ViewChannel)が明示的に許可されているメンバーのID一覧を返す。
 * ロールや管理者権限による閲覧は対象外（メンバー上書きのみ）。Bot自身は除外。
 */
export function getExplicitViewMemberIds(voiceChannel: VoiceChannel): string[] {
  const botId = voiceChannel.client.user?.id;
  const ids: string[] = [];
  for (const overwrite of voiceChannel.permissionOverwrites.cache.values()) {
    if (overwrite.type !== OverwriteType.Member) continue;
    if (overwrite.id === botId) continue;
    if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
      ids.push(overwrite.id);
    }
  }
  return ids;
}

/**
 * シークレットパネルを開いた直後に「権限を付与するメンバー」として
 * 表示する初期メンバー（VC内メンバー + 明示的に閲覧権限を持つメンバー）を返す。
 */
export function getInitialSecretMemberIds(voiceChannel: VoiceChannel): string[] {
  return Array.from(
    new Set([
      ...getCurrentVcMemberIds(voiceChannel),
      ...getExplicitViewMemberIds(voiceChannel),
    ]),
  );
}

/**
 * VC名の先頭に🔒プレフィックスが付いていれば、シークレット適用中とみなす。
 * （権限の継承で誤判定しないよう、状態の真実はVC名のプレフィックスとする）
 */
export function hasSecretPrefix(name: string): boolean {
  return name.startsWith(SECRET_NAME_PREFIX);
}

/**
 * VC名の先頭から🔒プレフィックスを取り除く。
 */
export function stripSecretPrefix(name: string): string {
  if (name.startsWith(SECRET_NAME_PREFIX)) {
    return name.slice(SECRET_NAME_PREFIX.length).trimStart();
  }
  return name;
}

/**
 * VC名の先頭に🔒プレフィックスを付ける（重複は付けない・100文字に丸める）。
 */
export function addSecretPrefix(name: string): string {
  const base = stripSecretPrefix(name);
  return `${SECRET_NAME_PREFIX} ${base}`.slice(0, 100);
}

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
 * select の customId には毎回ユニークな nonce を付与する。
 * これにより update 時に Discord クライアントが「別コンポーネント」として
 * 再描画し、前回の選択状態が残らない（中身が空になる）。
 */
export function buildSecretComponents(): [
  ActionRowBuilder<UserSelectMenuBuilder>,
  ActionRowBuilder<ButtonBuilder>,
] {
  const nonce = Date.now().toString(36);
  const select = new UserSelectMenuBuilder()
    .setCustomId(`${PANEL_COMMAND_NAMES.SECRET_USER_SELECT}:${nonce}`)
    .setPlaceholder(VC_PANEL_MESSAGES.SECRET_USER_SELECT_PLACEHOLDER)
    .setMinValues(1)
    .setMaxValues(1);

  const clear = new ButtonBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.SECRET_CLEAR)
    .setLabel(VC_PANEL_MESSAGES.SECRET_CLEAR)
    .setStyle(ButtonStyle.Secondary);

  const confirm = new ButtonBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.SECRET_CONFIRM)
    .setLabel(VC_PANEL_MESSAGES.SECRET_CONFIRM)
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select),
    new ActionRowBuilder<ButtonBuilder>().addComponents(clear, confirm),
  ];
}
