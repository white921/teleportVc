import {
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
  VoiceChannel,
} from "discord.js";

import { hasSecretPrefix } from "./secret";

const NONE = "なし";

/**
 * VC の権限上書き状態を可視化する embed を生成する。
 * シークレット VC では「誰が見えるか」を素早く把握するために使う。
 * （個別拒否は当 Bot の操作では発生しないため表示しない）
 */
export function buildPermissionSummaryEmbed(
  voiceChannel: VoiceChannel,
): EmbedBuilder {
  const guild = voiceChannel.guild;
  const botId = voiceChannel.client.user?.id;
  const secret = hasSecretPrefix(voiceChannel.name);

  const everyoneId = guild.roles.everyone.id;
  const everyoneOverwrite =
    voiceChannel.permissionOverwrites.cache.get(everyoneId);
  const everyoneState = describeEveryoneViewState(everyoneOverwrite);

  const memberAllow: string[] = [];
  const roleAllow: string[] = [];

  for (const overwrite of voiceChannel.permissionOverwrites.cache.values()) {
    if (overwrite.id === everyoneId) continue;
    if (!overwrite.allow.has(PermissionFlagsBits.ViewChannel)) continue;

    if (overwrite.type === OverwriteType.Member) {
      if (overwrite.id === botId) continue;
      memberAllow.push(`<@${overwrite.id}>`);
    } else if (overwrite.type === OverwriteType.Role) {
      roleAllow.push(`<@&${overwrite.id}>`);
    }
  }

  const lines: string[] = [];
  lines.push(secret ? "🔒 **シークレット適用中**" : "**公開モード**");
  lines.push("");
  lines.push(`**@everyone**: ${everyoneState}`);
  lines.push("");
  lines.push(
    `**閲覧・接続できるメンバー (個別許可)**\n${joinOrNone(memberAllow)}`,
  );
  if (roleAllow.length > 0) {
    lines.push("");
    lines.push(`**閲覧許可ロール**\n${roleAllow.join(" ")}`);
  }
  lines.push("");
  lines.push(
    secret
      ? "※ シークレット中のため、上記の「閲覧・接続できるメンバー」と許可ロールに含まれない人は閲覧できません。"
      : "※ 公開モードでは、`@everyone` の既定権限に従って閲覧可能です。",
  );

  return new EmbedBuilder()
    .setTitle(`「${voiceChannel.name}」の権限`)
    .setDescription(lines.join("\n"))
    .setColor(secret ? 0xff5555 : 0x66ccff);
}

function describeEveryoneViewState(
  overwrite:
    | { allow: { has: (flag: bigint) => boolean }; deny: { has: (flag: bigint) => boolean } }
    | undefined,
): string {
  if (!overwrite) return "既定（サーバ設定に従う）";
  if (overwrite.deny.has(PermissionFlagsBits.ViewChannel)) return "拒否（閲覧不可）";
  if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) return "許可（閲覧可能）";
  return "既定（サーバ設定に従う）";
}

function joinOrNone(items: string[]): string {
  return items.length === 0 ? NONE : items.join(" ");
}
