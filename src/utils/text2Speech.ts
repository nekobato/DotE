export async function text2Speech(userName: string, text: string) {
  const text4Speech = `${userName} ${text}`
    // replace URL to "URL" for better speech
    .replace(/https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+/g, "URL")
    // remove emojis (:.+:)
    .replace(/:.+:/g, "");
  const utterance = new SpeechSynthesisUtterance(text4Speech);
  utterance.lang = "ja-JP";
  utterance.rate = 1.1;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}
