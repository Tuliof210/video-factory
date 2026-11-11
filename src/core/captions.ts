import type { Alignment } from "../providers/elevenlabs";
export type Caption = { text: string; start: number; end: number };

function withoutAudioTags(a: Alignment): Alignment {
  const hiddenPositions = new Set<number>();
  for (const match of a.characters.join("").matchAll(/\[[^\[\]\r\n]*\]/g)) {
    for (let i = match.index; i < match.index + match[0].length; i++)
      hiddenPositions.add(i);
  }
  if (!hiddenPositions.size) return a;
  const clean: Alignment = {
    characters: [],
    character_start_times_seconds: [],
    character_end_times_seconds: [],
  };
  let position = 0;
  a.characters.forEach((value, i) => {
    let visible = "";
    for (const char of value) {
      if (!hiddenPositions.has(position)) visible += char;
      position += char.length;
    }
    if (!visible) return;
    clean.characters.push(visible);
    clean.character_start_times_seconds.push(
      a.character_start_times_seconds[i]!,
    );
    clean.character_end_times_seconds.push(a.character_end_times_seconds[i]!);
  });
  return clean;
}

export function captionsFromAlignment(
  alignment: Alignment,
  offset = 0,
  options: { stripAudioTags?: boolean } = {},
): Caption[] {
  const a = options.stripAudioTags ? withoutAudioTags(alignment) : alignment;
  const captions: Caption[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const char = a.characters[i]!;
    if (!text && !char.trim()) continue;
    if (!text) start = a.character_start_times_seconds[i]! + offset;
    text += char;
    end = a.character_end_times_seconds[i]! + offset;
    if (
      (text.length >= 36 && /\s/.test(char)) ||
      /[.!?\n]/.test(char) ||
      i === a.characters.length - 1
    ) {
      if (text.trim())
        captions.push({
          text: text.trim(),
          start,
          end: Math.max(end, start + 0.01),
        });
      text = "";
    }
  }
  return captions;
}
const timestamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
export const toSrt = (captions: Caption[]) =>
  captions
    .map(
      (c, i) =>
        `${i + 1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`,
    )
    .join("\n");
