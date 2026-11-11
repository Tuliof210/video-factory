import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { slug } from "../config";
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export async function readJson<T>(
  file: string,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(JSON.parse(await readFile(file, "utf8")));
}
export async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
}
export function jobPaths(video: string, root = ROOT) {
  slug.parse(video);
  const channelDir = path.join(root, "channel");
  const jobDir = path.join(channelDir, "videos", video);
  return {
    channelDir,
    jobDir,
    buildDir: path.join(jobDir, "build"),
    rendersDir: path.join(jobDir, "renders"),
  };
}
