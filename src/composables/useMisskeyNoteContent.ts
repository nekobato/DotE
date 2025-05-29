import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { emojisObject2Array, parseMisskeyText } from "@/utils/misskey";

export function useMisskeyNoteContent(
  note: ComputedRef<MisskeyNote> | Ref<MisskeyNote> | MisskeyNote,
  emojis:
    | ComputedRef<{ name: string; url: string }[]>
    | Ref<{ name: string; url: string }[]>
    | { name: string; url: string }[],
  originNote?: ComputedRef<MisskeyNote | undefined> | Ref<MisskeyNote | undefined> | MisskeyNote,
  originUser?:
    | ComputedRef<MisskeyNote["user"] | undefined>
    | Ref<MisskeyNote["user"] | undefined>
    | MisskeyNote["user"],
  currentInstanceUrl?: string,
  hideCw = false,
) {
  const noteRef = computed(() => {
    if (typeof note === "object" && "value" in note) {
      return note.value;
    }
    return note as MisskeyNote;
  });
  const emojisRef = computed(() => {
    if (Array.isArray(emojis)) {
      return emojis;
    }
    return emojis.value;
  });
  const originNoteRef = computed(() => {
    if (!originNote) return undefined;
    if (typeof originNote === "object" && "value" in originNote) {
      return originNote.value;
    }
    return originNote as MisskeyNote;
  });
  const originUserRef = computed(() => {
    if (!originUser) return undefined;
    if (typeof originUser === "object" && "value" in originUser) {
      return originUser.value;
    }
    return originUser as MisskeyNote["user"];
  });

  const noteEmojis = computed(() => {
    const remoteEmojis = emojisObject2Array(noteRef.value.reactionEmojis || {});
    const localEmojis = emojisRef.value || [];
    return [...remoteEmojis, ...localEmojis];
  });

  const resolvedOriginUser = computed(() => {
    return originNoteRef.value ? originNoteRef.value.user : originUserRef.value;
  });

  const originUsername = computed(() => {
    return getUsername(resolvedOriginUser.value);
  });

  const host = computed(() => {
    return noteRef.value.user.host ? "https://" + noteRef.value.user.host : currentInstanceUrl;
  });

  const getUsername = (user?: MisskeyNote["user"]) => {
    if (!user) return "";
    if (user.name) {
      if (noteEmojis.value) {
        return parseMisskeyText(user.name, noteEmojis.value);
      } else {
        return user.name;
      }
    } else {
      return user.username;
    }
  };

  // CW (Content Warning) 関連
  const canReadAll = ref(false);

  const readAll = () => {
    canReadAll.value = true;
  };

  const isTextHide = computed(() => {
    return noteRef.value?.cw && hideCw && !canReadAll.value;
  });

  return {
    noteEmojis,
    resolvedOriginUser,
    originUsername,
    host,
    getUsername,
    canReadAll,
    readAll,
    isTextHide,
  };
}
