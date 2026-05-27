import {
  ChannelSelectMenuInteraction,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  UserSelectMenuInteraction,
  VoiceChannel,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { PANEL_MESSAGE } from "../constant/message";
import { TeleportVcService } from "../service/teleportVcService";

export async function handleChannelSelectMenu(
  interaction: ChannelSelectMenuInteraction,
): Promise<void> {
  if (interaction.customId !== PANEL_COMMAND_NAMES.CATEGORY_SELECT) return;

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }
  const voiceChannel = channel as VoiceChannel;

  const isTracked = await TeleportVcService.isTrackedVc(voiceChannel.id);
  if (!isTracked) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }

  const categoryId = interaction.values[0];
  const category = interaction.guild?.channels.cache.get(categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: PANEL_MESSAGE.INVALID_CATEGORY,
      ephemeral: true,
    });
    return;
  }

  try {
    await voiceChannel.setParent(categoryId, { lockPermissions: false });
    await TeleportVcService.updateCategoryId(voiceChannel.id, categoryId);
  } catch (e: any) {
    console.error("カテゴリ移動エラー:", e?.message ?? e);
    await interaction.reply({
      content: PANEL_MESSAGE.CATEGORY_MOVE_FAILED,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: PANEL_MESSAGE.UPDATED_CATEGORY,
    ephemeral: true,
  });
}

export async function handleUserSelectMenu(
  interaction: UserSelectMenuInteraction,
): Promise<void> {
  if (interaction.customId !== PANEL_COMMAND_NAMES.SECRET_USER_SELECT) return;

  const channel = interaction.channel;
  const guild = interaction.guild;
  if (!guild || !channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }
  const voiceChannel = channel as VoiceChannel;

  const isTracked = await TeleportVcService.isTrackedVc(voiceChannel.id);
  if (!isTracked) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }

  // 許可ユーザー = 現在VC内の非Botメンバー + セレクトメニュー選択ユーザー
  const allowedUserIds = new Set<string>();
  for (const member of voiceChannel.members.values()) {
    if (member.user.bot) continue;
    allowedUserIds.add(member.id);
  }
  for (const userId of interaction.values) {
    allowedUserIds.add(userId);
  }

  const botId = interaction.client.user?.id;

  const overwrites = [
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

  // Bot自身も管理のため許可（既にロールで権限を持っていても明示）
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

  try {
    await voiceChannel.permissionOverwrites.set(overwrites);
  } catch (e: any) {
    console.error("シークレット適用エラー:", e?.message ?? e);
    await interaction.reply({
      content: PANEL_MESSAGE.SECRET_FAILED,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: PANEL_MESSAGE.SECRET_APPLIED,
    ephemeral: true,
  });
}
