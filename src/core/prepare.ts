import path from "node:path";
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  open,
  rm,
} from "node:fs/promises";
import { parseBuffer } from "music-metadata";
import {
  videoSchema,
  validateMedia,
  formats,
  dimensions,
  requireVoiceId,
  type Channel,
  type VideoJob,
} from "../config";
import {
  alignmentSchema,
  isV4Model,
  synthesize,
  type Alignment,
} from "../providers/elevenlabs";
import { ROOT, jobPaths, readJson, writeJson } from "./io";
import { loadChannel } from "./channel";
import { captionsFromAlignment, toSrt, type Caption } from "./captions";
import { stockCredits } from "../providers/stock";
import { prepareAsset, assetCredit } from "./media";
import type { Scene, VideoProps } from "../remotion/types";
export const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
// Keep the legacy key order so descriptive channel metadata cannot invalidate
// existing speech caches and trigger another billable generation.
const synthesisVoice = (channel: Channel) => ({
  provider: channel.voice.provider,
  voiceId: channel.voice.voiceId,
  modelId: channel.voice.modelId,
  stability: channel.voice.stability,
  similarityBoost: channel.voice.similarityBoost,
  speed: channel.voice.speed,
});
export const speechHash = (channel: Channel, text: string) =>
  digest({
    text,
    voice: synthesisVoice(channel),
    language: channel.language,
    format: "mp3_44100_128",
  });
export const inputHash = (channel: Channel, job: VideoJob) =>
  digest({
    pipelineVersion: 3,
    channel: {
      name: channel.name,
      language: channel.language,
      voice: synthesisVoice(channel),
      video: channel.video,
      editing: channel.editing,
      media: channel.media,
    },
    job,
  });
export async function loadJob(videoId: string, root = ROOT) {
  const paths = jobPaths(videoId, root);
  const channel = await loadChannel(paths.channelDir);
  const job = await readJson(
    path.join(paths.jobDir, "video.json"),
    videoSchema,
  );
  validateMedia(channel, job);
  return { ...paths, channel, job };
}
export type BuildManifest = {
  schemaVersion: 1;
  inputHash: string;
  publicDir: string;
  variants: { format: "vertical" | "horizontal"; props: VideoProps }[];
  credits: unknown[];
  durationSeconds: number;
};
export async function prepare(videoId: string, root = ROOT) {
  const { channel, job, ...paths } = await loadJob(videoId, root);
  if (job.scenes.some((scene) => scene.narration)) requireVoiceId(channel);
  await mkdir(paths.buildDir, { recursive: true });
  const lockPath = path.join(paths.buildDir, ".prepare.lock");
  const lock = await open(lockPath, "wx").catch(() => {
    throw new Error(
      "Another prepare may be running. If interrupted, remove build/.prepare.lock before retrying.",
    );
  });
  try {
    const hash = inputHash(channel, job);
    const publicDir = path.join(paths.buildDir, hash, "public");
    await mkdir(publicDir, { recursive: true });
    const scenes: Scene[] = [];
    const captions: Caption[] = [];
    const credits: unknown[] = [];
    let from = 0;
    for (const s of job.scenes) {
      console.log(`Preparing scene: ${s.id}`);
      let audio: string | undefined;
      let duration = s.durationSeconds ?? 0;
      let alignment: Alignment | null = null;
      if (s.narration) {
        const key = speechHash(channel, s.narration);
        const cache = path.join(ROOT, ".cache", "speech", key);
        await mkdir(cache, { recursive: true });
        const audioPath = path.join(cache, "audio.mp3");
        const timingPath = path.join(cache, "alignment.json");
        let bytes: Buffer;
        try {
          bytes = await readFile(audioPath);
        } catch {
          const speechLockPath = path.join(cache, ".generation.lock");
          const speechLock = await open(speechLockPath, "wx").catch(() => {
            throw new Error(
              `This narration is already being generated: ${key}. Retry after the other preparation finishes.`,
            );
          });
          try {
            // Recheck after acquiring the lock: another job may have filled the cache.
            try {
              bytes = await readFile(audioPath);
            } catch {
              const speech = await synthesize(s.narration, channel);
              bytes = speech.audio;
              // Save audio first: a lost timing file must never cause a second paid generation.
              await writeFile(audioPath, bytes);
              await writeJson(timingPath, speech.alignment);
            }
          } finally {
            await speechLock.close();
            await rm(speechLockPath, { force: true });
          }
        }
        try {
          const raw = JSON.parse(await readFile(timingPath, "utf8"));
          alignment = raw === null ? null : alignmentSchema.parse(raw);
        } catch {
          throw new Error(
            `Timing cache missing or invalid: ${timingPath}. Restore it, or explicitly remove this speech cache to regenerate (billable).`,
          );
        }
        const metadata = await parseBuffer(
          bytes,
          { mimeType: "audio/mpeg" },
          { duration: true },
        );
        const seconds = metadata.format.duration;
        if (!seconds || !Number.isFinite(seconds))
          throw new Error(`Cannot measure narration: ${s.id}`);
        if (channel.editing.subtitles && !alignment)
          throw new Error(
            `No alignment returned for ${s.id}; disable subtitles or regenerate with a supported model.`,
          );
        if (s.durationSeconds !== undefined && s.durationSeconds < seconds)
          throw new Error(
            `Scene ${s.id} is shorter than its narration (${seconds.toFixed(2)}s). Increase durationSeconds or omit it.`,
          );
        duration = Math.max(
          duration,
          seconds + channel.editing.narrationTailSeconds,
        );
        audio = `${s.id}.mp3`;
        await copyFile(audioPath, path.join(publicDir, audio));
      }
      const durationInFrames = Math.max(
        1,
        Math.ceil(duration * channel.video.fps),
      );
      const localCaptions = alignment
        ? captionsFromAlignment(alignment, 0, {
            stripAudioTags: isV4Model(channel.voice.modelId),
          })
        : [];
      captions.push(
        ...localCaptions.map((c) => ({
          ...c,
          start: c.start + from / channel.video.fps,
          end: c.end + from / channel.video.fps,
        })),
      );
      let media: Scene["media"];
      if (s.asset) {
        media = await prepareAsset(
          s.asset,
          paths.jobDir,
          publicDir,
          s.id,
          channel.video.fps,
        );
        credits.push({
          scene: s.id,
          ...s.asset,
          retrievedAt: new Date().toISOString(),
        });
      }
      const shots: NonNullable<Scene["shots"]> = [];
      for (const [index, shot] of (s.shots ?? []).entries()) {
        if (
          shot.asset.kind === "video" &&
          shot.startFromSeconds >= shot.asset.duration!
        )
          throw new Error(`Shot trim exceeds video duration: ${s.id}/${index}`);
        const shotFrom = Math.round(shot.startAt * channel.video.fps);
        const next = s.shots?.[index + 1];
        const end = next
          ? Math.round(next.startAt * channel.video.fps)
          : durationInFrames;
        if (
          shotFrom >= durationInFrames ||
          end > durationInFrames ||
          end <= shotFrom
        )
          throw new Error(
            `Shot outside measured scene duration: ${s.id}/${index}`,
          );
        const { asset, startAt: _startAt, ...settings } = shot;
        shots.push({
          ...settings,
          from: shotFrom,
          durationInFrames: end - shotFrom,
          media: await prepareAsset(
            shot.asset,
            paths.jobDir,
            publicDir,
            `${s.id}-shot-${index}`,
            channel.video.fps,
          ),
        });
        credits.push({
          scene: s.id,
          shot: index,
          ...shot.asset,
          retrievedAt: new Date().toISOString(),
        });
      }
      scenes.push({
        id: s.id,
        title: s.title,
        from,
        durationInFrames,
        audio,
        media,
        captions: localCaptions,
        shots: shots.length ? shots : undefined,
      });
      from += durationInFrames;
    }
    const manifest: BuildManifest = {
      schemaVersion: 1,
      inputHash: hash,
      publicDir,
      durationSeconds: from / channel.video.fps,
      credits,
      variants: formats(channel.video.format).map((format) => ({
        format,
        props: {
          title: job.title,
          fps: channel.video.fps,
          ...dimensions(format, channel.video.shortSide),
          durationInFrames: from,
          editing: channel.editing,
          scenes,
        },
      })),
    };
    await writeJson(path.join(paths.buildDir, "manifest.json"), manifest);
    await writeJson(path.join(paths.buildDir, "credits.json"), credits);
    await writeFile(path.join(paths.buildDir, "captions.srt"), toSrt(captions));
    const usedAssets = job.scenes.flatMap((s) => [
      ...(s.asset ? [s.asset] : []),
      ...(s.shots?.map((shot) => shot.asset) ?? []),
    ]);
    const creditLines = [...new Set(usedAssets.map(assetCredit))];
    const providers = [
      ...new Set(
        usedAssets.flatMap((asset) =>
          asset.provider === "local" ? [] : [asset.provider],
        ),
      ),
    ];
    await writeFile(
      path.join(paths.buildDir, "credits.txt"),
      creditLines.length
        ? [
            ...providers.map((provider) => stockCredits[provider]),
            ...creditLines,
          ].join("\n") + "\n"
        : "No stock assets used.\n",
    );
    return manifest;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
