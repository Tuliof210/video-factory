import path from "node:path";
import { createHash } from "node:crypto";
import { copyFile, realpath } from "node:fs/promises";
import type { MediaAsset } from "../config";
import type { Scene } from "../remotion/types";
import { ROOT } from "./io";
import { downloadStock } from "./download";

export async function prepareAsset(
  asset: MediaAsset,
  jobDir: string,
  publicDir: string,
  id: string,
  fps: number,
): Promise<NonNullable<Scene["media"]>> {
  let source: string;
  let extension: string;
  if (asset.provider === "local") {
    const root = await realpath(path.join(jobDir, "assets"));
    source = await realpath(path.resolve(jobDir, asset.path));
    if (!source.startsWith(root + path.sep))
      throw new Error(
        "Local media must remain inside this episode's assets directory",
      );
    extension = path.extname(source).toLowerCase();
    const allowed =
      asset.kind === "image"
        ? [".png", ".jpg", ".jpeg", ".webp", ".svg"]
        : [".mp4", ".webm", ".mov"];
    if (!allowed.includes(extension))
      throw new Error("Unsupported local media extension");
  } else {
    extension = asset.kind === "image" ? ".jpg" : ".mp4";
    const key = createHash("sha256")
      .update(JSON.stringify({ url: asset.downloadUrl, kind: asset.kind }))
      .digest("hex");
    source = path.join(ROOT, ".cache", "stock", key + extension);
    await downloadStock(asset.downloadUrl, source, asset.kind, asset.provider);
  }
  const file = id + extension;
  await copyFile(source, path.join(publicDir, file));
  return {
    kind: asset.kind,
    file,
    loopDurationInFrames: asset.duration
      ? Math.max(1, Math.floor(asset.duration * fps))
      : undefined,
  };
}

export function assetCredit(asset: MediaAsset): string {
  return `${asset.creator} — ${asset.sourceUrl} — ${asset.provider === "local" ? asset.license : asset.licenseUrl}`;
}
