import { z } from "zod";
import { assetSchema, type StockAsset } from "../config";
import { apiKey, requestJson } from "./http";
const photo = z.object({
  id: z.number(),
  url: z.url(),
  width: z.number(),
  height: z.number(),
  photographer: z.string(),
  photographer_url: z.url(),
  src: z.object({ large2x: z.url() }),
});
const clip = z.object({
  id: z.number(),
  url: z.url(),
  duration: z.number(),
  user: z.object({ name: z.string(), url: z.url() }),
  video_files: z.array(
    z.object({
      file_type: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      link: z.url(),
    }),
  ),
});
export async function searchStock(
  kind: "image" | "video",
  query: string,
  orientation: "landscape" | "portrait",
  limit = 10,
): Promise<StockAsset[]> {
  const endpoint = kind === "image" ? "search" : "videos/search";
  const params = new URLSearchParams({
    query,
    orientation,
    per_page: String(limit),
  });
  const data = await requestJson(
    `https://api.pexels.com/v1/${endpoint}?${params}`,
    { headers: { Authorization: apiKey("PEXELS_API_KEY") } },
  );
  const common = {
    provider: "pexels" as const,
    kind,
    licenseUrl: "https://www.pexels.com/license/",
  };
  if (kind === "image")
    return z
      .object({ photos: z.array(photo) })
      .parse(data)
      .photos.map((p) =>
        assetSchema.parse({
          ...common,
          id: String(p.id),
          downloadUrl: p.src.large2x,
          sourceUrl: p.url,
          creator: p.photographer,
          creatorUrl: p.photographer_url,
          width: p.width,
          height: p.height,
        }),
      );
  return z
    .object({ videos: z.array(clip) })
    .parse(data)
    .videos.flatMap((v) => {
      const files = v.video_files
        .filter((f) => f.file_type === "video/mp4" && f.width && f.height)
        .sort(
          (a, b) =>
            Math.abs(Math.max(a.width!, a.height!) - 1920) -
            Math.abs(Math.max(b.width!, b.height!) - 1920),
        );
      const f = files[0];
      return f
        ? [
            assetSchema.parse({
              ...common,
              id: String(v.id),
              downloadUrl: f.link,
              sourceUrl: v.url,
              creator: v.user.name,
              creatorUrl: v.user.url,
              width: f.width,
              height: f.height,
              duration: v.duration,
            }),
          ]
        : [];
    });
}
