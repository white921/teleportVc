import {
  ChannelType,
  ModalSubmitInteraction,
  VoiceChannel,
} from "discord.js";

import { MODAL_INPUT_IDS, PANEL_COMMAND_NAMES } from "../constant/command";
import { PANEL_MESSAGE } from "../constant/message";
import { TeleportVcService } from "../service/teleportVcService";
import {
  fetchVoiceChannelSnapshot,
  getVoiceChannelStatus,
  setVoiceChannelStatus,
} from "../service/voiceChannelStatus";
import {
  addSecretPrefix,
  hasSecretPrefix,
  stripSecretPrefix,
} from "../util/secret";

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_IN_VC_CHANNEL,
      ephemeral: true,
    });
    return;
  }
  const voiceChannel = channel as VoiceChannel;

  // VCに参加しているメンバーのみ操作可能。
  if (!voiceChannel.members.has(interaction.user.id)) {
    await interaction.reply({
      content: PANEL_MESSAGE.ONLY_VC_MEMBER,
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId !== PANEL_COMMAND_NAMES.CHANGE_VC_SETTINGS) return;

  const nameRaw = interaction.fields
    .getTextInputValue(MODAL_INPUT_IDS.VC_NAME)
    .trim();
  const statusRaw = interaction.fields
    .getTextInputValue(MODAL_INPUT_IDS.VC_STATUS)
    .trim();
  const limitRaw = interaction.fields
    .getTextInputValue(MODAL_INPUT_IDS.VC_LIMIT)
    .trim();

  // バリデーション（全項目チェックしてから一括適用。NGなら何も変更しない）
  if (nameRaw.length === 0 || nameRaw.length > 100) {
    await interaction.reply({
      content: PANEL_MESSAGE.NAME_TOO_LONG,
      ephemeral: true,
    });
    return;
  }
  if (statusRaw.length > 500) {
    await interaction.reply({
      content: PANEL_MESSAGE.STATUS_TOO_LONG,
      ephemeral: true,
    });
    return;
  }
  const limit = Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
    await interaction.reply({
      content: PANEL_MESSAGE.INVALID_LIMIT,
      ephemeral: true,
    });
    return;
  }

  // 現在値と比較し、変わったものだけ適用する。
  // name / userLimit は discord.js キャッシュが古い可能性があるため REST から取り直す。
  // status は REST では取れないので Gateway 由来のキャッシュを使う。
  const snapshot = await fetchVoiceChannelSnapshot(voiceChannel);
  const currentName = stripSecretPrefix(snapshot.name);
  const currentStatus = getVoiceChannelStatus(voiceChannel);
  const currentLimit = snapshot.userLimit;

  const changed: string[] = [];

  if (nameRaw !== currentName) {
    const finalName = hasSecretPrefix(voiceChannel.name)
      ? addSecretPrefix(nameRaw)
      : nameRaw;
    await voiceChannel.setName(finalName);
    // 手動リネームはユーザー意図優先 → 以降のゲーム名オート rename を停止
    await TeleportVcService.disableAutoRename(voiceChannel.id);
    changed.push(PANEL_MESSAGE.UPDATED_NAME);
  }

  if (statusRaw !== currentStatus) {
    await setVoiceChannelStatus(voiceChannel, statusRaw);
    changed.push(
      statusRaw.length === 0
        ? PANEL_MESSAGE.CLEARED_STATUS
        : PANEL_MESSAGE.UPDATED_STATUS,
    );
  }

  if (limit !== currentLimit) {
    await voiceChannel.setUserLimit(limit);
    changed.push(PANEL_MESSAGE.UPDATED_LIMIT);
  }

  await interaction.reply({
    content: changed.length === 0 ? PANEL_MESSAGE.NO_CHANGES : changed.join("\n"),
    ephemeral: true,
  });
}
