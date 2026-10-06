import { AppBskyFeedPost } from "@atproto/api";

/** Normalize the optional BCP 47 language tags accepted by Bluesky posts. */
export const normalizeBlueskyPostLanguages = (languages: string[] = []): string[] => {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const input of languages) {
    const language = input.trim();
    if (!language) continue;
    let canonical = language;
    try {
      canonical = Intl.getCanonicalLocales(language)[0];
    } catch {
      // Intl excludes valid private-use, grandfathered and extlang tags accepted by ATProto.
      const validation = AppBskyFeedPost.validateRecord({
        $type: "app.bsky.feed.post",
        text: "",
        createdAt: "1970-01-01T00:00:00Z",
        langs: [language],
      });
      if (!validation.success) {
        throw new Error("言語は ja、en-US などのコードを半角カンマで区切って指定してください");
      }
    }
    const key = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(canonical);
    }
  }
  if (normalized.length > 3) {
    throw new Error("投稿の言語は最大3件まで指定できます");
  }
  return normalized;
};
