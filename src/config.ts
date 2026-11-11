import { z } from "zod";

export const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens",
  );
export const stockProviderSchema = z.enum(["pexels", "pixabay"]);
export type StockProvider = z.infer<typeof stockProviderSchema>;
export const channelSchema = z
  .object({
    name: z.string().min(1),
    language: z
      .string()
      .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Use en, es, pt-BR, etc."),
    voice: z
      .object({
        provider: z.literal("elevenlabs"),
        voiceId: z.string().trim().min(1).nullable(),
        modelId: z.string().min(1).default("eleven_v4"),
        stability: z.number().min(0).max(1).default(0.5),
        similarityBoost: z.number().min(0).max(1).default(0.75),
        speed: z.number().min(0.7).max(1.2).default(1),
        name: z.string().optional(),
        referenceUrl: z.url().optional(),
      })
      .strict(),
    video: z
      .object({
        format: z.enum(["vertical", "horizontal", "both"]),
        fps: z.number().int().min(1).max(120),
        shortSide: z
          .number()
          .int()
          .min(360)
          .max(2160)
          .multipleOf(2)
          .default(1080),
      })
      .strict(),
    editing: z
      .object({
        style: z.enum(["webdoc", "minimal", "dynamic"]),
        notes: z.string().default(""),
        background: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#111827"),
        foreground: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#f9fafb"),
        accent: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#fbbf24"),
        fontFamily: z.string().default("Arial"),
        imageMotion: z.enum(["none", "slow-zoom", "pan"]).default("slow-zoom"),
        transition: z.enum(["cut", "fade"]).default("fade"),
        fadeSeconds: z.number().min(0).max(1).default(0.25),
        narrationTailSeconds: z.number().min(0).max(5).default(0.4),
        subtitles: z.boolean().default(true),
      })
      .strict(),
    media: z
      .object({
        provider: stockProviderSchema,
        bRoll: z.boolean(),
        stockImages: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const assetSchema = z
  .object({
    provider: stockProviderSchema,
    id: z.string().min(1),
    kind: z.enum(["image", "video"]),
    downloadUrl: z.url(),
    sourceUrl: z.url(),
    creator: z.string(),
    creatorUrl: z.url(),
    licenseUrl: z.url(),
    width: z.number().positive(),
    height: z.number().positive(),
    duration: z.number().positive().optional(),
  })
  .strict()
  .refine(
    (a) => a.kind !== "video" || a.duration !== undefined,
    "Video assets need duration",
  );

export const localAssetSchema = z
  .object({
    provider: z.literal("local"),
    path: z.string().min(1),
    kind: z.enum(["image", "video"]),
    creator: z.string().min(1),
    sourceUrl: z.string().min(1),
    license: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    duration: z.number().positive().optional(),
  })
  .strict()
  .refine(
    (a) => a.kind !== "video" || a.duration !== undefined,
    "Video assets need duration",
  );
export const mediaAssetSchema = z.union([assetSchema, localAssetSchema]);
export const shotSchema = z
  .object({
    startAt: z.number().nonnegative(),
    asset: mediaAssetSchema,
    title: z.string().default(""),
    label: z.string().default(""),
    fit: z.enum(["cover", "contain"]).default("cover"),
    focusX: z.number().min(0).max(100).default(50),
    focusY: z.number().min(0).max(100).default(50),
    startFromSeconds: z.number().nonnegative().default(0),
    motion: z.enum(["none", "slow-zoom", "pan"]).default("slow-zoom"),
    effect: z.enum(["none", "scan"]).default("none"),
  })
  .strict();

export const videoSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().min(1),
    scenes: z
      .array(
        z
          .object({
            id: slug,
            title: z.string().default(""),
            narration: z.string().trim().max(4500).default(""),
            durationSeconds: z.number().positive().max(3600).optional(),
            // Stock-search record or credited local file inside this episode's assets/.
            asset: mediaAssetSchema.optional(),
            shots: z.array(shotSchema).min(1).optional(),
          })
          .strict()
          .refine(
            (s) => s.narration.length > 0 || s.durationSeconds !== undefined,
            "A silent scene needs durationSeconds",
          )
          .refine(
            (s) =>
              !s.shots ||
              (!s.asset &&
                s.shots[0]!.startAt === 0 &&
                s.shots.every(
                  (shot, i) =>
                    i === 0 || shot.startAt > s.shots![i - 1]!.startAt,
                )),
            "Shots must begin at zero, increase in time and replace the scene asset",
          ),
      )
      .min(1),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = new Set<string>();
    v.scenes.forEach((s, i) => {
      if (ids.has(s.id))
        ctx.addIssue({
          code: "custom",
          path: ["scenes", i, "id"],
          message: "Duplicate scene id",
        });
      ids.add(s.id);
    });
  });
export type Channel = z.infer<typeof channelSchema>;
export type VideoJob = z.infer<typeof videoSchema>;
export type StockAsset = z.infer<typeof assetSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export function requireVoiceId(channel: Channel): string {
  if (channel.voice.voiceId === null)
    throw new Error(
      "Voice is pending. Set voice.voiceId in channel/narracao.prompt.md before generating narration.",
    );
  return channel.voice.voiceId;
}
export const formats = (
  f: Channel["video"]["format"],
): ("vertical" | "horizontal")[] =>
  f === "both" ? ["horizontal", "vertical"] : [f];
export function dimensions(
  format: "vertical" | "horizontal",
  shortSide: number,
) {
  const longSide = Math.round((shortSide * 16) / 9 / 2) * 2;
  return format === "vertical"
    ? { width: shortSide, height: longSide }
    : { width: longSide, height: shortSide };
}
export function validateMedia(channel: Channel, job: VideoJob) {
  for (const s of job.scenes) {
    for (const asset of [
      ...(s.asset ? [s.asset] : []),
      ...(s.shots?.map((shot) => shot.asset) ?? []),
    ]) {
      if (asset.kind === "video" && !channel.media.bRoll)
        throw new Error(`B-roll disabled: ${s.id}`);
      if (asset.kind === "image" && !channel.media.stockImages)
        throw new Error(`Stock images disabled: ${s.id}`);
    }
  }
}
