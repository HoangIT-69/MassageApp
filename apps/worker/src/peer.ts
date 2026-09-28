import {
  findConversationByThread,
  peerAvatar,
  peerFromChangedProfiles,
  peerLabel,
  readZaloLink,
  shouldRefreshPeer,
  type AppDatabase,
  type InboundInput,
  type PeerProfile,
} from "@zalo/core";
import type { API } from "zca-js";

async function readPeer(api: API, threadId: string): Promise<PeerProfile | null> {
  const info = await api.getUserInfo(threadId);
  const profile = peerFromChangedProfiles(
    info.changed_profiles as Record<string, PeerProfile & { userId?: string }>,
    threadId,
  );
  const urls = profile?.avatar?.trim()
    ? null
    : await api.getAvatarUrlProfile(threadId).catch(() => null);
  const avatar = peerAvatar(profile?.avatar, urls ?? {}, threadId);
  if (profile) return { ...profile, avatar: avatar ?? undefined };
  if (!avatar) return null;
  return { avatar };
}

export async function enrichInbound(
  api: API,
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
): Promise<InboundInput> {
  const existing = await findConversationByThread(db, vendorId, input.channel, input.threadId);
  const link = await readZaloLink(db, vendorId);
  if (!shouldRefreshPeer(input.threadType, existing, link.displayName ?? "")) return input;
  const profile = await readPeer(api, input.threadId).catch(() => null);
  if (!profile) return input;
  const label = peerLabel(profile);
  if (label) return { ...input, title: label.title, avatarUrl: label.avatarUrl, overwriteTitle: true };
  const avatar = profile.avatar?.trim() ?? "";
  if (!avatar) return input;
  return { ...input, avatarUrl: avatar, overwriteTitle: false };
}
