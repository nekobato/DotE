import type { InstanceType } from "@shared/types/store";

const platformIconFileNameMap: Record<InstanceType, string> = {
  misskey: "misskey.png",
  mastodon: "mastodon.png",
  bluesky: "bluesky.png",
};

/**
 * Resolve a platform icon URL in both the Vite dev server and packaged renderer.
 */
export const resolvePlatformIconUrl = (type: InstanceType): string => {
  const fileName = platformIconFileNameMap[type];
  if (import.meta.env.DEV) return `/images/icons/${fileName}`;
  return new URL(`../images/icons/${fileName}`, import.meta.url).toString();
};
