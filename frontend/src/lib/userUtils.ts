export interface MinimalUser {
  firstName?: string | null;
  lastName?: string | null;
  picture?: string | null;
}

export interface MinimalParticipant {
  displayName?: string | null;
}

/**
 * Resolves the display name of a meeting participant.
 * Prioritizes displayName, then firstName + lastName, and falls back.
 */
export function getUserDisplayName(
  user?: MinimalUser | null,
  participant?: MinimalParticipant | null,
  fallback: string = "Người dùng ẩn danh"
): string {
  if (participant?.displayName) {
    return participant.displayName;
  }
  if (user) {
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (fullName) return fullName;
  }
  return fallback;
}

/**
 * Extracts initials from a name (max 2 characters).
 */
export function getInitials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-teal-500",
];

/**
 * Deterministically retrieves a background color class based on user ID.
 */
export function getRandomBgColor(id?: string | null): string {
  if (!id) return "bg-indigo-500";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
