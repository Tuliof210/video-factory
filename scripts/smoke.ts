import "dotenv/config";
import path from "node:path";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { bundleVideo, renderVideo } from "../src/core/render";
import { ROOT } from "../src/core/io";
import { preview, type VideoProps } from "../src/remotion/types";
const dir = path.join(ROOT, "work", `smoke-${randomUUID()}`);
const publicDir = path.join(dir, "public");
await mkdir(publicDir, { recursive: true });
// Deterministic local fixtures: no channel, keys, stock download or billable synthesis.
await writeFile(
  path.join(publicDir, "image.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#18324f"/><circle cx="320" cy="180" r="120" fill="#fbbf24"/></svg>',
);
const samples = 44100;
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(44100, 24);
wav.writeUInt32LE(88200, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++)
  wav.writeInt16LE(
    Math.round(Math.sin((i * 2 * Math.PI * 440) / 44100) * 1000),
    44 + i * 2,
  );
await writeFile(path.join(publicDir, "audio.wav"), wav);
const props: VideoProps = {
  ...preview,
  width: 640,
  height: 360,
  durationInFrames: 24,
  scenes: [
    {
      id: "smoke",
      title: "Video Builder",
      from: 0,
      durationInFrames: 24,
      audio: "audio.wav",
      media: { kind: "image", file: "image.svg" },
      captions: [{ text: "Local render test", start: 0, end: 1 }],
    },
  ],
};
const first = await bundleVideo(publicDir);
await renderVideo(first, props, path.join(publicDir, "clip.mp4"));
const second = await bundleVideo(publicDir);
const vertical: VideoProps = {
  ...props,
  width: 360,
  height: 640,
  durationInFrames: 48,
  scenes: [
    {
      ...props.scenes[0]!,
      durationInFrames: 48,
      media: { kind: "video", file: "clip.mp4", loopDurationInFrames: 24 },
    },
  ],
};
const output = path.join(dir, "vertical.mp4");
await renderVideo(second, vertical, output);
if ((await stat(output)).size < 1000) throw new Error("Empty smoke output");
console.log(
  `Smoke passed: horizontal image+audio, vertical looping video+audio+captions.\n${dir}`,
);
