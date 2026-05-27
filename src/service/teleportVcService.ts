import {
  ActivityType,
  ChannelType,
  Client,
  GuildBasedChannel,
  GuildMember,
  OverwriteType,
  PermissionFlagsBits,
  VoiceChannel,
} from "discord.js";

import { DbService } from "./dbService";
import { VcPanelService } from "./vcPanelService";
import { getVcMembersCount } from "../util/vc";
import {
  addSecretPrefix,
  hasSecretPrefix,
  stripSecretPrefix,
} from "../util/secret";
import { TELEPORT_MESSAGE } from "../constant/message";

interface TrackedVcRow {
  channel_id: string;
  owner_display_name: string;
  has_been_occupied: number | boolean;
  auto_rename: number | boolean;
  is_active: number | boolean;
}

// チャンネル単位のリネームクールダウン（Discord のレート制限対策: 10分2回 → 5分間隔に絞る）
const RENAME_COOLDOWN_MS = 5 * 60 * 1000;
const lastRenamedAt = new Map<string, number>();

export class TeleportVcService {
  static async createTeleportVc(
    member: GuildMember,
    parentVc: VoiceChannel,
  ): Promise<void> {
    const guild = member.guild;
    if (!guild) throw new Error(TELEPORT_MESSAGE.NOT_SERVER_FOUND);

    const categoryId = parentVc.parentId;
    if (!categoryId) throw new Error(TELEPORT_MESSAGE.NOT_CATEGORY_FOUND);

    const permissionOverwrites = Array.from(
      parentVc.permissionOverwrites.cache.values(),
    ).map((o) => ({
      id: o.id,
      type: o.type,
      allow: o.allow,
      deny: o.deny,
    }));

    // Bot自身の権限を明示。親VCで@everyoneが制限されていてもBotが移動/送信できるよう保証する。
    const botId = guild.members.me?.id;
    if (botId) {
      permissionOverwrites.push({
        id: botId,
        type: OverwriteType.Member,
        allow:
          PermissionFlagsBits.ViewChannel |
          PermissionFlagsBits.Connect |
          PermissionFlagsBits.SendMessages |
          PermissionFlagsBits.ManageChannels |
          PermissionFlagsBits.MoveMembers,
        deny: 0n,
      } as any);
    }

    const defaultName = `${member.displayName}のVC`;

    const voiceChannel = await guild.channels.create({
      name: defaultName,
      type: ChannelType.GuildVoice,
      parent: categoryId,
      permissionOverwrites,
    });

    await this.insertTeleportVc({
      channelId: voiceChannel.id,
      ownerId: member.id,
      ownerDisplayName: member.displayName,
      guildId: guild.id,
      categoryId,
      parentVcId: parentVc.id,
    });

    // 先にユーザーを新VCへ移動（転送VCに置き去りにしない）
    try {
      await member.voice.setChannel(voiceChannel.id);
    } catch (e: any) {
      console.error(
        "VC移動エラー:",
        e?.message ?? e,
        `(channel=${voiceChannel.id}, member=${member.id})`,
      );
      try {
        await voiceChannel.delete();
      } catch {}
      await this.markInactive(voiceChannel.id);
      throw new Error(TELEPORT_MESSAGE.CREATE_FAILED);
    }

    // 続いて新VCのインチャ（ボイスチャンネル内テキストチャット）にパネル送信
    try {
      const panel = VcPanelService.createVcPanel();
      await voiceChannel.send(panel);
    } catch (e: any) {
      console.error(
        "パネル送信エラー:",
        e?.message ?? e,
        `(channel=${voiceChannel.id})`,
      );
    }
  }

  static async markOccupiedIfTracked(channel: VoiceChannel): Promise<void> {
    const row = await this.getTrackedVc(channel.id);
    if (!row || row.has_been_occupied) return;
    if (getVcMembersCount(channel) < 1) return;

    const connection = await DbService.getConnection();
    try {
      await connection.execute(
        `UPDATE teleport_vcs SET has_been_occupied = TRUE WHERE channel_id = ?`,
        [channel.id],
      );
    } finally {
      connection.release();
    }
  }

  static async deleteIfEmptyAfterOccupied(
    channel: GuildBasedChannel,
  ): Promise<void> {
    if (channel.type !== ChannelType.GuildVoice) return;
    const voiceChannel = channel as VoiceChannel;

    const row = await this.getTrackedVc(voiceChannel.id);
    if (!row) return;
    if (!row.has_been_occupied) return;
    if (getVcMembersCount(voiceChannel) !== 0) return;

    try {
      await voiceChannel.delete();
    } catch (e) {
      console.error("VC削除エラー:", e);
      throw new Error(TELEPORT_MESSAGE.DELETE_FAILED);
    }
    lastRenamedAt.delete(voiceChannel.id);
    await this.markInactive(voiceChannel.id);
  }

  /**
   * VC 内で最多のプレイ中ゲーム名にリネームする。
   * - auto_rename=FALSE の VC は対象外（手動で名前を変えた人の意図を尊重）
   * - 誰もゲームしていない場合はオーナー表示名ベースの既定名に戻す
   * - 5 分のクールダウンでレート制限回避
   */
  static async syncVcNameToTopGame(channel: VoiceChannel): Promise<void> {
    const row = await this.getTrackedVc(channel.id);
    if (!row) return;
    if (!row.auto_rename) return;

    let desiredName = pickDesiredName(channel, row.owner_display_name);
    // シークレット適用中（VC名に🔒が付いている）は🔒プレフィックスを維持する。
    if (hasSecretPrefix(channel.name)) {
      desiredName = addSecretPrefix(desiredName);
    }
    if (desiredName === channel.name) return;

    const now = Date.now();
    const last = lastRenamedAt.get(channel.id) ?? 0;
    if (now - last < RENAME_COOLDOWN_MS) return;

    try {
      await channel.setName(desiredName);
      lastRenamedAt.set(channel.id, now);
    } catch (e: any) {
      console.error("VCリネームエラー:", e?.message ?? e);
    }
  }

  /**
   * 手動でリネームされた VC は以降オート rename を停止する。
   */
  static async updateCategoryId(
    channelId: string,
    categoryId: string,
  ): Promise<void> {
    const connection = await DbService.getConnection();
    try {
      await connection.execute(
        `UPDATE teleport_vcs SET category_id = ? WHERE channel_id = ?`,
        [categoryId, channelId],
      );
    } finally {
      connection.release();
    }
  }

  static async disableAutoRename(channelId: string): Promise<void> {
    const connection = await DbService.getConnection();
    try {
      await connection.execute(
        `UPDATE teleport_vcs SET auto_rename = FALSE WHERE channel_id = ?`,
        [channelId],
      );
    } finally {
      connection.release();
    }
  }

  static async cleanupOnStartup(client: Client): Promise<void> {
    const connection = await DbService.getConnection();
    let rows: any[] = [];
    try {
      const [r] = await connection.execute<any[]>(
        `SELECT channel_id, guild_id FROM teleport_vcs WHERE is_active = TRUE`,
      );
      rows = r;
    } finally {
      connection.release();
    }

    for (const row of rows) {
      try {
        const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
        if (!guild) {
          await this.markInactive(row.channel_id);
          continue;
        }
        const ch = await guild.channels.fetch(row.channel_id).catch(() => null);
        if (!ch || ch.type !== ChannelType.GuildVoice) {
          await this.markInactive(row.channel_id);
          continue;
        }
        const voiceChannel = ch as VoiceChannel;
        if (getVcMembersCount(voiceChannel) === 0) {
          try {
            await voiceChannel.delete();
          } catch {}
          await this.markInactive(row.channel_id);
        }
      } catch (e) {
        console.error("cleanupOnStartupエラー:", e);
      }
    }
  }

  /**
   * シークレット権限を適用する。
   * @everyone の閲覧・接続を拒否し、現在VC内の非Botメンバー + 追加で指定された
   * ユーザーのみに閲覧・接続を許可する。Bot自身も管理のため明示的に許可する。
   */
  static async applySecretPermissions(
    voiceChannel: VoiceChannel,
    additionalUserIds: string[],
  ): Promise<void> {
    const guild = voiceChannel.guild;

    const allowedUserIds = new Set<string>();
    for (const member of voiceChannel.members.values()) {
      if (member.user.bot) continue;
      allowedUserIds.add(member.id);
    }
    for (const userId of additionalUserIds) {
      allowedUserIds.add(userId);
    }

    const botId = guild.members.me?.id;

    const overwrites: any[] = [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      ...Array.from(allowedUserIds).map((userId) => ({
        id: userId,
        type: OverwriteType.Member,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      })),
    ];

    if (botId && !allowedUserIds.has(botId)) {
      overwrites.push({
        id: botId,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageChannels,
        ],
      });
    }

    await voiceChannel.permissionOverwrites.set(overwrites);

    // VC名の先頭に🔒を付ける。
    const locked = addSecretPrefix(voiceChannel.name);
    if (locked !== voiceChannel.name) {
      try {
        await voiceChannel.setName(locked);
        lastRenamedAt.set(voiceChannel.id, Date.now());
      } catch (e: any) {
        console.error("シークレットVC名変更エラー:", e?.message ?? e);
      }
    }
  }

  /**
   * シークレット権限を解除する。
   * 由来の転送用VCの権限を復元（取得できなければ上書きを除去して既定に戻す）し、
   * VC名から🔒プレフィックスを取り除く。
   */
  static async releaseSecretPermissions(
    voiceChannel: VoiceChannel,
  ): Promise<void> {
    const guild = voiceChannel.guild;
    const parentVcId = await this.getParentVcId(voiceChannel.id);

    let overwrites: any[] = [];
    if (parentVcId) {
      const parent =
        guild.channels.cache.get(parentVcId) ??
        (await guild.channels.fetch(parentVcId).catch(() => null));
      if (parent && parent.type === ChannelType.GuildVoice) {
        overwrites = Array.from(
          (parent as VoiceChannel).permissionOverwrites.cache.values(),
        ).map((o) => ({
          id: o.id,
          type: o.type,
          allow: o.allow,
          deny: o.deny,
        }));
      }
    }

    // Bot自身の権限を明示（作成時と同様）。
    const botId = guild.members.me?.id;
    if (botId && !overwrites.some((o) => o.id === botId)) {
      overwrites.push({
        id: botId,
        type: OverwriteType.Member,
        allow:
          PermissionFlagsBits.ViewChannel |
          PermissionFlagsBits.Connect |
          PermissionFlagsBits.SendMessages |
          PermissionFlagsBits.ManageChannels |
          PermissionFlagsBits.MoveMembers,
        deny: 0n,
      });
    }

    await voiceChannel.permissionOverwrites.set(overwrites);

    // VC名から🔒を取り除く。
    const unlocked = stripSecretPrefix(voiceChannel.name);
    if (unlocked !== voiceChannel.name) {
      try {
        await voiceChannel.setName(unlocked);
        lastRenamedAt.set(voiceChannel.id, Date.now());
      } catch (e: any) {
        console.error("シークレット解除VC名変更エラー:", e?.message ?? e);
      }
    }
  }

  /**
   * 管理対象ボット（音楽/読み上げ等）の入退室に応じて人数制限を増減する。
   * - 対象が追跡中の個人VCでなければ何もしない
   * - 人数制限が「無制限(0)」のVCでは調整しない
   * - 1〜99の範囲に丸める
   */
  static async adjustUserLimitForBot(
    channel: VoiceChannel,
    delta: number,
  ): Promise<void> {
    const tracked = await this.isTrackedVc(channel.id);
    if (!tracked) return;

    const current = channel.userLimit; // 0 = 無制限
    if (current === 0) return;

    const next = Math.min(99, Math.max(1, current + delta));
    if (next === current) return;

    try {
      await channel.setUserLimit(next);
    } catch (e: any) {
      console.error("ボット用人数制限調整エラー:", e?.message ?? e);
    }
  }

  static async isTrackedVc(channelId: string): Promise<boolean> {
    const row = await this.getTrackedVc(channelId);
    return !!row;
  }

  private static async getTrackedVc(
    channelId: string,
  ): Promise<TrackedVcRow | null> {
    const connection = await DbService.getConnection();
    try {
      const [rows] = await connection.execute<any[]>(
        `SELECT channel_id, owner_display_name, has_been_occupied, auto_rename, is_active
         FROM teleport_vcs
         WHERE channel_id = ? AND is_active = TRUE`,
        [channelId],
      );
      if (!rows || rows.length === 0) return null;
      return rows[0] as TrackedVcRow;
    } finally {
      connection.release();
    }
  }

  private static async getParentVcId(
    channelId: string,
  ): Promise<string | null> {
    const connection = await DbService.getConnection();
    try {
      const [rows] = await connection.execute<any[]>(
        `SELECT parent_vc_id FROM teleport_vcs
         WHERE channel_id = ? AND is_active = TRUE`,
        [channelId],
      );
      if (!rows || rows.length === 0) return null;
      return rows[0].parent_vc_id as string;
    } finally {
      connection.release();
    }
  }

  private static async insertTeleportVc(args: {
    channelId: string;
    ownerId: string;
    ownerDisplayName: string;
    guildId: string;
    categoryId: string;
    parentVcId: string;
  }): Promise<void> {
    const connection = await DbService.getConnection();
    try {
      await connection.execute(
        `INSERT INTO teleport_vcs
          (channel_id, owner_id, owner_display_name, guild_id, category_id, parent_vc_id,
           has_been_occupied, auto_rename, is_active)
         VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE, TRUE)`,
        [
          args.channelId,
          args.ownerId,
          args.ownerDisplayName,
          args.guildId,
          args.categoryId,
          args.parentVcId,
        ],
      );
    } finally {
      connection.release();
    }
  }

  private static async markInactive(channelId: string): Promise<void> {
    const connection = await DbService.getConnection();
    try {
      await connection.execute(
        `UPDATE teleport_vcs SET is_active = FALSE WHERE channel_id = ?`,
        [channelId],
      );
    } finally {
      connection.release();
    }
  }
}

/**
 * VC内メンバーのプレイ中ゲームを集計して最多のゲーム名を返す。
 * 同点ならアルファベット順で先頭。誰もプレイしていなければ既定名。
 */
function pickDesiredName(
  channel: VoiceChannel,
  ownerDisplayName: string,
): string {
  const counts = new Map<string, number>();

  for (const member of channel.members.values()) {
    if (member.user.bot) continue;
    const activities = member.presence?.activities ?? [];
    const gameNames = new Set<string>();
    for (const activity of activities) {
      if (activity.type !== ActivityType.Playing) continue;
      if (!activity.name) continue;
      gameNames.add(activity.name.trim());
    }
    for (const name of gameNames) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return `${ownerDisplayName}のVC`;
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  // Discord のチャンネル名上限は 100 文字
  return sorted[0][0].slice(0, 100);
}
