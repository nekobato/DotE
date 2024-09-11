import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  {
    path: "/main",
    name: "Main",
    component: () => import("./pages/main.vue"),
    children: [
      {
        path: "/main/timeline",
        name: "MainTimeline",
        component: () => import("./pages/main/timeline.vue"),
      },
      {
        path: "/main/settings",
        name: "MainSettings",
        component: () => import("./pages/main/settings.vue"),
      },
    ],
  },
  {
    path: "/post",
    name: "Post",
    component: () => import("./pages/post.vue"),
    children: [
      {
        path: "/post/create",
        name: "PostCreate",
        component: () => import("./pages/post/create.vue"),
      },
      {
        path: "/post/reaction",
        name: "PostReaction",
        component: () => import("./pages/post/reaction.vue"),
      },
      {
        path: "/post/repost",
        name: "PostRepost",
        component: () => import("./pages/post/repost.vue"),
      },
    ],
  },
  {
    path: "/media-viewer",
    name: "MediaViewer",
    component: () => import("./pages/media-viewer.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
