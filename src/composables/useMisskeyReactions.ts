import { computed, type ComputedRef, type Ref } from "vue";
import type { MisskeyNote, ReactionData } from "@shared/types/misskey";
import { isMyReaction, resolveMisskeyNote } from "@/utils/misskey";

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

  const reactionNote = computed(() => resolveMisskeyNote(postRef.value));

  const reactions = computed((): ReactionData[] => {
    const currentPost = reactionNote.value;
    const reactionsData = currentPost.reactions;

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
          url: localEmoji?.url || currentPost.reactionEmojis[reactionName] || "",
          count: reactionsData[key],
          isRemote: !localEmoji,
        };
      })
      .sort((a, b) => b.count - a.count);
  });

  const myReaction = computed(() => {
    return reactionNote.value.myReaction;
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
