import type { Settings } from "@shared/types/store";
import { useRouter } from "vue-router";

export const gotoHazyRoute = (hazyMode: Settings["hazyMode"]) => {
  const router = useRouter();
  switch (hazyMode) {
    case "show":
    case "haze":
    case "hide":
      router.push("/main/timeline");
      break;
    case "settings":
      router.push("/main/settings");
      break;
    case "tutorial":
      router.push("/main/tutorial");
      break;
    default:
      break;
  }
};
