import { existsSync } from "node:fs";
export function getBrowserExecutable(): string | undefined {
  const configured = process.env.REMOTION_BROWSER_EXECUTABLE?.trim();
  if (configured) {
    if (!existsSync(configured))
      throw new Error("REMOTION_BROWSER_EXECUTABLE does not exist");
    return configured;
  }
  const macChrome =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return process.platform === "darwin" && existsSync(macChrome)
    ? macChrome
    : undefined;
}
