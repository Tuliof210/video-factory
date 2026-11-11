import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoProps, Scene } from "./types";

type Visual = Omit<NonNullable<Scene["shots"]>[number], "media"> & {
  media?: Scene["media"];
};

function VisualView({
  visual,
  editing,
}: {
  visual: Visual;
  editing: VideoProps["editing"];
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = Math.min(
    1,
    frame / Math.max(1, visual.durationInFrames - 1),
  );
  const scale =
    visual.motion === "slow-zoom"
      ? 1 + progress * (editing.style === "dynamic" ? 0.12 : 0.045)
      : visual.motion === "pan"
        ? 1.06
        : 1;
  const shift =
    visual.motion === "pan"
      ? `${interpolate(progress, [0, 1], [-2, 2])}%`
      : "0%";
  const fade = Math.min(
    Math.round(editing.fadeSeconds * fps),
    Math.floor(visual.durationInFrames / 2),
  );
  const opacity =
    editing.transition === "fade" && fade > 0
      ? Math.min(1, frame / fade, (visual.durationInFrames - 1 - frame) / fade)
      : 1;
  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: visual.fit,
    objectPosition: `${visual.focusX}% ${visual.focusY}%`,
  };
  const trim = Math.round(visual.startFromSeconds * fps);
  const titleOpacity = interpolate(
    frame,
    [
      0,
      10,
      Math.max(11, visual.durationInFrames - 8),
      Math.max(12, visual.durationInFrames - 1),
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      {visual.media && (
        <AbsoluteFill
          style={{ transform: `translateX(${shift}) scale(${scale})` }}
        >
          {visual.media.kind === "image" ? (
            <Img src={staticFile(visual.media.file)} style={mediaStyle} />
          ) : (
            <Loop
              durationInFrames={Math.max(
                1,
                (visual.media.loopDurationInFrames ?? visual.durationInFrames) -
                  trim,
              )}
            >
              <OffthreadVideo
                src={staticFile(visual.media.file)}
                muted
                trimBefore={trim}
                style={mediaStyle}
              />
            </Loop>
          )}
        </AbsoluteFill>
      )}
      {visual.effect === "scan" && (
        <div
          style={{
            position: "absolute",
            top: "18%",
            bottom: "18%",
            left: `${15 + progress * 70}%`,
            width: 3,
            background: "#ef715b",
            boxShadow: "0 0 22px 6px rgba(239,113,91,.45)",
          }}
        />
      )}
      {visual.title && (
        <AbsoluteFill
          style={{
            background: visual.media
              ? "linear-gradient(transparent 38%,rgba(9,19,19,.8))"
              : undefined,
            justifyContent: "flex-end",
            padding: `0 ${width * 0.065}px ${height * 0.22}px`,
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              fontSize: width * 0.034,
              fontWeight: 600,
              lineHeight: 1.14,
              maxWidth: width * 0.72,
              textShadow: "0 2px 18px rgba(0,0,0,.4)",
            }}
          >
            {visual.title}
          </div>
        </AbsoluteFill>
      )}
      {visual.label && (
        <div
          style={{
            position: "absolute",
            right: width * 0.045,
            top: height * 0.045,
            padding: "9px 14px",
            background: "rgba(13,27,26,.76)",
            color: "#eee8dc",
            fontSize: width * 0.0105,
            letterSpacing: ".08em",
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          {visual.label}
        </div>
      )}
    </AbsoluteFill>
  );
}

function SceneView({
  scene,
  editing,
}: {
  scene: Scene;
  editing: VideoProps["editing"];
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const caption = editing.subtitles
    ? scene.captions.find((c) => frame / fps >= c.start && frame / fps < c.end)
    : undefined;
  const visuals: Visual[] = scene.shots ?? [
    {
      from: 0,
      durationInFrames: scene.durationInFrames,
      media: scene.media,
      title: scene.title,
      label: "",
      fit: "cover",
      focusX: 50,
      focusY: 50,
      startFromSeconds: 0,
      motion: editing.imageMotion,
      effect: "none",
    },
  ];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: editing.background,
        color: editing.foreground,
        fontFamily: editing.fontFamily,
      }}
    >
      {visuals.map((visual, index) => (
        <Sequence
          key={index}
          from={visual.from}
          durationInFrames={visual.durationInFrames}
        >
          <VisualView visual={visual} editing={editing} />
        </Sequence>
      ))}
      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: height * 0.065,
            left: "10%",
            width: "80%",
            textAlign: "center",
            fontSize: width * (height > width ? 0.043 : 0.022),
            lineHeight: 1.35,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              backgroundColor: "rgba(9,17,16,.85)",
              padding: "8px 14px",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              textShadow: "0 1px 3px #000",
            }}
          >
            {caption.text}
          </span>
        </div>
      )}
      {scene.audio && <Audio src={staticFile(scene.audio)} />}
    </AbsoluteFill>
  );
}

export const Video: React.FC<VideoProps> = (props) => (
  <AbsoluteFill style={{ background: props.editing.background }}>
    {props.scenes.map((scene) => (
      <Sequence
        key={scene.id}
        from={scene.from}
        durationInFrames={scene.durationInFrames}
      >
        <SceneView scene={scene} editing={props.editing} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
