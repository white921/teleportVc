import {
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  VoiceChannel,
} from "discord.js";

import { hasSecretPrefix } from "./secret";
import { EXCLUDED_USER_IDS } from "../constant/id";

const NONE = "なし";

/**
 * VC の権限上書き状態を可視化する embed を生成する。
 * 公開モードでは「公開モード」とだけ表示する。
 * シークレット中は「誰が見えるか」を一覧表示する（Bot は除外）。
 */
export function buildPermissionSummaryEmbed(
  voiceChannel: VoiceChannel,
): EmbedBuilder {
  const secret = hasSecretPrefix(voiceChannel.name);
  const limitLine = `**人数制限**: ${
    voiceChannel.userLimit === 0 ? "無制限" : `${voiceChannel.userLimit}人`
  }`;

  if (!secret) {
    return new EmbedBuilder()
      .setTitle(`「${voiceChannel.name}」の権限`)
      .setDescription(`**公開モード**\n\n${limitLine}`)
      .setColor(0x66ccff);
  }

  const guild = voiceChannel.guild;
  const everyoneId = guild.roles.everyone.id;

  const memberAllow: string[] = [];
  const roleAllow: string[] = [];

  for (const overwrite of voiceChannel.permissionOverwrites.cache.values()) {
    if (overwrite.id === everyoneId) continue;
    if (!overwrite.allow.has(PermissionFlagsBits.ViewChannel)) continue;

    if (overwrite.type === OverwriteType.Member) {
      if (EXCLUDED_USER_IDS.includes(overwrite.id)) continue;
      const member = guild.members.cache.get(overwrite.id);
      if (member?.user.bot) continue;
      memberAllow.push(`<@${overwrite.id}>`);
    } else if (overwrite.type === OverwriteType.Role) {
      roleAllow.push(`<@&${overwrite.id}>`);
    }
  }

  const lines: string[] = [];
  lines.push("🔒 **シークレット適用中**");
  lines.push("");
  lines.push(
    `**閲覧・接続できるメンバー (個別許可)**\n${memberAllow.length === 0 ? NONE : memberAllow.join(" ")}`,
  );
  if (roleAllow.length > 0) {
    lines.push("");
    lines.push(`**閲覧許可ロール**\n${roleAllow.join(" ")}`);
  }
  lines.push("");
  lines.push(
    "※ シークレット中のため、上記の「閲覧・接続できるメンバー」に含まれない人は閲覧・接続ができません。",
  );
  lines.push("");
  lines.push(limitLine);

  return new EmbedBuilder()
    .setTitle(`「${voiceChannel.name}」の権限`)
    .setDescription(lines.join("\n"))
    .setColor(0xff5555);
}
