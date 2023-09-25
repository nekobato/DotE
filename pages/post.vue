<script lang="ts" setup>
import { RouterView } from "vue-router";

const router = useRouter();

const pagedata = ref<any>({});

window.ipc.on("post:create", () => {
  router.push("/post/create");
});

window.ipc.on("post:close", () => {
  router.push("/post");
});

window.ipc.on("post:detail", (_, payload) => {
  pagedata.value = payload;
  router.push("/post/detail");
});

window.ipc.on("post:reaction", (_, payload) => {
  pagedata.value = payload;
  console.log(payload);
  router.push("/post/reaction");
});
</script>

<template>
  <RouterView :data="pagedata" />
</template>
