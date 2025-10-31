import { computed, type ComputedRef, type Ref } from "vue";
import type { MisskeyNote, ReactionData } from "@shared/types/misskey";
import { isMyReaction } from "@/utils/misskey";

export function useMisskeyReactions(
  post: ComputedRef<MisskeyNote> | Ref<MisskeyNote> | MisskeyNote,
  emojis:
    | ComputedRef<{ name: string; url: string }[]>
    | Ref<{ name: string; url: string }[]>
    | { name: string; url: string }[],
) {
  const postRef = computed(() => {
    if (typeof post === "object" && "value" in post) {
      return post.value;
    }
    return post as MisskeyNote;
  });
  const emojisRef = computed(() => {
    if (Array.isArray(emojis)) {
      return emojis;
    }
    return emojis.value;
  });

  const reactions = computed((): ReactionData[] => {
    const currentPost = postRef.value;
    const reactionsData =
      currentPost.renote && !currentPost.text ? currentPost.renote.reactions : currentPost.reactions;

    return Object.keys(reactionsData)
      .map((key) => {
        if (!/^:/.test(key)) {
          return {
            name: key,
            count: reactionsData[key],
            isRemote: false,
          };
        }

        const reactionName = key.replace(/:|@\./g, "");
        const localEmoji = emojisRef.value.find((emoji) => emoji.name === reactionName);

        return {
          name: key,
          url:
            localEmoji?.url ||
            currentPost.reactionEmojis[reactionName] ||
            (currentPost.renote as MisskeyNote)?.reactionEmojis[reactionName] ||
            "",
          count: reactionsData[key],
          isRemote: !localEmoji,
        };
      })
      .sort((a, b) => b.count - a.count);
  });

  const myReaction = computed(() => {
    const currentPost = postRef.value;
    return currentPost.renote?.myReaction || currentPost.myReaction;
  });

  const isReacted = (reactionName: string): boolean => {
    return isMyReaction(reactionName, myReaction.value || undefined);
  };

  return {
    reactions,
    myReaction,
    isReacted,
  };
}
