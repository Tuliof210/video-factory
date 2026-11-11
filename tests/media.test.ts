import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { channelSchema, localAssetSchema, videoSchema } from "../src/config";
import { prepareAsset } from "../src/core/media";
import { prepare } from "../src/core/prepare";
import { jobPaths, writeJson } from "../src/core/io";
import { tempRoot, writeChannel } from "./helpers";

const asset = localAssetSchema.parse({
  provider: "local",
  path: "assets/diagram.svg",
  kind: "image",
  creator: "Original diagram",
  sourceUrl: "Episode research",
  license: "Original artwork",
  width: 1920,
  height: 1080,
});
const channel = channelSchema.parse({
  name: "Fixture",
  language: "pt-BR",
  voice: { provider: "elevenlabs", voiceId: null },
  video: { format: "horizontal", fps: 24 },
  editing: { style: "webdoc" },
  media: { provider: "pixabay", bRoll: true, stockImages: true },
});
afterEach(() => vi.unstubAllGlobals());

describe("local media and timed shots", () => {
  it("copies credited local artwork and rejects traversal and symlinks outside assets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "video-local-"));
    try {
      await mkdir(path.join(dir, "assets"));
      await mkdir(path.join(dir, "public"));
      await writeFile(path.join(dir, "assets/diagram.svg"), "<svg/>");
      await writeFile(path.join(dir, "outside.svg"), "private");
      await symlink(
        path.join(dir, "outside.svg"),
        path.join(dir, "assets/link.svg"),
      );
      const result = await prepareAsset(
        asset,
        dir,
        path.join(dir, "public"),
        "one",
        24,
      );
      expect(result.file).toBe("one.svg");
      expect(await readFile(path.join(dir, "public/one.svg"), "utf8")).toBe(
        "<svg/>",
      );
      for (const file of ["outside.svg", "assets/link.svg"])
        await expect(
          prepareAsset(
            { ...asset, path: file },
            dir,
            path.join(dir, "public"),
            "bad",
            24,
          ),
        ).rejects.toThrow("inside this episode");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("requires contiguous shot ordering and a single source of visual media", () => {
    const job = (shots: unknown[], extra = {}) => ({
      schemaVersion: 1,
      title: "Fixture",
      scenes: [{ id: "one", durationSeconds: 3, shots, ...extra }],
    });
    const shot = { startAt: 0, asset };
    expect(() =>
      videoSchema.parse(job([shot, { ...shot, startAt: 1 }])),
    ).not.toThrow();
    for (const shots of [
      [{ ...shot, startAt: 1 }],
      [shot, shot],
      [shot, { ...shot, startAt: 2 }, { ...shot, startAt: 1 }],
    ])
      expect(() => videoSchema.parse(job(shots))).toThrow();
    expect(() => videoSchema.parse(job([shot], { asset }))).toThrow();
  });
  it("prepares gapless frame ranges and preserves local source credits without HTTP", async () => {
    const root = await tempRoot();
    const paths = jobPaths("fixture", root);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      await writeChannel(root, channel);
      await mkdir(path.join(paths.jobDir, "assets"), { recursive: true });
      await writeFile(path.join(paths.jobDir, "assets/diagram.svg"), "<svg/>");
      const job = {
        schemaVersion: 1,
        title: "Fixture",
        scenes: [
          {
            id: "one",
            durationSeconds: 3,
            shots: [
              { startAt: 0, asset },
              { startAt: 1.25, asset },
            ],
          },
        ],
      };
      await writeJson(path.join(paths.jobDir, "video.json"), job);
      const result = await prepare("fixture", root);
      expect(result.variants[0]!.props.scenes[0]!.shots).toMatchObject([
        { from: 0, durationInFrames: 30 },
        { from: 30, durationInFrames: 42 },
      ]);
      expect(
        await readFile(path.join(paths.buildDir, "credits.txt"), "utf8"),
      ).toContain("Original diagram — Episode research — Original artwork");
      expect(fetcher).not.toHaveBeenCalled();
      job.scenes[0]!.shots[1]!.startAt = 3;
      await writeJson(path.join(paths.jobDir, "video.json"), job);
      await expect(prepare("fixture", root)).rejects.toThrow(
        "outside measured scene duration",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
