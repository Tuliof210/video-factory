import React from "react";
import { Composition } from "remotion";
import { ChannelCompositions } from "@channel";
import { Video } from "./Video";
import { preview } from "./types";
export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      width={1920}
      height={1080}
      fps={24}
      durationInFrames={72}
      defaultProps={preview}
      calculateMetadata={({ props }) => ({
        width: props.width,
        height: props.height,
        fps: props.fps,
        durationInFrames: props.durationInFrames,
      })}
    />
    <ChannelCompositions />
  </>
);
