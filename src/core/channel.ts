import path from "node:path";
import { access, cp, readFile, readdir } from "node:fs/promises";
import { channelSchema, type Channel } from "../config";
import { ROOT } from "./io";

export const channelDir = (root = ROOT) => path.join(root, "channel");
export const templateDir = (root = ROOT) => path.join(root, "channel-template");
const PLACEHOLDER = "PREENCHER";

/** Flat `key: value` frontmatter; dotted keys nest (`video.fps: 30`). */
export function frontmatter(markdown: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  const out: Record<string, unknown> = {};
  for (const line of match?.[1]?.split(/\r?\n/) ?? []) {
    const i = line.indexOf(":");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    const raw = line.slice(i + 1).trim();
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    const keys = line.slice(0, i).trim().split(".");
    let node = out;
    for (const key of keys.slice(0, -1))
      node = (node[key] ??= {}) as Record<string, unknown>;
    node[keys.at(-1)!] = value;
  }
  return out;
}

const merge = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(b))
    a[k] =
      v && typeof v === "object" && a[k] && typeof a[k] === "object"
        ? merge(a[k] as Record<string, unknown>, v as Record<string, unknown>)
        : v;
  return a;
};

async function promptFiles(dir: string) {
  return (await readdir(dir)).filter((f) => f.endsWith(".prompt.md")).sort();
}

/** Raw technical settings gathered from every channel/*.prompt.md frontmatter. */
export async function readChannelSettings(dir = channelDir()) {
  const settings: Record<string, unknown> = {};
  for (const file of await promptFiles(dir))
    merge(settings, frontmatter(await readFile(path.join(dir, file), "utf8")));
  return settings;
}

export async function loadChannel(dir = channelDir()): Promise<Channel> {
  try {
    await access(dir);
  } catch {
    throw new Error(
      "Channel not found. Run `npm run video -- channel-init` and fill channel/*.prompt.md.",
    );
  }
  return channelSchema.parse(await readChannelSettings(dir));
}

/** Copies channel-template/ to channel/; never overwrites an existing channel. */
export async function initChannel(root = ROOT) {
  const dir = channelDir(root);
  await cp(templateDir(root), dir, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  return dir;
}

export interface ChannelReport {
  ready: boolean;
  pending: string[];
}

/** Lists unfilled prompts, missing template files and invalid technical settings. */
export async function checkChannel(root = ROOT): Promise<ChannelReport> {
  const dir = channelDir(root);
  const pending: string[] = [];
  try {
    await access(dir);
  } catch {
    return { ready: false, pending: ["channel/: run channel-init."] };
  }
  const present = new Set(await promptFiles(dir));
  for (const file of await promptFiles(templateDir(root)))
    if (!present.has(file))
      pending.push(`${file}: missing (see channel-template/).`);
  for (const file of present) {
    const lines = (await readFile(path.join(dir, file), "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (line.includes(PLACEHOLDER))
        pending.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  const parsed = channelSchema.safeParse(await readChannelSettings(dir));
  if (!parsed.success)
    for (const issue of parsed.error.issues)
      pending.push(`frontmatter ${issue.path.join(".")}: ${issue.message}`);
  else if (parsed.data.voice.voiceId === null)
    pending.push("frontmatter voice.voiceId: choose a voice before narration.");
  return { ready: pending.length === 0, pending };
}
