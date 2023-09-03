// chat以外はできる
// ref: https://misskey-hub.net/docs/api/permission.html
export const hazyMisskeyPermissions: string[] = [
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
  "write:reactions",
  "write:votes",
  "read:pages",
  "write:pages",
  //  これいる？
  "write:page-likes",
  "read:page-likes",
  "write:gallery-likes",
  "read:gallery-likes",
];

export const hazyMisskeyPermissionString = () => {
  return hazyMisskeyPermissions.join(",");
};
