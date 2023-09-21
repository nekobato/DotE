<script lang="ts" setup>
import { RouterView } from "vue-router";
import { PropType, reactive } from "vue";
import { Post } from "@/types/post";
import { MisskeyEntities } from "~/types/misskey";

const router = useRouter();

const pagedata = reactive({
  post: null as PropType<MisskeyNote> | null,
});

window.ipc.on("post:create", () => {
  router.push("/post/create");
});

window.ipc.on("post:close", () => {
  router.push("/post");
});

window.ipc.on("post:detail", (_, payload) => {
  pagedata.post = payload;
  console.log(pagedata);
  router.push("/post/detail");
});
</script>

<template>
  <RouterView :data="pagedata" />
</template>
