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
import { VcPanelService } from "../service/vcPanelService";
import {
  fetchVoiceChannelSnapshot,
  getVoiceChannelStatus,
} from "../service/voiceChannelStatus";
import { buildPermissionSummaryEmbed } from "../util/permissionSummary";
import { PANEL_MESSAGE } from "../constant/message";
import {
  buildSecretComponents,
  buildSecretEmbed,
  getInitialSecretMemberIds,
  parseSecretUserIds,
  stripSecretPrefix,
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
    case PANEL_COMMAND_NAMES.CHANGE_VC_SETTINGS:
      await showSettingsModal(interaction, channel as VoiceChannel);
      return;
    case PANEL_COMMAND_NAMES.VIEW_PERMISSIONS:
      await showPermissionSummary(interaction, channel as VoiceChannel);
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
    case PANEL_COMMAND_NAMES.RELOCATE_PANEL:
      await relocatePanel(interaction, channel as VoiceChannel);
      return;
  }
}

async function relocatePanel(
  interaction: ButtonInteraction,
  voiceChannel: VoiceChannel,
) {
  // 古いパネルを削除して新しいパネルを最下部に送り直す。
  await interaction.deferUpdate();
  try {
    await interaction.message.delete();
  } catch (e: any) {
    console.error("旧パネル削除エラー:", e?.message ?? e);
  }
  try {
    await voiceChannel.send(VcPanelService.createVcPanel());
  } catch (e: any) {
    console.error("パネル再送信エラー:", e?.message ?? e);
  }
}

async function clearSecretSelection(interaction: ButtonInteraction) {
  const voiceChannel = interaction.channel as VoiceChannel;
  // 手動追加分のみリセットし、初期状態（VC内メンバー＋既存の閲覧許可メンバー）に戻す。
  const initialMemberIds = getInitialSecretMemberIds(voiceChannel);
  await interaction.update({
    embeds: [buildSecretEmbed(initialMemberIds)],
    components: buildSecretComponents(),
  });
}

async function showSecretUserSelect(interaction: ButtonInteraction) {
  const voiceChannel = interaction.channel as VoiceChannel;
  // VC内メンバー＋既に閲覧権限を持つメンバーを最初から表示する。
  const initialMemberIds = getInitialSecretMemberIds(voiceChannel);
  await interaction.reply({
    embeds: [buildSecretEmbed(initialMemberIds)],
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

async function showPermissionSummary(
  interaction: ButtonInteraction,
  voiceChannel: VoiceChannel,
) {
  await interaction.reply({
    embeds: [buildPermissionSummaryEmbed(voiceChannel)],
    ephemeral: true,
  });
}

async function showSettingsModal(
  interaction: ButtonInteraction,
  voiceChannel: VoiceChannel,
) {
  // name / userLimit は discord.js キャッシュが古い可能性があるため REST から取り直す。
  // status は REST では取れないので Gateway 由来のキャッシュを使う。
  const snapshot = await fetchVoiceChannelSnapshot(voiceChannel);
  // シークレット中の🔒はモーダルからは隠す（送信時に状態に応じて付け直す）。
  const currentName = stripSecretPrefix(snapshot.name);
  const currentStatus = getVoiceChannelStatus(voiceChannel);
  const currentLimit = String(snapshot.userLimit);

  // Discord クライアントは customId 一致のモーダル入力値をキャッシュするため、
  // VC ごとに customId を分け、別 VC で開いたときに前回値が表示されないようにする。
  const modal = new ModalBuilder()
    .setCustomId(`${PANEL_COMMAND_NAMES.CHANGE_VC_SETTINGS}:${voiceChannel.id}`)
    .setTitle(MODAL_TITLES.CHANGE_VC_SETTINGS);

  const nameInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_NAME)
    .setLabel(MODAL_LABELS.VC_NAME)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100)
    .setValue(currentName);

  const statusInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_STATUS)
    .setLabel(MODAL_LABELS.VC_STATUS)
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500);
  if (currentStatus.length > 0) {
    statusInput.setValue(currentStatus);
  }

  const limitInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT_IDS.VC_LIMIT)
    .setLabel(MODAL_LABELS.VC_LIMIT)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2)
    .setValue(currentLimit);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput),
  );

  await interaction.showModal(modal);
}
