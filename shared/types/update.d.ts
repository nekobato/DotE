export type AutoUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "error"
  | "disabled";

export type AutoUpdateState = {
  status: AutoUpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadedVersion: string | null;
  progressPercent: number | null;
  bytesPerSecond: number | null;
  transferredBytes: number | null;
  totalBytes: number | null;
  checkedAt: string | null;
  releaseDate: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  errorMessage: string | null;
};
