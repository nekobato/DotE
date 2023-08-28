import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Menu from "../pages/Menu.vue";
import MainIndex from "../pages/MainWindow/index.vue";
import Timeline from "../pages/MainWindow/Timeline.vue";
import Settings from "../pages/MainWindow/Settings.vue";
import Tutorial from "@/pages/MainWindow/Tutorial.vue";
import MediaViewer from "../pages/MediaViewer.vue";
import PostIndex from "../pages/PostWindow/index.vue";
import Create from "../pages/PostWindow/Create.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/main",
    name: "Main",
    component: MainIndex,
    children: [
      {
        path: "timeline",
        name: "MainTimeline",
        component: Timeline,
      },
      {
        path: "settings",
        name: "MainSettings",
        component: Settings,
      },
      {
        path: "tutorial",
        name: "MainTutorial",
        component: Tutorial,
      },
    ],
  },
  {
    path: "/media-viewer",
    name: "MediaViewer",
    component: MediaViewer,
  },
  {
    path: "/menu",
    name: "Menu",
    component: Menu,
  },
  {
    path: "/post",
    name: "Post",
    component: PostIndex,
    children: [
      {
        path: "new",
        name: "PostCreate",
        component: Create,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory("./"),
  routes,
});

export default router;
