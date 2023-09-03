import { Setting } from "~/types/store";

export const gotoHazyRoute = (hazyMode: Setting["hazyMode"]) => {
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
