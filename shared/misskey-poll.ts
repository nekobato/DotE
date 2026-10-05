import type { Endpoints, entities } from "misskey-js";

export type MisskeyPoll = NonNullable<entities.Note["poll"]>;
export type MisskeyPollInput = NonNullable<Endpoints["notes/create"]["req"]["poll"]>;
export type MisskeyPollDraft = {
  choices: string[];
  multiple: boolean;
  expiredAfter: number | null;
};

export const createMisskeyPollDraft = (): MisskeyPollDraft => ({
  choices: ["", ""],
  multiple: false,
  expiredAfter: null,
});

/** Validate before uploading media and again at the API boundary. */
export const normalizeMisskeyPoll = (poll: MisskeyPollInput): MisskeyPollInput => {
  if (!Array.isArray(poll.choices) || poll.choices.length < 2 || poll.choices.length > 10) {
    throw new Error("投票の選択肢は2〜10個にしてください");
  }
  const choices = poll.choices.map((choice) => choice.trim());
  if (choices.some((choice) => !choice || Array.from(choice).length > 50)) {
    throw new Error("選択肢は空欄にせず、各50文字以内で入力してください");
  }
  if (new Set(choices).size !== choices.length) {
    throw new Error("投票の選択肢は重複しないようにしてください");
  }
  if (poll.expiredAfter != null && (!Number.isSafeInteger(poll.expiredAfter) || poll.expiredAfter < 1)) {
    throw new Error("投票の締切までの時間が正しくありません");
  }
  if (poll.expiresAt != null && (!Number.isSafeInteger(poll.expiresAt) || poll.expiresAt <= Date.now())) {
    throw new Error("投票の締切は未来の日時にしてください");
  }
  if (poll.expiresAt != null && poll.expiredAfter != null) {
    throw new Error("投票の締切は日時または期間のどちらか一方を指定してください");
  }
  return { ...poll, choices, multiple: poll.multiple ?? false };
};

export const isMisskeyPollExpired = (poll: MisskeyPoll, now = Date.now()): boolean =>
  Boolean(poll.expiresAt && Date.parse(poll.expiresAt) <= now);

export const canVoteMisskeyPoll = (poll: MisskeyPoll, choice: number, now = Date.now()): boolean =>
  Number.isInteger(choice) &&
  choice >= 0 &&
  choice < poll.choices.length &&
  !isMisskeyPollExpired(poll, now) &&
  !poll.choices[choice].isVoted &&
  (poll.multiple || !poll.choices.some((item) => item.isVoted));
