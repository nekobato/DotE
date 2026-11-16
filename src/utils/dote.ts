// chat以外は権利をいただく

import { ChannelName, InstanceType } from "@shared/types/store";
import type { RecordedHotkey } from "v-record-hotkey";

// ref: https://github.com/misskey-dev/misskey/blob/develop/packages/misskey-js/src/consts.ts
export const doteMisskeyPermissions: string[] = [
  "read:account",
  "write:account",
  "read:blocks",
  "write:blocks",
  "read:drive",
  "write:drive",
  "read:favorites",
  "write:favorites",
  "read:following",
  "write:following",
  // chatは見ないよ
  // 'read:messaging',
  // 'write:messaging',
  "read:mutes",
  "write:mutes",
  "write:notes",
  "read:notifications",
  "write:notifications",
  "read:reactions",
  "write:reactions",
  "write:votes",
  "read:pages",
  "write:pages",
  "write:page-likes",
  "read:page-likes",
  "read:user-groups",
  "write:user-groups",
  "read:channels",
  "write:channels",
  "read:gallery",
  "write:gallery",
  "read:gallery-likes",
  "write:gallery-likes",
  "read:flash",
  "write:flash",
  "read:flash-likes",
  "write:flash-likes",
];

export const doteMisskeyPermissionString = () => {
  return doteMisskeyPermissions.join(",");
};

export const defaultChannelNameFromType = (type?: InstanceType): ChannelName => {
  switch (type) {
    case "misskey":
      return "misskey:homeTimeline";
    case "mastodon":
      return "mastodon:homeTimeline";
    case "bluesky":
      return "bluesky:homeTimeline";
    default:
      return "misskey:homeTimeline";
  }
};

export const recordedHotkeyToElectronAccelerator = (hotkey: RecordedHotkey): string | null => {
  const numpadKeys: Record<string, string> = {
    NumpadDecimal: "numdec",
    NumpadAdd: "numadd",
    NumpadSubtract: "numsub",
    NumpadMultiply: "nummult",
    NumpadDivide: "numdiv",
  };
  let key = hotkey.key;
  if (/^Key[A-Z]$/.test(hotkey.code)) {
    key = hotkey.code.slice(3);
  } else if (/^Digit[0-9]$/.test(hotkey.code)) {
    key = hotkey.code.slice(5);
  } else if (/^Numpad[0-9]$/.test(hotkey.code)) {
    key = `num${hotkey.code.slice(6)}`;
  } else if (numpadKeys[hotkey.code]) {
    key = numpadKeys[hotkey.code];
  } else if (key === " ") {
    key = "Space";
  } else if (key === "+") {
    key = "Plus";
  } else if (/^Arrow(Up|Down|Left|Right)$/.test(key)) {
    key = key.slice(5);
  } else if (
    !/^[\x21-\x7e]$/.test(key) &&
    !/^F([1-9]|1[0-9]|2[0-4])$/.test(key) &&
    !/^(Tab|CapsLock|NumLock|ScrollLock|Backspace|Delete|Insert|Enter|Home|End|PageUp|PageDown|Escape|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/.test(
      key,
    )
  ) {
    return null;
  }
  return [...hotkey.modifiers, key].join("+");
};
