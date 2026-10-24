export const SOCIAL_ICON_IDS = [
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp",
  "youtube",
  "linkedin",
  "x",
  "telegram",
  "pinterest",
  "snapchat",
  "discord",
] as const;

export type SocialIconId = (typeof SOCIAL_ICON_IDS)[number];

export function isSocialIconId(value: unknown): value is SocialIconId {
  return typeof value === "string" && SOCIAL_ICON_IDS.some((iconId) => iconId === value);
}
