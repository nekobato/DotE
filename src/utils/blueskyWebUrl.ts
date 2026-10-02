import { AtUri } from "@atproto/api";

// The PDS/API service URL does not identify a web client. Use Bluesky's public web UI.
const blueskyWebOrigin = "https://bsky.app";

/** Keep profile links tied to the account even when its handle changes. */
export const resolveBlueskyProfileUrl = (did: string): string => {
  return new URL(`/profile/${did}`, blueskyWebOrigin).toString();
};

/** Resolve a post's repository and record key without a handle lookup. */
export const resolveBlueskyPostUrl = (postUri: string): string | undefined => {
  if (!postUri.startsWith("at://")) return undefined;
  try {
    const uri = new AtUri(postUri);
    if (
      uri.collection !== "app.bsky.feed.post" ||
      !uri.rkey ||
      uri.rkey === "." ||
      uri.rkey === ".." ||
      uri.pathname !== `/app.bsky.feed.post/${uri.rkey}` ||
      uri.search ||
      uri.hash
    ) {
      return undefined;
    }

    return new URL(`/profile/${uri.hostname}/post/${encodeURIComponent(uri.rkey)}`, blueskyWebOrigin).toString();
  } catch {
    return undefined;
  }
};
