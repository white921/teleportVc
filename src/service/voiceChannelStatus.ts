import { VoiceChannel } from "discord.js";

export interface VoiceChannelSnapshot {
  name: string;
  userLimit: number;
  status: string;
}

/**
 * VC の現在値（name / user_limit / status）を REST から1リクエストで取得する。
 * キャッシュではなく Discord 側の真値を返すので、設定モーダルの初期値や差分比較に使う。
 * 取得失敗時はキャッシュ値にフォールバックし、status のみ空文字とする。
 */
export async function fetchVoiceChannelSnapshot(
  channel: VoiceChannel,
): Promise<VoiceChannelSnapshot> {
  try {
    const data = (await channel.client.rest.get(
      `/channels/${channel.id}`,
    )) as { name?: string; user_limit?: number; status?: string | null };
    return {
      name: data.name ?? channel.name,
      userLimit: data.user_limit ?? channel.userLimit,
      status: data.status ?? "",
    };
  } catch (e: any) {
    console.error("VCスナップショット取得エラー:", e?.message ?? e);
    return {
      name: channel.name,
      userLimit: channel.userLimit,
      status: "",
    };
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
