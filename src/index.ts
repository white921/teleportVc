import {
  Client,
  GatewayIntentBits,
  ChannelType,
  Presence,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import dotenv from "dotenv";

import { TELEPORT_VC_IDS } from "./constant/id";
import { DbService } from "./service/dbService";
import { TeleportVcService } from "./service/teleportVcService";
import { handlePanelButton } from "./handler/panelButtonHandler";
import { handleModalSubmit } from "./handler/modalHandler";
import {
  handleChannelSelectMenu,
  handleUserSelectMenu,
} from "./handler/selectMenuHandler";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  try {
    await DbService.migrate();
  } catch (e) {
    console.error("DBマイグレーションエラー:", e);
  }
  try {
    await TeleportVcService.cleanupOnStartup(client);
  } catch (e) {
    console.error("起動時クリーンアップエラー:", e);
  }
});

client.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    try {
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      if (oldChannel?.id === newChannel?.id) return;
      if (newState.member?.user.bot || oldState.member?.user.bot) return;

      if (
        newChannel &&
        newChannel.type === ChannelType.GuildVoice &&
        TELEPORT_VC_IDS.includes(newChannel.id) &&
        newState.member
      ) {
        await TeleportVcService.createTeleportVc(
          newState.member,
          newChannel as VoiceChannel,
        );
        return;
      }

      if (newChannel && newChannel.type === ChannelType.GuildVoice) {
        const vc = newChannel as VoiceChannel;
        await TeleportVcService.markOccupiedIfTracked(vc);
        await TeleportVcService.syncVcNameToTopGame(vc);
      }

      if (oldChannel && oldChannel.type === ChannelType.GuildVoice) {
        await TeleportVcService.deleteIfEmptyAfterOccupied(oldChannel);
        if (oldChannel.id !== newChannel?.id) {
          // 削除されなかった場合のみ rename を試みる
          const stillExists = oldChannel.guild.channels.cache.get(
            oldChannel.id,
          );
          if (stillExists && stillExists.type === ChannelType.GuildVoice) {
            await TeleportVcService.syncVcNameToTopGame(
              stillExists as VoiceChannel,
            );
          }
        }
      }
    } catch (e: any) {
      console.error("voiceStateUpdateエラー:", e?.message ?? e);
    }
  },
);

client.on(
  "presenceUpdate",
  async (_old: Presence | null, presence: Presence) => {
    try {
      const member = presence.member;
      if (!member || member.user.bot) return;
      const voiceChannel = member.voice.channel;
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return;
      await TeleportVcService.syncVcNameToTopGame(voiceChannel as VoiceChannel);
    } catch (e: any) {
      console.error("presenceUpdateエラー:", e?.message ?? e);
    }
  },
);

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      await handlePanelButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    } else if (interaction.isChannelSelectMenu()) {
      await handleChannelSelectMenu(interaction);
    } else if (interaction.isUserSelectMenu()) {
      await handleUserSelectMenu(interaction);
    }
  } catch (e: any) {
    console.error("interactionCreateエラー:", e?.message ?? e);
    if (
      (interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isChannelSelectMenu() ||
        interaction.isUserSelectMenu()) &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      try {
        await interaction.reply({
          content: e?.message ?? "エラーが発生しました。",
          ephemeral: true,
        });
      } catch {}
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
