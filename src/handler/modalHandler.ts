import {
  ChannelType,
  ModalSubmitInteraction,
  VoiceChannel,
} from "discord.js";

import { MODAL_INPUT_IDS, PANEL_COMMAND_NAMES } from "../constant/command";
import { PANEL_MESSAGE } from "../constant/message";
import { TeleportVcService } from "../service/teleportVcService";
import {
  addSecretPrefix,
  isSecretChannel,
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

  switch (interaction.customId) {
    case PANEL_COMMAND_NAMES.CHANGE_VC_NAME: {
      const name = interaction.fields
        .getTextInputValue(MODAL_INPUT_IDS.VC_NAME)
        .trim();
      if (name.length === 0 || name.length > 100) {
        await interaction.reply({
          content: PANEL_MESSAGE.NAME_TOO_LONG,
          ephemeral: true,
        });
        return;
      }
      // シークレット適用中は🔒プレフィックスを維持する（入力に含まれていても重複させない）。
      const finalName = isSecretChannel(voiceChannel)
        ? addSecretPrefix(name)
        : stripSecretPrefix(name);
      await voiceChannel.setName(finalName);
      // 手動リネームはユーザー意図優先 → 以降のゲーム名オート rename を停止
      await TeleportVcService.disableAutoRename(voiceChannel.id);
      await interaction.reply({
        content: PANEL_MESSAGE.UPDATED_NAME,
        ephemeral: true,
      });
      return;
    }

    case PANEL_COMMAND_NAMES.CHANGE_VC_LIMIT: {
      const raw = interaction.fields
        .getTextInputValue(MODAL_INPUT_IDS.VC_LIMIT)
        .trim();
      const limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
        await interaction.reply({
          content: PANEL_MESSAGE.INVALID_LIMIT,
          ephemeral: true,
        });
        return;
      }
      await voiceChannel.setUserLimit(limit);
      await interaction.reply({
        content: PANEL_MESSAGE.UPDATED_LIMIT,
        ephemeral: true,
      });
      return;
    }

    case PANEL_COMMAND_NAMES.CHANGE_VC_STATUS: {
      const status = interaction.fields
        .getTextInputValue(MODAL_INPUT_IDS.VC_STATUS)
        .trim();
      if (status.length > 500) {
        await interaction.reply({
          content: PANEL_MESSAGE.STATUS_TOO_LONG,
          ephemeral: true,
        });
        return;
      }
      await setVoiceChannelStatus(voiceChannel, status);
      await interaction.reply({
        content:
          status.length === 0
            ? PANEL_MESSAGE.CLEARED_STATUS
            : PANEL_MESSAGE.UPDATED_STATUS,
        ephemeral: true,
      });
      return;
    }
  }
}

// discord.js v14 では公式メソッドが未提供のことがあるので REST 経由で叩く。
async function setVoiceChannelStatus(
  channel: VoiceChannel,
  status: string,
): Promise<void> {
  // @ts-ignore — Routes に voiceChannelStatus が無いバージョンに対応するため文字列で組む
  await channel.client.rest.put(`/channels/${channel.id}/voice-status`, {
    body: { status },
  });
}
