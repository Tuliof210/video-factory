import { createHash, randomUUID } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { slug } from "../config";
import { ROOT } from "./io";

const relativeFile = z
  .string()
  .min(1)
  .refine(
    (file) =>
      !path.isAbsolute(file) &&
      !path.win32.isAbsolute(file) &&
      !file.split(/[\\/]/).includes(".."),
    "Use a file path relative to this episode, without traversal",
  );
const selectedFiles = z
  .object({
    video: relativeFile.nullable().default(null),
    thumbnail: relativeFile.nullable().default(null),
    description: relativeFile.nullable().default(null),
    tags: relativeFile.nullable().default(null),
    captions: relativeFile.nullable().default(null),
    credits: relativeFile.nullable().default(null),
    sources: relativeFile.nullable().default(null),
  })
  .strict();

export const publicationSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(["episode", "demo"]),
    title: z.string().trim().min(1).nullable(),
    titleApprovedByUser: z.boolean(),
    videoRevision: z.string().min(1).nullable(),
    files: selectedFiles,
    tags: z.array(z.string().trim().min(1)).optional(),
    chapters: z
      .array(
        z
          .object({
            time: z.string().regex(/^\d{2,}:\d{2}(?::\d{2})?$/),
            label: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
    notes: z.array(z.string()).optional(),
    variants: z
      .array(
        z
          .object({
            format: z.enum(["horizontal", "vertical"]),
            path: relativeFile,
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.titleApprovedByUser && value.title === null)
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "An approved title cannot be empty",
      });
    const formats = value.variants?.map((variant) => variant.format) ?? [];
    if (new Set(formats).size !== formats.length)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Duplicate format",
      });
  });

export type Publication = z.infer<typeof publicationSchema>;
export type DeliveryFile = { path: string; sha256: string; source: string };
export type DeliveryManifest = {
  schemaVersion: 1;
  videoId: string;
  kind: Publication["kind"];
  videoRevision: string | null;
  titleApprovedByUser: boolean;
  files: Record<string, DeliveryFile>;
  missing: string[];
  pending: string[];
  variants: (DeliveryFile & { format: "horizontal" | "vertical" })[];
  notes: string[];
};

const portable = (file: string) => file.split(path.sep).join("/");
const inside = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
};
async function sha256(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function existing(file: string) {
  try {
    return await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
async function sourceFile(jobDir: string, file: string) {
  const candidate = path.resolve(jobDir, file);
  if (!inside(jobDir, candidate))
    throw new Error(`Source must stay inside this episode: ${file}`);
  const resolved = await realpath(candidate);
  if (!inside(jobDir, resolved) || !(await stat(resolved)).isFile())
    throw new Error(`Source must be a file inside this episode: ${file}`);
  return resolved;
}
async function checkOutputPath(jobDir: string, file: string) {
  let current = jobDir;
  for (const part of path.relative(jobDir, file).split(path.sep)) {
    current = path.join(current, part);
    const info = await existing(current);
    if (info?.isSymbolicLink())
      throw new Error(`Output cannot use a symbolic link: ${current}`);
  }
}
function destination(key: string, source: string) {
  const extension = path.extname(source).toLowerCase();
  switch (key) {
    case "video":
      if (extension !== ".mp4")
        throw new Error("The selected video must be an MP4");
      return "video.mp4";
    case "thumbnail":
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension))
        throw new Error("Thumbnail must be JPG, PNG or WebP");
      return `thumbnail${extension === ".jpeg" ? ".jpg" : extension}`;
    case "description":
      return "descricao.txt";
    case "tags":
      return "tags.txt";
    case "captions":
      return "legendas.srt";
    case "credits":
      return `creditos${extension === ".md" ? ".md" : ".txt"}`;
    case "sources":
      return `fontes${extension === ".txt" ? ".txt" : ".md"}`;
    default:
      throw new Error(`Unknown delivery file: ${key}`);
  }
}

/** Assemble selected artifacts locally. Existing final packages are archived whole. */
export async function packagePublication(
  videoId: string,
  root = ROOT,
): Promise<DeliveryManifest> {
  slug.parse(videoId);
  const jobDir = await realpath(path.join(root, "channel", "videos", videoId));
  const publication = publicationSchema.parse(
    JSON.parse(await readFile(path.join(jobDir, "publicacao.json"), "utf8")),
  );
  const rendersDir = path.join(jobDir, "renders");
  const finalDir = path.join(rendersDir, "final");
  const historyDir = path.join(rendersDir, "historico", "pacotes");
  const manifestPath = path.join(rendersDir, "entrega.json");
  const planned: {
    key: string;
    name: string;
    source: string;
    file?: string;
    content?: string;
    sha256: string;
  }[] = [];
  const addContent = (key: string, name: string, content: string) => {
    planned.push({
      key,
      name,
      source: "publicacao.json",
      content,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  };
  // Resolve and validate every input before touching the current package.
  for (const [key, source] of Object.entries(publication.files)) {
    if (source === null) continue;
    const file = await sourceFile(jobDir, source);
    planned.push({
      key,
      name: destination(key, source),
      source,
      file,
      sha256: await sha256(file),
    });
  }
  if (publication.title !== null)
    addContent("title", "titulo.txt", `${publication.title}\n`);
  if (!publication.files.tags && publication.tags?.length)
    addContent("tags", "tags.txt", `${publication.tags.join(", ")}\n`);
  if (publication.chapters?.length)
    addContent(
      "chapters",
      "capitulos.txt",
      `${publication.chapters.map((chapter) => `${chapter.time} ${chapter.label}`).join("\n")}\n`,
    );
  const variants: DeliveryManifest["variants"] = [];
  for (const variant of publication.variants ?? []) {
    const file = await sourceFile(jobDir, variant.path);
    if (path.extname(file).toLowerCase() !== ".mp4")
      throw new Error("A video variant must be an MP4");
    const hash = await sha256(file);
    const name = `video-${variant.format}.mp4`;
    planned.push({
      key: `variant:${variant.format}`,
      name,
      source: variant.path,
      file,
      sha256: hash,
    });
    variants.push({
      format: variant.format,
      path: `renders/final/${name}`,
      source: variant.path,
      sha256: hash,
    });
  }
  for (const output of [finalDir, historyDir, manifestPath])
    await checkOutputPath(jobDir, output);
  if (await existing(finalDir)) {
    for (const entry of await readdir(finalDir, { withFileTypes: true })) {
      if (!entry.isFile() || entry.isSymbolicLink())
        throw new Error(
          `Final package must contain regular files only: ${entry.name}`,
        );
    }
  }
  const files: DeliveryManifest["files"] = {};
  for (const item of planned.filter((item) => !item.key.startsWith("variant:")))
    files[item.key] = {
      path: `renders/final/${item.name}`,
      sha256: item.sha256,
      source: portable(item.source),
    };
  const missing = [
    "video",
    "thumbnail",
    "title",
    "description",
    "tags",
    "captions",
    "credits",
    "sources",
  ].filter((key) => !files[key]);
  const manifest: DeliveryManifest = {
    schemaVersion: 1,
    videoId,
    kind: publication.kind,
    videoRevision: publication.videoRevision,
    titleApprovedByUser: publication.titleApprovedByUser,
    files,
    missing,
    pending: [
      ...missing.map((key) => `Arquivo ausente: ${key}`),
      ...(!publication.titleApprovedByUser
        ? ["Título sem aprovação registrada."]
        : []),
    ],
    variants,
    notes: publication.notes ?? [],
  };
  const currentNames = await readdir(finalDir).catch(
    (error: NodeJS.ErrnoException): string[] => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const unchanged =
    currentNames.length === planned.length &&
    (
      await Promise.all(
        planned.map(async (item) => {
          if (!currentNames.includes(item.name)) return false;
          return (await sha256(path.join(finalDir, item.name))) === item.sha256;
        }),
      )
    ).every(Boolean);
  await mkdir(rendersDir, { recursive: true });
  if (!unchanged) {
    const staging = path.join(rendersDir, `.package-${randomUUID()}`);
    await mkdir(staging);
    try {
      for (const item of planned) {
        const output = path.join(staging, item.name);
        if (item.file)
          await copyFile(item.file, output, constants.COPYFILE_FICLONE);
        else await writeFile(output, item.content!, { flag: "wx" });
      }
      if (await existing(finalDir)) {
        await mkdir(historyDir, { recursive: true });
        const archive = path.join(
          historyDir,
          `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
        );
        await rename(finalDir, archive);
        if (await existing(manifestPath))
          await copyFile(manifestPath, path.join(archive, "entrega.json"));
      }
      await rename(staging, finalDir);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  } else if (!(await existing(finalDir))) {
    await mkdir(finalDir);
  }
  const temporaryManifest = path.join(
    rendersDir,
    `.entrega-${randomUUID()}.json`,
  );
  await writeFile(temporaryManifest, JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
  });
  await rename(temporaryManifest, manifestPath);
  return manifest;
}
