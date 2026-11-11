import { z } from "zod";
import { requireVoiceId, type Channel } from "../config";
import { apiKey, requestJson } from "./http";
export const alignmentSchema = z
  .object({
    characters: z.array(z.string()),
    character_start_times_seconds: z.array(z.number().nonnegative()),
    character_end_times_seconds: z.array(z.number().nonnegative()),
  })
  .refine(
    (a) =>
      a.characters.length === a.character_start_times_seconds.length &&
      a.characters.length === a.character_end_times_seconds.length,
    "Invalid alignment lengths",
  );
export type Alignment = z.infer<typeof alignmentSchema>;
const speechSchema = z.object({
  audio_base64: z.string().min(1),
  alignment: alignmentSchema.nullish(),
  normalized_alignment: alignmentSchema.nullish(),
});
export const isV4Model = (modelId: string) =>
  modelId === "eleven_v4" || modelId === "eleven_v4_turbo";
export async function synthesize(text: string, channel: Channel) {
  const voiceId = requireVoiceId(channel);
  const v = channel.voice;
  const body: Record<string, unknown> = {
    text,
    model_id: v.modelId,
    voice_settings: {
      stability: v.stability,
      similarity_boost: v.similarityBoost,
      // v4 controls pacing through delivery cues; the API does not support speed.
      ...(!isV4Model(v.modelId) ? { speed: v.speed } : {}),
    },
  };
  // multilingual_v2 does not support language_code. The narration text determines its language.
  if (v.modelId !== "eleven_multilingual_v2")
    body.language_code = channel.language.split("-")[0];
  // Never automatically retry billable POST requests.
  const result = speechSchema.parse(
    await requestJson(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey("ELEVENLABS_API_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ),
  );
  return {
    audio: Buffer.from(result.audio_base64, "base64"),
    alignment: result.normalized_alignment ?? result.alignment ?? null,
  };
}
export async function listVoices() {
  return requestJson("https://api.elevenlabs.io/v2/voices?page_size=100", {
    headers: { "xi-api-key": apiKey("ELEVENLABS_API_KEY") },
  });
}
