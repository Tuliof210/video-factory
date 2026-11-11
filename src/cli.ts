import "dotenv/config";
import { Command, InvalidArgumentError } from "commander";
import path from "node:path";
import { readFile, mkdir, access, copyFile } from "node:fs/promises";
import { z } from "zod";
import { ROOT, jobPaths, writeJson } from "./core/io";
import { stockProviderSchema } from "./config";
import {
  loadJob,
  prepare,
  inputHash,
  type BuildManifest,
} from "./core/prepare";
import { bundleVideo, renderVideo } from "./core/render";
import { searchStock, stockCredits } from "./providers/stock";
import { listVoices } from "./providers/elevenlabs";
import { initChannel, checkChannel, loadChannel } from "./core/channel";
import { initVideo } from "./core/video-setup";
import {
  packagePublication,
  publicationSchema,
  type Publication,
} from "./core/delivery";
const program = new Command()
  .name("video-factory")
  .description(
    "Video production driven by channel/*.prompt.md, with Remotion, ElevenLabs, Pixabay and Pexels",
  );
program
  .command("doctor")
  .description("Inspect environment without making API calls")
  .action(async () => {
    console.log(`Project: ${ROOT}\nNode: ${process.version}`);
    for (const key of [
      "ELEVENLABS_API_KEY",
      "PIXABAY_API_KEY",
      "PEXELS_API_KEY",
    ])
      console.log(
        `${key}: ${process.env[key]?.trim() ? "configured" : "not configured"}`,
      );
    const report = await checkChannel();
    console.log(
      `Channel: ${report.ready ? "ready" : `${report.pending.length} pending items (use channel-check)`}`,
    );
  });
program
  .command("channel-init")
  .description("Copy channel-template/ to channel/ (never overwrites)")
  .action(async () => {
    console.log(
      `Created: ${await initChannel()}\nFill channel/*.prompt.md (or ask the agent to run canal-setup).`,
    );
  });
program
  .command("channel-check")
  .description(
    "List unfilled prompts and invalid frontmatter settings without API calls",
  )
  .action(async () => {
    const report = await checkChannel();
    console.log(
      report.ready
        ? "Channel setup complete."
        : report.pending.map((item) => `- ${item}`).join("\n"),
    );
    if (!report.ready) process.exitCode = 1;
  });
program
  .command("video-init")
  .argument("<video>")
  .requiredOption("--title <title>")
  .description(
    "Create the standard episode folders and a draft publication selection",
  )
  .action(async (video, options) => {
    console.log(`Created: ${await initVideo(video, options.title)}`);
  });
program
  .command("package")
  .argument("<video>")
  .description(
    "Assemble the selected publication files locally, preserving previous packages",
  )
  .action(async (video) => {
    const delivery = await packagePublication(video);
    console.log(
      `Package: ${path.relative(ROOT, jobPaths(video).jobDir)}/renders/final/`,
    );
    for (const item of delivery.pending) console.log(`- ${item}`);
  });
program
  .command("validate")
  .argument("<video>")
  .action(async (video) => {
    await loadJob(video);
    console.log("Valid channel, video and media settings.");
  });
program
  .command("voices")
  .description("List the first 100 available ElevenLabs voices")
  .action(async () => console.log(JSON.stringify(await listVoices(), null, 2)));
program
  .command("stock-search")
  .option(
    "--provider <provider>",
    "pixabay or pexels; defaults to the channel's media.provider",
  )
  .requiredOption("--kind <kind>", "image or video")
  .requiredOption("--query <query>")
  .option("--orientation <orientation>", "landscape or portrait", "landscape")
  .option("--limit <number>", "1–80", "10")
  .requiredOption(
    "--out <file>",
    "Save candidate assets as JSON; review before selecting",
  )
  .action(async (options) => {
    const kind = z.enum(["image", "video"]).parse(options.kind);
    const orientation = z
      .enum(["landscape", "portrait"])
      .parse(options.orientation);
    const limit = z.coerce.number().int().min(1).max(80).parse(options.limit);
    const channel = await loadChannel().catch(() => undefined);
    const provider = stockProviderSchema.parse(
      options.provider ?? channel?.media.provider ?? "pexels",
    );
    if (
      channel &&
      !(kind === "video" ? channel.media.bRoll : channel.media.stockImages)
    )
      throw new InvalidArgumentError(
        `Stock ${kind} is disabled for this channel.`,
      );
    const out = path.resolve(options.out);
    await access(out).then(
      () => {
        throw new InvalidArgumentError(
          "Output already exists; choose another path.",
        );
      },
      () => {},
    );
    await writeJson(
      out,
      await searchStock(provider, kind, options.query, orientation, limit),
    );
    console.log(`Saved candidates: ${out}\n${stockCredits[provider]}`);
  });
program
  .command("prepare")
  .argument("<video>")
  .description(
    "Generate/cache narration, download selected stock and build captions (ElevenLabs usage is billable)",
  )
  .action(async (video) => {
    const manifest = await prepare(video);
    console.log(
      `Ready: ${manifest.durationSeconds.toFixed(2)} seconds, ${manifest.variants.length} format(s).`,
    );
  });
program
  .command("render")
  .argument("<video>")
  .description("Render the prepared job without calling paid APIs")
  .action(async (video) => {
    const job = await loadJob(video);
    const manifest = JSON.parse(
      await readFile(path.join(job.buildDir, "manifest.json"), "utf8"),
    ) as BuildManifest;
    if (
      manifest.schemaVersion !== 1 ||
      manifest.inputHash !== inputHash(job.channel, job.job)
    )
      throw new Error(
        "Build is stale. Run prepare after changing the channel or video.",
      );
    // Each export reserves a fresh directory, so no previous render is replaced.
    const exportsDir = path.join(job.rendersDir, "historico", "exportacoes");
    await mkdir(exportsDir, { recursive: true });
    let revision = 1;
    let exportDir: string;
    while (true) {
      exportDir = path.join(
        exportsDir,
        `v${String(revision).padStart(3, "0")}`,
      );
      try {
        await mkdir(exportDir);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        revision++;
      }
    }
    const outputs = manifest.variants.map((v) =>
      path.join(exportDir, `video-${v.format}.mp4`),
    );
    for (const output of outputs)
      await access(output).then(
        () => {
          throw new Error(
            `Output exists: ${output}. Move it before rendering again.`,
          );
        },
        () => {},
      );
    const serveUrl = await bundleVideo(manifest.publicDir);
    for (const [i, v] of manifest.variants.entries()) {
      await renderVideo(serveUrl, v.props, outputs[i]!);
      console.log(`Rendered: ${outputs[i]}`);
    }
    for (const name of ["captions.srt", "credits.json", "credits.txt"])
      await copyFile(path.join(job.buildDir, name), path.join(exportDir, name));
    const publicationPath = path.join(job.jobDir, "publicacao.json");
    let publication: Publication;
    try {
      publication = publicationSchema.parse(
        JSON.parse(await readFile(publicationPath, "utf8")),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      publication = {
        schemaVersion: 1,
        kind: "episode",
        title: job.job.title,
        titleApprovedByUser: false,
        videoRevision: null,
        files: {
          video: null,
          thumbnail: null,
          description: null,
          tags: null,
          captions: null,
          credits: null,
          sources: null,
        },
      };
    }
    const local = (file: string) =>
      path.relative(job.jobDir, file).split(path.sep).join("/");
    publication.videoRevision = `exportacao-v${String(revision).padStart(3, "0")}`;
    publication.files.video = local(outputs[0]!);
    publication.files.captions = local(path.join(exportDir, "captions.srt"));
    publication.files.credits = local(path.join(exportDir, "credits.txt"));
    publication.variants = manifest.variants.slice(1).map((variant, index) => ({
      format: variant.format,
      path: local(outputs[index + 1]!),
    }));
    await writeJson(publicationPath, publication);
    const delivery = await packagePublication(video);
    console.log(
      `Package: ${path.join(job.rendersDir, "final")}\n${delivery.pending.join("\n")}`,
    );
  });
program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown failure");
  process.exitCode = 1;
});
