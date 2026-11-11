import path from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { slug } from "../config";
import { ROOT, writeJson } from "./io";
import type { Publication } from "./delivery";

export async function initVideo(
  name: string,
  title: string,
  root = ROOT,
  now = Date.now(),
) {
  slug.parse(name);
  if (!title.trim()) throw new Error("Video title cannot be empty.");
  const channelDir = path.join(root, "channel");
  await access(channelDir).catch(() => {
    throw new Error(
      "Channel not found. Run `npm run video -- channel-init` first.",
    );
  });
  const videosDir = path.join(channelDir, "videos");
  await mkdir(videosDir, { recursive: true });
  // Prefix with creation time so folders sort chronologically.
  const videoId = `${Math.floor(now / 1000)}-${name}`;
  const jobDir = path.join(videosDir, videoId);
  await mkdir(jobDir);
  for (const folder of [
    "editorial/pesquisa",
    "narracao",
    "producao",
    "assets",
    "build",
    "renders/final",
    "renders/historico",
  ])
    await mkdir(path.join(jobDir, folder), { recursive: true });
  const publication: Publication = {
    schemaVersion: 1,
    kind: "episode",
    title: title.trim(),
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
    notes: [
      "Título de trabalho. Definir briefing e produzir os materiais antes de selecionar a entrega.",
    ],
  };
  await writeJson(path.join(jobDir, "publicacao.json"), publication);
  await writeFile(
    path.join(jobDir, "editorial/briefing.md"),
    `# ${title.trim()}\n\nRegistrar aqui as decisões da conversa sobre este episódio: pergunta, recorte, público, duração, fontes e materiais aprovados. As definições do canal estão nos arquivos channel/*.prompt.md.\n\nStatus: briefing pendente.\n`,
  );
  await writeFile(
    path.join(jobDir, "README.md"),
    `# ${title.trim()}\n\n- [Briefing](editorial/briefing.md) · [Roteiro e pesquisa](editorial/)\n- [Locução](narracao/) · [Produção](producao/) · [Assets](assets/)\n- [Seleção de publicação](publicacao.json)\n- [Arquivos para publicar](renders/final/) · [Histórico](renders/historico/)\n\nCriar video.json na raiz quando houver roteiro convertido para cenas. O título em publicacao.json começa como proposta, sem aprovação registrada. Após selecionar os materiais, executar \`npm run video -- package ${videoId}\` da raiz para montar o pacote e registrar pendências em renders/entrega.json.\n`,
  );
  return jobDir;
}
