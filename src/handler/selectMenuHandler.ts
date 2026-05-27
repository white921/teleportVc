import {
  ChannelSelectMenuInteraction,
  ChannelType,
  UserSelectMenuInteraction,
  VoiceChannel,
} from "discord.js";

import { PANEL_COMMAND_NAMES } from "../constant/command";
import { PANEL_MESSAGE } from "../constant/message";
import { TeleportVcService } from "../service/teleportVcService";
import { buildSecretComponents, buildSecretEmbed, parseSecretUserIds } from "../util/secret";

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
  if (!interaction.customId.startsWith(PANEL_COMMAND_NAMES.SECRET_USER_SELECT))
    return;

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

  // 既存の追加済みメンバー（embedのメンションから読み戻す）に今回の選択を加える。
  const existing = parseSecretUserIds(interaction.message.embeds[0]?.description);
  const userIds = new Set<string>(existing);
  for (const userId of interaction.values) {
    userIds.add(userId);
  }

  await interaction.update({
    embeds: [buildSecretEmbed(Array.from(userIds))],
    components: buildSecretComponents(),
  });
}
