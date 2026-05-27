import {
  ActionRowBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from "discord.js";

import { MODAL_INPUT_IDS, PANEL_COMMAND_NAMES } from "../constant/command";
import { MODAL_LABELS, MODAL_TITLES, VC_PANEL_MESSAGES } from "../constant/panel";
import { TeleportVcService } from "../service/teleportVcService";
import { PANEL_MESSAGE } from "../constant/message";
import {
  buildSecretComponents,
  buildSecretEmbed,
  getCurrentVcMemberIds,
  parseSecretUserIds,
} from "../util/secret";

export async function handlePanelButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }

  const isTracked = await TeleportVcService.isTrackedVc(channel.id);
  if (!isTracked) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }

  // VCに参加しているメンバーのみ操作可能。
  if (!(channel as VoiceChannel).members.has(interaction.user.id)) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_VC_MEMBER,
      ephemeral: true,
    });
    return;
  }

  switch (interaction.customId) {
    case PANEL_COMMAND_NAMES.CHANGE_VC_NAME:
      await showNameModal(interaction);
      return;
    case PANEL_COMMAND_NAMES.CHANGE_VC_LIMIT:
      await showLimitModal(interaction);
      return;
    case PANEL_COMMAND_NAMES.CHANGE_VC_STATUS:
      await showStatusModal(interaction);
      return;
    case PANEL_COMMAND_NAMES.CHANGE_CATEGORY:
      await showCategorySelect(interaction);
      return;
    case PANEL_COMMAND_NAMES.SECRET:
      await showSecretUserSelect(interaction);
      return;
    case PANEL_COMMAND_NAMES.SECRET_CONFIRM:
      await applySecretFromPanel(interaction);
      return;
    case PANEL_COMMAND_NAMES.SECRET_CLEAR:
      await clearSecretSelection(interaction);
      return;
  }
}

async function clearSecretSelection(interaction: ButtonInteraction) {
  const voiceChannel = interaction.channel as VoiceChannel;
  // 追加分のみリセットし、現在VCにいるメンバーは表示として残す。
  const currentMemberIds = getCurrentVcMemberIds(voiceChannel);
  await interaction.update({
    embeds: [buildSecretEmbed(currentMemberIds)],
    components: buildSecretComponents(),
  });
}

async function showSecretUserSelect(interaction: ButtonInteraction) {
  const voiceChannel = interaction.channel as VoiceChannel;
  // 現在VCにいるメンバーは必ずアクセス権を得るため、最初から追加済みとして表示する。
  const currentMemberIds = getCurrentVcMemberIds(voiceChannel);
  await interaction.reply({
    embeds: [buildSecretEmbed(currentMemberIds)],
    components: buildSecretComponents(),
    ephemeral: true,
  });
}

async function applySecretFromPanel(interaction: ButtonInteraction) {
  const voiceChannel = interaction.channel as VoiceChannel;
  const userIds = parseSecretUserIds(interaction.message.embeds[0]?.description);

  try {
    await TeleportVcService.applySecretPermissions(voiceChannel, userIds);
  } catch (e: any) {
    console.error("シークレット適用エラー:", e?.message ?? e);
    await interaction.update({
      content: PANEL_MESSAGE.SECRET_FAILED,
      embeds: [],
      components: [],
    });
    return;
  }

  await interaction.update({
    content: PANEL_MESSAGE.SECRET_APPLIED,
    embeds: [],
    components: [],
  });
}

async function showCategorySelect(interaction: ButtonInteraction) {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.CATEGORY_SELECT)
    .setPlaceholder(VC_PANEL_MESSAGES.CATEGORY_SELECT_PLACEHOLDER)
    .setChannelTypes(ChannelType.GuildCategory)
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: VC_PANEL_MESSAGES.CATEGORY_SELECT_PLACEHOLDER,
    components: [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select),
    ],
    ephemeral: true,
  });
}

async function showNameModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_NAME)
    .setTitle(MODAL_TITLES.CHANGE_VC_NAME);
  const input = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_NAME)
    .setLabel(MODAL_LABELS.VC_NAME)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );
  await interaction.showModal(modal);
}

async function showLimitModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_LIMIT)
    .setTitle(MODAL_TITLES.CHANGE_VC_LIMIT);
  const input = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_LIMIT)
    .setLabel(MODAL_LABELS.VC_LIMIT)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );
  await interaction.showModal(modal);
}

async function showStatusModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId(PANEL_COMMAND_NAMES.CHANGE_VC_STATUS)
    .setTitle(MODAL_TITLES.CHANGE_VC_STATUS);
  const input = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_STATUS)
    .setLabel(MODAL_LABELS.VC_STATUS)
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );
  await interaction.showModal(modal);
}
