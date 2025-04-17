// chat以外は権利をいただく

import { ChannelName, InstanceType } from "@shared/types/store";

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
      return "misskey:homeTimeline";
    case "bluesky":
      return "misskey:homeTimeline";
    default:
      return "misskey:homeTimeline";
  }
};

export const keyboardEventToElectronAccelerator = (e: KeyboardEvent): string => {
  const shortcut = [];
  if (e.metaKey) {
    shortcut.push("Meta");
  }
  if (e.ctrlKey) {
    shortcut.push("Ctrl");
  }
  if (e.altKey) {
    shortcut.push("Alt");
  }
  if (e.shiftKey) {
    shortcut.push("Shift");
  }
  switch (e.key) {
    case " ":
      shortcut.push("Space");
      break;
    case "+":
      shortcut.push("Plus");
      break;
    default:
      if (/Key[A-Z]/.test(e.code)) {
        shortcut.push(e.code.replace("Key", ""));
      } else if (/Arrow.+/.test(e.key)) {
        shortcut.push(e.key.replace("Arrow", ""));
      } else {
        shortcut.push(e.key);
      }
      break;
  }
  return shortcut.join("+");
};
