type BlueskyPostDateSource = {
  post?: {
    indexedAt?: unknown;
    record?: unknown;
  };
};

type CreatedAtRecord = {
  createdAt?: unknown;
};

type PostDateSource =
  | {
      createdAt?: unknown;
    }
  | {
      created_at?: unknown;
    }
  | BlueskyPostDateSource;

type PostDateInput = string | number | Date | null | undefined;

/**
 * Check whether a value can expose a Bluesky record creation timestamp.
 */
const isCreatedAtRecord = (record: unknown): record is CreatedAtRecord => {
  return typeof record === "object" && record !== null && "createdAt" in record;
};

/**
 * Pad a date part to two digits.
 */
const padDatePart = (value: number): string => {
  return value.toString().padStart(2, "0");
};

/**
 * Resolve the source post creation timestamp across supported services.
 */
export const resolvePostCreatedAt = (post: PostDateSource): string => {
  if ("createdAt" in post && typeof post.createdAt === "string") {
    return post.createdAt;
  }

  if ("created_at" in post && typeof post.created_at === "string") {
    return post.created_at;
  }

  if ("post" in post && post.post) {
    if (isCreatedAtRecord(post.post.record) && typeof post.post.record.createdAt === "string") {
      return post.post.record.createdAt;
    }

    if (typeof post.post.indexedAt === "string") {
      return post.post.indexedAt;
    }
  }

  return "";
};

/**
 * Format a post timestamp as YYYY-MM-DD HH:MM in the user's local timezone.
 */
export const formatPostDateTime = (value: PostDateInput): string => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join(" ");
};
