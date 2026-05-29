import { VoiceChannel } from "discord.js";

/**
 * Discord ボイスチャンネルの「ステータス」（VC上部に表示される一文）を取得する。
 * discord.js v14 では VoiceChannel に status プロパティが無いため REST GET で取りに行く。
 * 取得失敗時は空文字を返す。
 */
export async function getVoiceChannelStatus(
  channel: VoiceChannel,
): Promise<string> {
  try {
    // @ts-ignore — Routes に status が無いバージョンに対応するため文字列で組む
    const data = (await channel.client.rest.get(
      `/channels/${channel.id}`,
    )) as { status?: string | null };
    return data.status ?? "";
  } catch (e: any) {
    console.error("VCステータス取得エラー:", e?.message ?? e);
    return "";
  }
}

/**
 * Discord ボイスチャンネルの「ステータス」を設定する。
 * discord.js v14 では公式メソッドが未提供のため REST PUT で叩く。
 */
export async function setVoiceChannelStatus(
  channel: VoiceChannel,
  status: string,
): Promise<void> {
  // @ts-ignore — Routes に voiceChannelStatus が無いバージョンに対応するため文字列で組む
  await channel.client.rest.put(`/channels/${channel.id}/voice-status`, {
    body: { status },
  });
}
