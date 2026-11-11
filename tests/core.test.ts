import { describe, it, expect, vi, afterEach } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { access, readFile, rm } from "node:fs/promises";
import {
  channelSchema,
  videoSchema,
  validateMedia,
  dimensions,
} from "../src/config";
import { captionsFromAlignment, toSrt } from "../src/core/captions";
import { assertStockUrl } from "../src/core/download";
import { synthesize } from "../src/providers/elevenlabs";
import { digest, inputHash, speechHash, prepare } from "../src/core/prepare";
import { ROOT, jobPaths, writeJson } from "../src/core/io";
import { tempRoot, writeChannel } from "./helpers";
import { searchStock } from "../src/providers/pexels";
const channel = channelSchema.parse({
  name: "Test fixture",
  language: "es",
  voice: { provider: "elevenlabs", voiceId: "fixture" },
  video: { format: "both", fps: 24 },
  editing: { style: "webdoc" },
  media: { provider: "pexels", bRoll: false, stockImages: false },
});
const asset = {
  provider: "pexels",
  id: "1",
  kind: "video",
  duration: 12,
  downloadUrl: "https://videos.pexels.com/1.mp4",
  sourceUrl: "https://www.pexels.com/video/1",
  creator: "Test",
  creatorUrl: "https://www.pexels.com/test",
  licenseUrl: "https://www.pexels.com/license/",
  width: 1920,
  height: 1080,
} as const;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("production constraints", () => {
  it("keys speech by text and synthesis voice, and builds by technical settings", () => {
    const text = "Preserve this approved narration.";
    const named = {
      ...channel,
      voice: {
        ...channel.voice,
        name: "Display name",
        referenceUrl: "https://example.com/voice",
      },
    };
    expect(speechHash(named, text)).toBe(speechHash(channel, text));
    expect(speechHash(channel, text + " Changed.")).not.toBe(
      speechHash(channel, text),
    );
    expect(
      speechHash(
        { ...channel, voice: { ...channel.voice, voiceId: "different" } },
        text,
      ),
    ).not.toBe(speechHash(channel, text));
    const job = videoSchema.parse({
      schemaVersion: 1,
      title: "A",
      scenes: [{ id: "one", narration: "Hi" }],
    });
    expect(inputHash(named, job)).toBe(inputHash(channel, job));
    expect(inputHash({ ...channel, name: "Other" }, job)).not.toBe(
      inputHash(channel, job),
    );
    expect(
      inputHash(
        { ...channel, editing: { ...channel.editing, accent: "#ABCDEF" } },
        job,
      ),
    ).not.toBe(inputHash(channel, job));
  });
  it("prepares Pixabay image downloads and writes provider-specific credits", async () => {
    const root = await tempRoot();
    const paths = jobPaths("silent", root);
    const url = `https://cdn.pixabay.com/photo/${randomUUID()}.jpg`;
    const cache = path.join(
      ROOT,
      ".cache",
      "stock",
      `${digest({ url, kind: "image" })}.jpg`,
    );
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    try {
      await writeChannel(root, {
        ...channel,
        voice: { ...channel.voice, voiceId: null },
        media: { provider: "pixabay", bRoll: true, stockImages: true },
      });
      await writeJson(path.join(paths.jobDir, "video.json"), {
        schemaVersion: 1,
        title: "Image test",
        scenes: [
          {
            id: "image",
            durationSeconds: 1,
            asset: {
              provider: "pixabay",
              kind: "image",
              id: "123",
              downloadUrl: url,
              sourceUrl: "https://pixabay.com/photos/id-123/",
              creator: "Artist",
              creatorUrl: "https://pixabay.com/users/artist-1/",
              licenseUrl: "https://pixabay.com/service/license-summary/",
              width: 1920,
              height: 1080,
            },
          },
        ],
      });
      const manifest = await prepare("silent", root);
      expect(manifest.durationSeconds).toBe(1);
      expect(manifest.variants[0]!.props.scenes[0]!.media).toMatchObject({
        kind: "image",
        file: "image.jpg",
      });
      const credits = await readFile(
        path.join(paths.buildDir, "credits.txt"),
        "utf8",
      );
      expect(credits).toContain("provided by Pixabay");
      expect(credits).toContain("https://pixabay.com/photos/id-123/");
      expect(credits).not.toContain("provided by Pexels");
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(cache, { force: true });
    }
  });
  it("accepts a pending voice and stops narrated preparation before creating build files or calling HTTP", async () => {
    const pendingChannel = channelSchema.parse({
      ...channel,
      voice: { ...channel.voice, voiceId: null },
    });
    const root = await tempRoot();
    const paths = jobPaths("draft", root);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      await writeChannel(root, pendingChannel);
      await writeJson(path.join(paths.jobDir, "video.json"), {
        schemaVersion: 1,
        title: "Pending voice",
        scenes: [
          { id: "silent-intro", durationSeconds: 1 },
          { id: "narrated", narration: "A voice must be selected first." },
        ],
      });
      await expect(prepare("draft", root)).rejects.toThrow("voice.voiceId");
      await expect(access(paths.buildDir)).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("rejects duplicate scene ids and silent scenes without duration", () => {
    expect(() =>
      videoSchema.parse({
        schemaVersion: 1,
        title: "Test",
        scenes: [{ id: "one" }],
      }),
    ).toThrow();
    expect(() =>
      videoSchema.parse({
        schemaVersion: 1,
        title: "Test",
        scenes: [
          { id: "one", narration: "A" },
          { id: "one", narration: "B" },
        ],
      }),
    ).toThrow();
  });
  it("enforces per-channel stock switches", () => {
    const job = videoSchema.parse({
      schemaVersion: 1,
      title: "Test",
      scenes: [{ id: "one", narration: "A", asset }],
    });
    expect(() => validateMedia(channel, job)).toThrow("B-roll disabled");
    expect(() =>
      validateMedia(
        { ...channel, media: { ...channel.media, bRoll: true } },
        job,
      ),
    ).not.toThrow();
  });
  it("creates even-sized horizontal and vertical frames and invalidates stale builds", () => {
    expect(dimensions("vertical", 1080)).toEqual({ width: 1080, height: 1920 });
    const job = videoSchema.parse({
      schemaVersion: 1,
      title: "A",
      scenes: [{ id: "one", narration: "Hi" }],
    });
    expect(inputHash(channel, job)).not.toBe(
      inputHash({ ...channel, video: { ...channel.video, fps: 30 } }, job),
    );
  });
  it("rejects non-Pexels downloads and lookalike domains", () => {
    for (const url of [
      "http://images.pexels.com/a",
      "https://pexels.com.evil.test/a",
      "https://localhost/a",
      "https://user@images.pexels.com/a",
    ])
      expect(() => assertStockUrl(url)).toThrow();
    expect(() => assertStockUrl("https://images.pexels.com/a")).not.toThrow();
  });
});
describe("captions", () => {
  it("preserves the final word, punctuation and frame-aligned offsets", () => {
    const text = "Hola. Mundo";
    const a = {
      characters: [...text],
      character_start_times_seconds: [...text].map((_, i) => i / 10),
      character_end_times_seconds: [...text].map((_, i) => (i + 1) / 10),
    };
    const c = captionsFromAlignment(a, 2);
    expect(c.map((x) => x.text)).toEqual(["Hola.", "Mundo"]);
    expect(c[0]!.start).toBe(2);
    expect(c[1]!.end).toBe(3.1);
    expect(toSrt(c)).toContain("00:00:02,000 --> 00:00:02,500");
  });
  it("hides v4 audio directions while retaining the spoken character timestamps", () => {
    const text = "[quiet, measured narration] Olá. [curious] Tudo bem?";
    const alignment = {
      characters: [...text],
      character_start_times_seconds: [...text].map((_, i) => i / 10),
      character_end_times_seconds: [...text].map((_, i) => (i + 1) / 10),
    };
    const captions = captionsFromAlignment(alignment, 2, {
      stripAudioTags: true,
    });
    expect(captions.map(({ text }) => text)).toEqual(["Olá.", "Tudo bem?"]);
    expect(captions[0]!.start).toBe(2 + text.indexOf("Olá") / 10);
    expect(captions[1]!.start).toBe(2 + text.indexOf("Tudo") / 10);
    expect(captions[1]!.end).toBe(2 + text.length / 10);
    expect(toSrt(captions)).not.toMatch(/\[|\]|curious|narration/);
    expect(alignment.characters.join("")).toBe(text);
  });
  it("keeps literal brackets for other models and produces no caption for a tag alone", () => {
    const align = (text: string) => ({
      characters: [...text],
      character_start_times_seconds: [...text].map((_, i) => i / 10),
      character_end_times_seconds: [...text].map((_, i) => (i + 1) / 10),
    });
    expect(captionsFromAlignment(align("Leia [A]."))[0]!.text).toBe(
      "Leia [A].",
    );
    expect(
      captionsFromAlignment(align("[curious]"), 0, { stripAudioTags: true }),
    ).toEqual([]);
    expect(
      captionsFromAlignment(align("Olá."), 0, { stripAudioTags: true }),
    ).toEqual(captionsFromAlignment(align("Olá.")));
  });
});
describe("provider contracts (mock HTTP, no real charges)", () => {
  it("rejects direct synthesis with a pending voice before calling HTTP", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      synthesize("Olá", {
        ...channel,
        voice: { ...channel.voice, voiceId: null },
      }),
    ).rejects.toThrow("voice.voiceId");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["eleven_v4", "eleven_v4_turbo"])(
    "sends audio tags and supported settings to %s without a speed parameter",
    async (modelId) => {
      vi.stubEnv("ELEVENLABS_API_KEY", "fake");
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ audio_base64: "aGk=", alignment: null }),
          {
            status: 200,
          },
        ),
      );
      vi.stubGlobal("fetch", fetcher);
      const text = "[curious] Hola. ¿Cómo funciona?";
      await synthesize(text, {
        ...channel,
        voice: { ...channel.voice, modelId },
      });
      const [url, init] = fetcher.mock.calls[0]!;
      expect(url).toContain("/with-timestamps");
      expect(channel.voice.modelId).toBe("eleven_v4");
      expect(JSON.parse(init.body)).toEqual({
        text,
        model_id: modelId,
        language_code: "es",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("keeps explicit multilingual_v2 settings and omits unsupported language_code", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "fake");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ audio_base64: "aGk=", alignment: null }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await synthesize("Hola", {
      ...channel,
      voice: {
        ...channel.voice,
        modelId: "eleven_multilingual_v2",
        speed: 0.9,
      },
    });
    expect(result.audio.toString()).toBe("hi");
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toContain("/with-timestamps");
    expect(JSON.parse(init.body)).not.toHaveProperty("language_code");
    expect(JSON.parse(init.body).voice_settings.speed).toBe(0.9);
  });
  it("does not retry a failed billable request", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "fake");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(synthesize("Hola", channel)).rejects.toThrow("429");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("normalizes Pexels video records and uses the current endpoint", async () => {
    vi.stubEnv("PEXELS_API_KEY", "fake");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          videos: [
            {
              id: 1,
              url: asset.sourceUrl,
              duration: 12,
              user: { name: "Test", url: asset.creatorUrl },
              video_files: [
                {
                  file_type: "video/mp4",
                  width: 1920,
                  height: 1080,
                  link: asset.downloadUrl,
                },
              ],
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const results = await searchStock("video", "train", "landscape");
    expect(results[0]).toMatchObject({
      kind: "video",
      creator: "Test",
      duration: 12,
    });
    expect(fetcher.mock.calls[0]![0]).toContain("/v1/videos/search?");
  });
});
