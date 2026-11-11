import { z } from "zod";
import { channelSchema, videoSchema } from "../src/config";
import { ROOT, writeJson } from "../src/core/io";
import path from "node:path";
import { publicationSchema } from "../src/core/delivery";
await writeJson(
  path.join(ROOT, "schemas/publication.schema.json"),
  z.toJSONSchema(publicationSchema, { target: "draft-2020-12" }),
);
await writeJson(
  path.join(ROOT, "schemas/channel.schema.json"),
  z.toJSONSchema(channelSchema, { target: "draft-2020-12" }),
);
await writeJson(
  path.join(ROOT, "schemas/video.schema.json"),
  z.toJSONSchema(videoSchema, { target: "draft-2020-12" }),
);
console.log(
  "JSON schemas updated. Runtime validation also checks unique IDs and silent-scene duration.",
);
