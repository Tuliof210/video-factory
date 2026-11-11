import { describe, it, expect } from "vitest";
import path from "node:path";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { ROOT } from "../src/core/io";
import {
  checkChannel,
  frontmatter,
  initChannel,
  loadChannel,
} from "../src/core/channel";
import { tempRoot } from "./helpers";

describe("channel prompts", () => {
  it("parses flat frontmatter with dotted keys and typed values", () => {
    expect(
      frontmatter(
        '---\nname: Meu Canal\nvideo.fps: 30\nvoice.voiceId: null\nmedia.bRoll: true\nediting.accent: "#ABCDEF"\n---\n# body\nkey: ignored',
      ),
    ).toEqual({
      name: "Meu Canal",
      video: { fps: 30 },
      voice: { voiceId: null },
      media: { bRoll: true },
      editing: { accent: "#ABCDEF" },
    });
  });

  it("copies the template once, reports placeholders, then loads when filled", async () => {
    const root = await tempRoot();
    try {
      await cp(
        path.join(ROOT, "channel-template"),
        path.join(root, "channel-template"),
        {
          recursive: true,
        },
      );
      const dir = await initChannel(root);
      await expect(initChannel(root)).rejects.toThrow();
      const draft = await checkChannel(root);
      expect(draft.ready).toBe(false);
      expect(draft.pending.some((p) => p.startsWith("canal.prompt.md:"))).toBe(
        true,
      );
      expect(draft.pending.some((p) => p.includes("frontmatter name"))).toBe(
        true,
      );

      const fill = async (file: string, replace: [string, string][]) => {
        let text = await readFile(path.join(dir, file), "utf8");
        for (const [a, b] of replace) text = text.replace(a, b);
        await writeFile(path.join(dir, file), text);
      };
      await fill("canal.prompt.md", [
        ["name: null", "name: Teste"],
        ["language: null", "language: pt-BR"],
      ]);
      await fill("formato.prompt.md", [
        ["video.format: null", "video.format: vertical"],
        ["video.fps: null", "video.fps: 30"],
      ]);
      await fill("narracao.prompt.md", [
        ["voice.voiceId: null", "voice.voiceId: abc123"],
      ]);
      const channel = await loadChannel(dir);
      expect(channel).toMatchObject({
        name: "Teste",
        video: { format: "vertical", fps: 30 },
        voice: { voiceId: "abc123" },
      });
      expect(
        (await checkChannel(root)).pending.every((p) =>
          p.includes("PREENCHER"),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
