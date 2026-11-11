import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const flatten = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}: ${JSON.stringify(v)}`],
  );

export const tempRoot = () => mkdtemp(path.join(tmpdir(), "video-root-"));

/** Writes settings as channel/*.prompt.md frontmatter, the way users fill them. */
export async function writeChannel(root: string, settings: object) {
  await mkdir(path.join(root, "channel"), { recursive: true });
  await writeFile(
    path.join(root, "channel", "tecnico.prompt.md"),
    `---\n${flatten(settings).join("\n")}\n---\n`,
  );
}
