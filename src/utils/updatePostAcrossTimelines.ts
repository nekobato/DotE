import type { MisskeyNote } from "@shared/types/misskey";
import type { MastodonToot } from "@/types/mastodon";
import type { DotEPost, TimelineStore } from "@/store";

type IdentifiedPost = DotEPost & { id: string };

type UpdateResult = {
  updatedCount: number;
};

const hasId = (post: DotEPost): post is IdentifiedPost => {
  return typeof (post as { id?: unknown }).id === "string";
};

const isMisskeyNote = (post: DotEPost): post is MisskeyNote => {
  return "reactionEmojis" in post;
};

const isMastodonToot = (post: DotEPost): post is MastodonToot => {
  return "reblogs_count" in post && "favourites_count" in post && "reblogged" in post;
};

const updateMisskeyRenote = (note: MisskeyNote, updated: IdentifiedPost): boolean => {
  const renote = note.renote as MisskeyNote | undefined;
  if (!renote) return false;
  if (renote.id === updated.id) {
    note.renote = updated as MisskeyNote;
    return true;
  }
  return updateMisskeyRenote(renote, updated);
};

const updateMastodonReblog = (toot: MastodonToot, updated: IdentifiedPost): boolean => {
  const reblog = toot.reblog as MastodonToot | undefined;
  if (!reblog) return false;
  if (reblog.id === updated.id) {
    toot.reblog = updated as MastodonToot;
    return true;
  }
  return updateMastodonReblog(reblog, updated);
};

const updateNestedReference = (post: DotEPost, updated: IdentifiedPost): boolean => {
  if (isMisskeyNote(post)) {
    return updateMisskeyRenote(post, updated);
  }
  if (isMastodonToot(post)) {
    return updateMastodonReblog(post, updated);
  }
  return false;
};

const updatePostsInTimeline = (timeline: TimelineStore, updated: IdentifiedPost): number => {
  if (!Array.isArray(timeline.posts) || timeline.posts.length === 0) {
    return 0;
  }

  let count = 0;
  for (let index = 0; index < timeline.posts.length; index += 1) {
    const post = timeline.posts[index];
    if (hasId(post) && post.id === updated.id) {
      timeline.posts.splice(index, 1, updated);
      count += 1;
      continue;
    }

    if (updateNestedReference(post, updated)) {
      count += 1;
    }
  }

  return count;
};

export const updatePostAcrossTimelines = (timelines: TimelineStore[], updated: DotEPost): UpdateResult => {
  if (!hasId(updated)) {
    return { updatedCount: 0 };
  }

  const updatedCount = timelines.reduce((total, timeline) => {
    return total + updatePostsInTimeline(timeline, updated);
  }, 0);

  return { updatedCount };
};
