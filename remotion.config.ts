import "dotenv/config";
import { Config } from "@remotion/cli/config";
import { getBrowserExecutable } from "./src/core/browser";
import { channelAlias } from "./src/core/channel-alias";
const executable = getBrowserExecutable();
if (executable) Config.setBrowserExecutable(executable);
Config.overrideWebpackConfig(channelAlias);
