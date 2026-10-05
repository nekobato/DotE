/** Normalize the optional BCP 47 language tags accepted by Bluesky posts. */
export const normalizeBlueskyPostLanguages = (languages: string[] = []): string[] => {
  let normalized: string[];
  try {
    normalized = Intl.getCanonicalLocales(languages.map((language) => language.trim()).filter(Boolean));
  } catch {
    throw new Error("言語は ja、en-US などのコードを半角カンマで区切って指定してください");
  }
  if (normalized.length > 3) {
    throw new Error("投稿の言語は最大3件まで指定できます");
  }
  return normalized;
};
