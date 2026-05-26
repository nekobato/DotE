import type { DotEPost, TimelineStore } from "@/store";
import type { BlueskyFeedPost } from "@/types/bluesky";
import { resolveBlueskyFeedItemId } from "@/utils/bluesky";

type RemoveResult = {
  removedCount: number;
};

const isBlueskyFeedPost = (post: DotEPost): post is BlueskyFeedPost => {
  return "post" in post && typeof post.post === "object" && post.post !== null && "uri" in post.post;
};

/**
 * Resolve the app-local post id used by each platform timeline item.
 */
const resolveTimelinePostId = (post: DotEPost): string | undefined => {
  if (isBlueskyFeedPost(post)) {
    return resolveBlueskyFeedItemId(post);
  }

  const id = (post as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
};

/**
 * Remove one post item from every timeline owned by the same account.
 */
export const removePostAcrossTimelines = (
  timelines: TimelineStore[],
  userId: string,
  postId: string,
): RemoveResult => {
  if (!userId || !postId) {
    return { removedCount: 0 };
  }

  let removedCount = 0;
  timelines.forEach((timeline) => {
    if (timeline.userId !== userId) return;

    const beforePosts = timeline.posts.length;
    timeline.posts = timeline.posts.filter((post) => resolveTimelinePostId(post) !== postId) as DotEPost[];
    removedCount += beforePosts - timeline.posts.length;

    const beforePendingPosts = timeline.pendingNewPosts.length;
    timeline.pendingNewPosts = timeline.pendingNewPosts.filter(
      (post) => resolveTimelinePostId(post) !== postId,
    ) as DotEPost[];
    removedCount += beforePendingPosts - timeline.pendingNewPosts.length;
  });

  return { removedCount };
};
