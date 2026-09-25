import type { ThreadTypeName } from "../types";

export type PeerProfile = {
  displayName?: string;
  zaloName?: string;
  avatar?: string;
};

export function shouldRefreshPeer(
  threadType: ThreadTypeName,
  conversation: { title: string; avatarUrl: string | null } | null,
  ownerName: string,
): boolean {
  if (threadType !== "user") return false;
  if (!conversation || !conversation.avatarUrl) return true;
  const owner = ownerName.trim();
  return owner !== "" && conversation.title.trim() === owner;
}

export function peerFromChangedProfiles(
  changed: Record<string, PeerProfile & { userId?: string }>,
  threadId: string,
): PeerProfile | null {
  const direct = changed[threadId];
  if (direct?.displayName?.trim() || direct?.zaloName?.trim()) return direct;
  for (const value of Object.values(changed)) {
    if (value.userId === threadId && (value.displayName?.trim() || value.zaloName?.trim())) return value;
  }
  return null;
}

export function peerAvatar(
  changedAvatar: string | undefined,
  profileAvatars: Record<string, { avatar?: string } | undefined>,
  threadId: string,
): string | null {
  const direct = changedAvatar?.trim() ?? "";
  if (direct) return direct;
  const exact = profileAvatars[threadId]?.avatar?.trim() ?? "";
  if (exact) return exact;
  for (const row of Object.values(profileAvatars)) {
    const avatar = row?.avatar?.trim() ?? "";
    if (avatar) return avatar;
  }
  return null;
}

export function peerLabel(profile: PeerProfile): { title: string; avatarUrl: string | null } | null {
  const title = profile.displayName?.trim() || profile.zaloName?.trim() || "";
  if (title === "") return null;
  const avatar = profile.avatar?.trim() ?? "";
  return { title, avatarUrl: avatar === "" ? null : avatar };
}
