export type ThemeConfig = {
  appicon: string;
  thumbnails: string[];
  downloadLinks: {
    windows?: {
      x64: string;
    };
    macOS?: {
      arm64: string;
    };
  };
  refLinks: {
    type: "github" | "twitter";
    url: string;
  }[];
};
