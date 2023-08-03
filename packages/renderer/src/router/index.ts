import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Menu from "../pages/Menu.vue";
import Timeline from "../pages/MainWindow/Timeline.vue";
import Settings from "../pages/MainWindow/Settings.vue";
import MediaViewer from "../pages/MediaViewer.vue";
import Create from "../pages/PostWindow/Create.vue";
import Detail from "../pages/PostWindow/Detail.vue";
import PostIndex from "../pages/PostWindow/index.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/settings",
    name: "settings",
    component: Settings,
  },
  {
    path: "/timeline",
    name: "timeline",
    component: Timeline,
  },
  {
    path: "/media-viewer",
    name: "media-viewer",
    component: MediaViewer,
  },
  {
    path: "/menu",
    name: "menu",
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
      {
        path: "detail",
        name: "PostDetail",
        component: Detail,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory("./"),
  routes,
});

export default router;
