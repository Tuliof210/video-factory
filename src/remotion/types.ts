import type { Channel } from "../config";
import type { Caption } from "../core/captions";
export type Scene = {
  id: string;
  title: string;
  from: number;
  durationInFrames: number;
  audio?: string;
  media?: {
    kind: "image" | "video";
    file: string;
    loopDurationInFrames?: number;
  };
  captions: Caption[];
  shots?: {
    from: number;
    durationInFrames: number;
    media: NonNullable<Scene["media"]>;
    title: string;
    label: string;
    fit: "cover" | "contain";
    focusX: number;
    focusY: number;
    startFromSeconds: number;
    motion: "none" | "slow-zoom" | "pan";
    effect: "none" | "scan";
  }[];
};
export type VideoProps = {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  editing: Channel["editing"];
  scenes: Scene[];
};
export const preview: VideoProps = {
  title: "Video Builder",
  fps: 24,
  width: 1920,
  height: 1080,
  durationInFrames: 72,
  editing: {
    style: "webdoc",
    notes: "",
    background: "#111827",
    foreground: "#f9fafb",
    accent: "#fbbf24",
    fontFamily: "Arial",
    imageMotion: "slow-zoom",
    transition: "fade",
    fadeSeconds: 0.25,
    narrationTailSeconds: 0.4,
    subtitles: true,
  },
  scenes: [
    {
      id: "preview",
      title: "Video Builder",
      from: 0,
      durationInFrames: 72,
      captions: [],
    },
  ],
};
