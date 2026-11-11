import path from "node:path";
import { getBrowserExecutable } from "./browser";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { ROOT } from "./io";
import { channelAlias } from "./channel-alias";
import type { VideoProps } from "../remotion/types";
export async function bundleVideo(publicDir: string) {
  return bundle({
    entryPoint: path.join(ROOT, "src/remotion/index.ts"),
    publicDir,
    webpackOverride: channelAlias,
  });
}
export async function renderVideo(
  serveUrl: string,
  props: VideoProps,
  outputLocation: string,
) {
  const browserExecutable = getBrowserExecutable();
  const composition = await selectComposition({
    browserExecutable,
    serveUrl,
    id: "Video",
    inputProps: props,
  });
  await renderMedia({
    browserExecutable,
    serveUrl,
    composition,
    inputProps: props,
    codec: "h264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    outputLocation,
    concurrency: 2,
    overwrite: false,
  });
}
