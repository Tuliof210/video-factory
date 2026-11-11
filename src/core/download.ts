import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import type { StockProvider } from "../config";
export function assertStockUrl(
  value: string,
  provider: StockProvider = "pexels",
) {
  const url = new URL(value);
  const allowedHost =
    provider === "pixabay"
      ? url.hostname === "pixabay.com" || url.hostname === "cdn.pixabay.com"
      : url.hostname === "pexels.com" || url.hostname.endsWith(".pexels.com");
  if (
    url.protocol !== "https:" ||
    !allowedHost ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new Error(
      `Stock downloads must use HTTPS on trusted ${provider} hosts`,
    );
}
export async function downloadStock(
  url: string,
  destination: string,
  kind: "image" | "video",
  provider: StockProvider = "pexels",
) {
  assertStockUrl(url, provider);
  try {
    if ((await stat(destination)).size > 0) return;
  } catch {
    /* cache miss */
  }
  await mkdir(path.dirname(destination), { recursive: true });
  let current = url;
  let response: Response | undefined;
  for (let i = 0; i < 5; i++) {
    assertStockUrl(current, provider);
    response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      await response.body?.cancel();
      if (!next) throw new Error("Stock redirect has no location");
      current = new URL(next, current).href;
      continue;
    }
    break;
  }
  if (!response?.ok || !response.body)
    throw new Error(`Stock download failed: HTTP ${response?.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith(kind === "image" ? "image/" : "video/")) {
    await response.body.cancel();
    throw new Error("Unexpected stock media type");
  }
  const temp = destination + "." + randomUUID() + ".tmp";
  let bytes = 0;
  try {
    await pipeline(
      Readable.fromWeb(response.body as never),
      new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          callback(
            bytes > 256 * 1024 * 1024
              ? new Error("Stock file exceeds 256 MB")
              : null,
            chunk,
          );
        },
      }),
      createWriteStream(temp, { flags: "wx" }),
    );
    if (!bytes) throw new Error("Empty stock media");
    await rename(temp, destination);
  } finally {
    await rm(temp, { force: true });
  }
}
