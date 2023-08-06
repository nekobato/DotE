<script lang="ts" setup>
import { RouterView } from "vue-router";
import router from "@/router";
import { PropType, reactive } from "vue";
import { Post } from "@/types/Post";

const pagedata = reactive({
  post: null as PropType<Post> | null,
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
