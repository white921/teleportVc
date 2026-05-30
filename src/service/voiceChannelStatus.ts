import { VoiceChannel } from "discord.js";

// Discord API は GET /channels/{id} で voice channel status を返さない。
// 唯一の取得経路は Gateway の VOICE_CHANNEL_STATUS_UPDATE イベントなので、
// 受信した値をプロセス内にキャッシュして参照する。
const statusCache = new Map<string, string>();

/**
 * Gateway から受信した voice channel status をキャッシュに記録する。
 * index.ts の raw イベントから呼ばれる。
 */
export function recordVoiceChannelStatus(
  channelId: string,
  status: string | null | undefined,
): void {
  statusCache.set(channelId, status ?? "");
}

/**
 * Discord ボイスチャンネルの「ステータス」（VC上部に表示される一文）を取得する。
 * Bot 起動後に VOICE_CHANNEL_STATUS_UPDATE を受け取っていないチャンネルについては
 * 値が分からないので空文字を返す。
 */
export function getVoiceChannelStatus(channel: VoiceChannel): string {
  return statusCache.get(channel.id) ?? "";
}

/**
 * Discord ボイスチャンネルの「ステータス」を設定する。
 * discord.js v14 では公式メソッドが未提供のため REST PUT で叩く。
 * 設定成功時は自前のキャッシュも更新する（Gateway イベントが届く前でも整合性を保つため）。
 */
export async function setVoiceChannelStatus(
  channel: VoiceChannel,
  status: string,
): Promise<void> {
  // @ts-ignore — Routes に voiceChannelStatus が無いバージョンに対応するため文字列で組む
  await channel.client.rest.put(`/channels/${channel.id}/voice-status`, {
    body: { status },
  });
  statusCache.set(channel.id, status);
}
