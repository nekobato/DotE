<script lang="ts" setup>
import Header from "@/components/Header.vue";
import Layout from "@/components/layouts/WithHeader.vue";
import { ipcSend } from "@/utils/ipc";
import { ref } from "vue";
import { useRouter, RouterView } from "vue-router";

const router = useRouter();

const pagedata = ref<any>({});

window.ipc?.on("post:create", () => {
  router.push("/post/create");
});

window.ipc?.on("post:detail", (_, payload) => {
  pagedata.value = payload;
  console.info(pagedata);
  router.push("/post/detail");
});

window.ipc?.on("post:reaction", (_, payload) => {
  pagedata.value = payload;
  router.push("/post/reaction");
});

window.ipc?.on("post:repost", (_, payload) => {
  pagedata.value = payload;
  router.push("/post/create");
});

window.ipc?.on("post:close", () => {
  pagedata.value = {};
  router.replace("/post");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    pagedata.value = {};
    ipcSend("post:close");
  }
});
</script>

<template>
  <Layout>
    <Header windowType="post" />
    <RouterView :data="pagedata" @close="" />
  </Layout>
</template>
