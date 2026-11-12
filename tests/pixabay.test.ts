import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { searchStock } from "../src/providers/pixabay";
import { assertStockUrl, downloadStock } from "../src/core/download";

let cacheDir: string;
const photo = {
  id: 123,
  pageURL: "https://pixabay.com/photos/product-123/",
  user: "Photographer",
  user_id: 42,
  imageWidth: 4000,
  imageHeight: 2250,
  largeImageURL: "https://pixabay.com/get/product_1280.jpg",
  fullHDURL: "https://pixabay.com/get/product_1920.jpg",
};
beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), "video-builder-pixabay-"));
  vi.stubEnv("PIXABAY_API_KEY", "test-pixabay-key");
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await rm(cacheDir, { recursive: true, force: true });
});

describe("Pixabay search", () => {
  it("normalizes photos, translates orientation, obeys the minimum page size and reuses the cache without storing the key", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ hits: [photo] })));
    vi.stubGlobal("fetch", fetcher);
    const result = await searchStock(
      "image",
      " coffee   cup ",
      "landscape",
      1,
      cacheDir,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      provider: "pixabay",
      kind: "image",
      id: "123",
      downloadUrl: photo.fullHDURL,
      width: 1920,
      height: 1080,
      sourceUrl: photo.pageURL,
      creator: "Photographer",
      licenseUrl: "https://pixabay.com/service/license-summary/",
    });
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/api/");
    expect(url.searchParams.get("orientation")).toBe("horizontal");
    expect(url.searchParams.get("q")).toBe("coffee cup");
    expect(url.searchParams.get("per_page")).toBe("3");
    expect(
      await searchStock("image", "coffee cup", "landscape", 1, cacheDir),
    ).toEqual(result);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const entries = await readdir(cacheDir);
    expect(entries).toHaveLength(1);
    expect(
      await readFile(path.join(cacheDir, entries[0]!), "utf8"),
    ).not.toContain("test-pixabay-key");
  });

  it("records the 1280px fallback accurately when high-resolution photo access is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ hits: [{ ...photo, fullHDURL: undefined }] }),
          ),
        ),
    );
    const [result] = await searchStock(
      "image",
      "cup",
      "landscape",
      1,
      cacheDir,
    );
    expect(result).toMatchObject({
      downloadUrl: photo.largeImageURL,
      width: 1280,
      height: 720,
    });
  });

  it("selects a Full HD video rendition, filters orientation and ignores unavailable renditions", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: [
            {
              id: 1,
              pageURL: "https://pixabay.com/videos/id-1/",
              user: "Artist",
              user_id: 2,
              duration: 12,
              videos: {
                large: {
                  url: "https://cdn.pixabay.com/video/large.mp4",
                  width: 3840,
                  height: 2160,
                },
                medium: {
                  url: "https://cdn.pixabay.com/video/medium.mp4",
                  width: 1920,
                  height: 1080,
                },
                small: {
                  url: "https://cdn.pixabay.com/video/small.mp4",
                  width: 1280,
                  height: 720,
                },
                unavailable: { url: "", width: 0, height: 0 },
              },
            },
            {
              id: 2,
              pageURL: "https://pixabay.com/videos/id-2/",
              user: "Artist",
              user_id: 2,
              duration: 10,
              videos: {
                medium: {
                  url: "https://cdn.pixabay.com/video/vertical.mp4",
                  width: 1080,
                  height: 1920,
                },
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await searchStock(
      "video",
      "factory",
      "landscape",
      2,
      cacheDir,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "video",
      duration: 12,
      width: 1920,
      height: 1080,
      downloadUrl: "https://cdn.pixabay.com/video/medium.mp4",
    });
    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/api/videos/");
    expect(url.searchParams.has("orientation")).toBe(false);
  });

  it("refreshes an expired 24-hour cache and separates results for another API account", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ hits: [photo] })),
      );
    vi.stubGlobal("fetch", fetcher);
    await searchStock("image", "cup", "landscape", 1, cacheDir);
    const [name] = await readdir(cacheDir);
    const file = path.join(cacheDir, name!);
    const cached = JSON.parse(await readFile(file, "utf8"));
    cached.createdAt = Date.now() - 24 * 60 * 60 * 1000 - 1000;
    await writeFile(file, JSON.stringify(cached));
    await searchStock("image", "cup", "landscape", 1, cacheDir);
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.stubEnv("PIXABAY_API_KEY", "another-test-account");
    await searchStock("image", "cup", "landscape", 1, cacheDir);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects a missing key before HTTP and does not cache or retry an HTTP error", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("PIXABAY_API_KEY", "");
    await expect(
      searchStock("image", "cup", "landscape", 1, cacheDir),
    ).rejects.toThrow("PIXABAY_API_KEY");
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv("PIXABAY_API_KEY", "test-pixabay-key");
    await expect(
      searchStock("image", "cup", "landscape", 1, cacheDir),
    ).rejects.toThrow("HTTP 429");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await readdir(cacheDir)).toEqual([]);
  });

  it("does not expose the request URL or key when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("failed url?key=test-pixabay-key")),
    );
    const error = await searchStock(
      "image",
      "cup",
      "landscape",
      1,
      cacheDir,
    ).catch((value: Error) => value);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("pixabay.com");
    expect((error as Error).message).not.toContain("test-pixabay-key");
  });
});

describe("Pixabay download boundaries", () => {
  it("accepts its media hosts and rejects lookalikes, credentials, nonstandard ports and cross-provider URLs", () => {
    expect(() => assertStockUrl(photo.largeImageURL, "pixabay")).not.toThrow();
    expect(() =>
      assertStockUrl("https://cdn.pixabay.com/video/a.mp4", "pixabay"),
    ).not.toThrow();
    for (const url of [
      "http://cdn.pixabay.com/a",
      "https://cdn.pixabay.com.evil.test/a",
      "https://localhost/a",
      "https://user@pixabay.com/a",
      "https://pixabay.com:444/a",
      "https://videos.pexels.com/a",
    ]) {
      expect(() => assertStockUrl(url, "pixabay")).toThrow();
    }
    expect(() =>
      assertStockUrl("https://cdn.pixabay.com/a", "pexels"),
    ).toThrow();
  });

  it("checks the redirect target before sending another request", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.test/video.mp4" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      downloadStock(
        "https://cdn.pixabay.com/a.mp4",
        path.join(cacheDir, "clip.mp4"),
        "video",
        "pixabay",
      ),
    ).rejects.toThrow("trusted pixabay hosts");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("already selected Pexels assets", () => {
  it("download without PEXELS_API_KEY", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("mp4", { headers: { "content-type": "video/mp4" } }),
        ),
    );
    const out = path.join(cacheDir, "pexels.mp4");
    await downloadStock(
      "https://videos.pexels.com/1.mp4",
      out,
      "video",
      "pexels",
    );
    expect(await readFile(out, "utf8")).toBe("mp4");
  });
});
