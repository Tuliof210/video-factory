import { describe, it, expect } from "vitest";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { initVideo } from "../src/core/video-setup";
import { jobPaths } from "../src/core/io";
import { tempRoot } from "./helpers";

describe("video folders", () => {
  it("prefixes new folders with the creation unix timestamp and resolves short names", async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, "channel"));
    const dir = await initVideo("tela-touch", "Tela touch", root, 1_793_000_000_123);
    expect(path.basename(dir)).toBe("1793000000-tela-touch");
    expect(jobPaths("tela-touch", root).jobDir).toBe(dir);
    expect(jobPaths("1793000000-tela-touch", root).jobDir).toBe(dir);
    // "touch" must not match "tela-touch"
    expect(path.basename(jobPaths("touch", root).jobDir)).toBe("touch");
    await initVideo("tela-touch", "Tela touch 2", root, 1_793_000_100_000);
    expect(() => jobPaths("tela-touch", root)).toThrow(/Ambiguous/);
  });
});
