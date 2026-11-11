import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { packagePublication, type Publication } from "../src/core/delivery";

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "video-delivery-"));
  temporaryRoots.push(root);
  const job = path.join(root, "channel/videos/test-video");
  await mkdir(path.join(job, "assets"), { recursive: true });
  await writeFile(path.join(job, "assets/video.mp4"), "original video bytes");
  await writeFile(
    path.join(job, "assets/thumbnail.png"),
    "original thumbnail bytes",
  );
  const publication: Publication = {
    schemaVersion: 1,
    kind: "episode",
    title: "Título existente",
    titleApprovedByUser: false,
    videoRevision: "v1",
    files: {
      video: "assets/video.mp4",
      thumbnail: "assets/thumbnail.png",
      description: null,
      tags: null,
      captions: null,
      credits: null,
      sources: null,
    },
  };
  const save = () =>
    writeFile(path.join(job, "publicacao.json"), JSON.stringify(publication));
  await save();
  return {
    root,
    job,
    publication,
    save,
    pack: () => packagePublication("test-video", root),
  };
}

describe("publication packaging", () => {
  it("copies selected bytes, records missing items without creating placeholders, and is idempotent", async () => {
    const f = await fixture();
    const manifest = await f.pack();
    expect(manifest.files.video?.path).toBe("renders/final/video.mp4");
    expect(manifest.files.thumbnail?.path).toBe("renders/final/thumbnail.png");
    expect(
      await readFile(path.join(f.job, "renders/final/video.mp4"), "utf8"),
    ).toBe("original video bytes");
    expect(manifest.missing).toContain("description");
    expect(manifest.pending).toContain("Título sem aprovação registrada.");
    await expect(
      access(path.join(f.job, "renders/final/descricao.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const again = await f.pack();
    expect(again).toEqual(manifest);
    await expect(
      access(path.join(f.job, "renders/historico/pacotes")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("archives changed finals, removes stale selections, and supports sources inside final itself", async () => {
    const f = await fixture();
    await f.pack();
    await writeFile(
      path.join(f.job, "assets/video.mp4"),
      "revised video bytes",
    );
    f.publication.files.thumbnail = null;
    f.publication.videoRevision = "v2";
    await f.save();
    await f.pack();
    const archiveRoot = path.join(f.job, "renders/historico/pacotes");
    const archives = await readdir(archiveRoot);
    expect(archives).toHaveLength(1);
    expect(
      await readFile(path.join(archiveRoot, archives[0]!, "video.mp4"), "utf8"),
    ).toBe("original video bytes");
    expect(
      await readFile(
        path.join(archiveRoot, archives[0]!, "thumbnail.png"),
        "utf8",
      ),
    ).toBe("original thumbnail bytes");
    await expect(
      access(path.join(f.job, "renders/final/thumbnail.png")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(path.join(f.job, "renders/final/video.mp4"), "utf8"),
    ).toBe("revised video bytes");
    f.publication.files.video = "renders/final/video.mp4";
    f.publication.title = "Título revisado";
    await f.save();
    await f.pack();
    expect(
      await readFile(path.join(f.job, "renders/final/video.mp4"), "utf8"),
    ).toBe("revised video bytes");
    expect(await readdir(archiveRoot)).toHaveLength(2);
  });

  it("validates every source before modifying the current package", async () => {
    const f = await fixture();
    await f.pack();
    const originalManifest = await readFile(
      path.join(f.job, "renders/entrega.json"),
      "utf8",
    );
    f.publication.files.description = "assets/does-not-exist.txt";
    await f.save();
    await expect(f.pack()).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(path.join(f.job, "renders/entrega.json"), "utf8"),
    ).toBe(originalManifest);
    expect(
      await readFile(path.join(f.job, "renders/final/video.mp4"), "utf8"),
    ).toBe("original video bytes");
    await expect(
      access(path.join(f.job, "renders/historico/pacotes")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects traversal, source symlinks outside the episode, and symlink outputs", async () => {
    const f = await fixture();
    f.publication.files.video = "../private.mp4";
    await f.save();
    await expect(f.pack()).rejects.toThrow("relative to this episode");
    const outside = path.join(f.root, "outside.mp4");
    await writeFile(outside, "outside");
    await symlink(outside, path.join(f.job, "assets/link.mp4"));
    f.publication.files.video = "assets/link.mp4";
    await f.save();
    await expect(f.pack()).rejects.toThrow("inside this episode");
    f.publication.files.video = "assets/video.mp4";
    await f.save();
    await mkdir(path.join(f.root, "outside-renders"));
    await symlink(
      path.join(f.root, "outside-renders"),
      path.join(f.job, "renders"),
    );
    await expect(f.pack()).rejects.toThrow("symbolic link");
    expect(await readdir(path.join(f.root, "outside-renders"))).toEqual([]);
  });

  it("packages independent formats and metadata without asserting approval", async () => {
    const f = await fixture();
    await writeFile(path.join(f.job, "assets/vertical.mp4"), "vertical bytes");
    f.publication.title = null;
    f.publication.tags = ["one", "two"];
    f.publication.chapters = [{ time: "00:00", label: "Abertura" }];
    f.publication.variants = [
      { format: "vertical", path: "assets/vertical.mp4" },
    ];
    await f.save();
    const manifest = await f.pack();
    expect(manifest.titleApprovedByUser).toBe(false);
    expect(manifest.missing).toContain("title");
    expect(manifest.variants[0]).toMatchObject({
      format: "vertical",
      path: "renders/final/video-vertical.mp4",
    });
    expect(
      await readFile(
        path.join(f.job, "renders/final/video-vertical.mp4"),
        "utf8",
      ),
    ).toBe("vertical bytes");
    expect(
      await readFile(path.join(f.job, "renders/final/tags.txt"), "utf8"),
    ).toBe("one, two\n");
    expect(
      await readFile(path.join(f.job, "renders/final/capitulos.txt"), "utf8"),
    ).toBe("00:00 Abertura\n");
    await expect(
      access(path.join(f.job, "renders/final/titulo.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
