import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { assetSchema, type StockAsset } from "../config";
import { ROOT, writeJson } from "../core/io";
import { apiKey, requestJson } from "./http";

const photoSchema = z.object({
  id: z.number(),
  pageURL: z.url(),
  user: z.string(),
  user_id: z.number(),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
  largeImageURL: z.url(),
  fullHDURL: z.string().optional(),
  imageURL: z.string().optional(),
});
const videoSchema = z.object({
  id: z.number(),
  pageURL: z.url(),
  user: z.string(),
  user_id: z.number(),
  duration: z.number().positive(),
  videos: z.record(
    z.string(),
    z.object({
      url: z.string(),
      width: z.number().nonnegative(),
      height: z.number().nonnegative(),
    }),
  ),
});
const cacheSchema = z.object({
  createdAt: z.number().nonnegative(),
  assets: z.array(assetSchema),
});
const cacheLifetimeMs = 24 * 60 * 60 * 1000;
const accountHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function searchStock(
  kind: "image" | "video",
  query: string,
  orientation: "landscape" | "portrait",
  limit = 10,
  cacheDir = path.join(ROOT, ".cache", "stock-search", "pixabay"),
): Promise<StockAsset[]> {
  const normalizedQuery = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .parse(query.trim().replace(/\s+/g, " "));
  z.number().int().min(1).max(80).parse(limit);
  const key = apiKey("PIXABAY_API_KEY");
  const cacheKey = accountHash(
    JSON.stringify({
      version: 1,
      kind,
      query: normalizedQuery,
      orientation,
      limit,
      account: accountHash(key),
    }),
  );
  const cacheFile = path.join(cacheDir, `${cacheKey}.json`);
  try {
    const cached = cacheSchema.parse(
      JSON.parse(await readFile(cacheFile, "utf8")),
    );
    const age = Date.now() - cached.createdAt;
    if (
      age >= 0 &&
      age < cacheLifetimeMs &&
      cached.assets.every((asset) => asset.provider === "pixabay")
    )
      return cached.assets;
  } catch {
    // Missing or incomplete cache: perform a fresh user-requested search.
  }

  const params = new URLSearchParams({
    key,
    q: normalizedQuery,
    per_page: String(Math.max(3, limit)),
  });
  if (kind === "image") {
    params.set("image_type", "photo");
    params.set(
      "orientation",
      orientation === "landscape" ? "horizontal" : "vertical",
    );
  }
  const data = await requestJson(
    `https://pixabay.com/api/${kind === "video" ? "videos/" : ""}?${params}`,
  );
  const matchesOrientation = (width: number, height: number) =>
    orientation === "landscape" ? width >= height : height >= width;
  const common = (item: {
    id: number;
    pageURL: string;
    user: string;
    user_id: number;
  }) => ({
    provider: "pixabay" as const,
    id: String(item.id),
    kind,
    sourceUrl: item.pageURL,
    creator: item.user,
    creatorUrl: `https://pixabay.com/users/${encodeURIComponent(item.user)}-${item.user_id}/`,
    licenseUrl: "https://pixabay.com/service/license-summary/",
  });
  const assets =
    kind === "image"
      ? z
          .object({ hits: z.array(photoSchema) })
          .parse(data)
          .hits.filter((item) =>
            matchesOrientation(item.imageWidth, item.imageHeight),
          )
          .map((item) => {
            const downloadUrl =
              item.fullHDURL || item.imageURL || item.largeImageURL;
            const maximumSize = item.fullHDURL
              ? 1920
              : item.imageURL
                ? Infinity
                : 1280;
            const ratio = Math.min(
              1,
              maximumSize / Math.max(item.imageWidth, item.imageHeight),
            );
            return assetSchema.parse({
              ...common(item),
              downloadUrl,
              width: Math.max(1, Math.round(item.imageWidth * ratio)),
              height: Math.max(1, Math.round(item.imageHeight * ratio)),
            });
          })
      : z
          .object({ hits: z.array(videoSchema) })
          .parse(data)
          .hits.flatMap((item) => {
            const rendition = Object.values(item.videos)
              .filter(
                (file) =>
                  file.url &&
                  file.width > 0 &&
                  file.height > 0 &&
                  matchesOrientation(file.width, file.height),
              )
              .sort(
                (a, b) =>
                  Math.abs(Math.max(a.width, a.height) - 1920) -
                  Math.abs(Math.max(b.width, b.height) - 1920),
              )[0];
            return rendition
              ? [
                  assetSchema.parse({
                    ...common(item),
                    downloadUrl: rendition.url,
                    width: rendition.width,
                    height: rendition.height,
                    duration: item.duration,
                  }),
                ]
              : [];
          });
  const selected = assets.slice(0, limit);
  await writeJson(cacheFile, { createdAt: Date.now(), assets: selected });
  return selected;
}
