import { existsSync } from "node:fs";
import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";
// ponytail: cwd, not import.meta (remotion.config.ts is not ESM); run from the project root.
const ROOT = process.cwd();

/** Resolves `@channel` to channel/remotion/index.tsx, or an empty fallback. */
export const channelAlias: WebpackOverrideFn = (config) => {
  const own = path.join(ROOT, "channel/remotion/index.tsx");
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias as Record<string, string> | undefined),
        "@channel": existsSync(own)
          ? own
          : path.join(ROOT, "src/remotion/no-channel.tsx"),
      },
    },
  };
};
