import { VoiceChannel } from "discord.js";

export function getVcMembersCount(voiceChannel: VoiceChannel): number {
  return voiceChannel.members.filter((m) => !m.user.bot).size;
}
