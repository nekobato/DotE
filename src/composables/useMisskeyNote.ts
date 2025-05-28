import { computed, onBeforeUnmount, onMounted, type ComputedRef, type Ref } from "vue";
import type { MisskeyNote, PostType, RenoteType } from "@shared/types/misskey";
import { parseMisskeyAttachments } from "@/utils/misskey";
import { ipcSend } from "@/utils/ipc";

export function useMisskeyNote(
  post: ComputedRef<MisskeyNote> | Ref<MisskeyNote> | MisskeyNote,
  currentInstanceUrl?: string,
) {
  const postRef = computed(() => {
    if (typeof post === "object" && "value" in post) {
      return post.value;
    }
    return post as MisskeyNote;
  });

  const postType = computed((): PostType => {
    const currentPost = postRef.value;
    if (currentPost.renote) {
      if (currentPost.text) {
        return "quote";
      } else {
        return "renote";
      }
    } else if (currentPost.replyId) {
      return "reply";
    } else {
      return "note";
    }
  });

  const renoteType = computed((): RenoteType => {
    const currentPost = postRef.value;
    if (currentPost.text) {
      return "quoted";
    } else {
      return "renoted";
    }
  });

  const postAttachments = computed(() => {
    return parseMisskeyAttachments(postRef.value, currentInstanceUrl);
  });

  const setupStreamSubscription = () => {
    onMounted(() => {
      ipcSend("stream:sub-note", {
        postId: postRef.value.id,
      });
    });

    onBeforeUnmount(() => {
      ipcSend("stream:unsub-note", {
        postId: postRef.value.id,
      });
    });
  };

  return {
    postType,
    renoteType,
    postAttachments,
    setupStreamSubscription,
  };
}
