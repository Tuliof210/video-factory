# Estrutura do canal e entregas

Cada clone do video-factory produz para **um** canal. O molde versionado fica em `channel-template/`; o canal preenchido fica em `channel/`, ignorado pelo git. Os caminhos abaixo partem da raiz do repositório.

## Configuração

```sh
npm run video -- channel-init     # copia channel-template/ para channel/ (nunca sobrescreve)
npm run video -- channel-check    # lista PREENCHER restantes e frontmatter inválido
```

O preenchimento acontece por conversa com a skill [canal-setup](../.agents/skills/canal-setup/SKILL.md). Cada `*.prompt.md` é ao mesmo tempo instrução para os agentes (corpo em Markdown) e configuração técnica (frontmatter). O [README do template](../channel-template/README.md) lista os arquivos.

### Frontmatter

A CLI junta o frontmatter de todos os `channel/*.prompt.md` e valida o resultado com `channelSchema` em `src/config.ts` (JSON Schema em [channel.schema.json](../schemas/channel.schema.json)). Formato: uma linha `chave: valor` por parâmetro; chaves com ponto formam objetos; valores são lidos como JSON quando possível (`30`, `true`, `null`, `"#FFFFFF"`) e como texto no resto.

| Chave | Arquivo no template | Valores |
| --- | --- | --- |
| `name`, `language` | `canal.prompt.md` | texto; `pt-BR`, `en`, `es`… |
| `video.format`, `video.fps`, `video.shortSide` | `formato.prompt.md` | `horizontal`/`vertical`/`both`; 1–120; 360–2160 par |
| `voice.provider`, `voice.voiceId`, `voice.modelId`, `voice.stability`, `voice.similarityBoost`, `voice.speed` | `narracao.prompt.md` | `elevenlabs`; ID ou `null`; `eleven_v4`; 0–1; 0–1; 0.7–1.2 |
| `editing.background`, `editing.foreground`, `editing.accent`, `editing.fontFamily` | `identidade-visual.prompt.md` | hex `#RRGGBB`; nome de fonte |
| `editing.style`, `editing.imageMotion`, `editing.transition`, `editing.subtitles` | `edicao.prompt.md` | `webdoc`/`minimal`/`dynamic`; `none`/`slow-zoom`/`pan`; `cut`/`fade`; booleano |
| `media.provider`, `media.bRoll`, `media.stockImages` | `edicao.prompt.md` | `pixabay`/`pexels`; booleano; booleano |

`editing.fadeSeconds`, `editing.narrationTailSeconds` e `editing.notes` são opcionais e podem ser acrescentados em qualquer prompt. Uma chave pode morar em qualquer arquivo; o template só sugere o lugar. Se a mesma chave aparecer em dois arquivos, vale a do arquivo que vem depois em ordem alfabética.

## Pastas do canal

```text
channel/
  *.prompt.md                 decisões do canal (cópia preenchida do template)
  referencias/<tema>/         arquivos citados pelos prompts
  assets/branding/            logo, ícone, banner
  remotion/
    index.tsx                 exporta ChannelCompositions (alias @channel)
    episodes/<video>/         composições Remotion próprias
  videos/<video>/             episódios
```

`channel/remotion/index.tsx` é opcional. Quando existe, o alias `@channel` (em `tsconfig.json`, `remotion.config.ts` e `src/core/render.ts`) registra suas composições no Studio ao lado da composição genérica `Video`. Sem ele, o projeto usa `src/remotion/no-channel.tsx`.

## Arquivos de um vídeo

`npm run video -- video-init <nome> --title "Título de trabalho"` cria `channel/videos/<unixtimestamp>-<nome>/` (o prefixo é o instante da criação, em segundos, e mantém as pastas em ordem cronológica), com a estrutura, um briefing pendente e a seleção inicial de publicação. O comando não inventa roteiro ou cenas. `validate`, `prepare`, `render` e `package` aceitam o nome completo da pasta ou só `<nome>`; se houver dois episódios com o mesmo nome, usar o nome completo.

| Caminho no episódio | Conteúdo |
| --- | --- |
| `README.md` | Entrada e referência da versão atual |
| `editorial/briefing.md` | Pergunta, recorte, duração e decisões |
| `editorial/roteiro.md` | Roteiro editorial |
| `editorial/notas-editoriais.md` | Fontes, ressalvas e apuração |
| `editorial/pesquisa/` | Documentos e pesquisas de títulos |
| `narracao/narracao.txt` | Fala com direção para TTS |
| `narracao/narracao-sem-tags.txt` | Texto falado para conferência |
| `narracao/direcao-de-voz.md` | Notas que não devem ser pronunciadas |
| `video.json` | Cenas executáveis, quando preparadas |
| `producao/` | Decupagem, reprodução e registros de revisão |
| `assets/` | Mídia, prompts, animações e variantes de arte |
| `build/` | Intermediários, mídia preparada e revisões temporárias |
| `publicacao.json` | Seleção das revisões e metadados |
| `renders/final/` | Somente os arquivos atuais para publicar |
| `renders/entrega.json` | Manifesto gerado: caminhos, hashes e pendências |
| `renders/historico/` | Originais e revisões anteriores |

## Pacote de publicação

Selecionar arquivos em `publicacao.json`, usando caminhos relativos ao episódio, e executar `npm run video -- package <video>`. O contrato está em [publication.schema.json](../schemas/publication.schema.json).

```json
{
  "schemaVersion": 1,
  "kind": "episode",
  "title": "Título selecionado",
  "titleApprovedByUser": false,
  "videoRevision": "v1",
  "files": {
    "video": "build/v1/filme.mp4",
    "thumbnail": "assets/thumbnails/opcao-2.jpg",
    "description": "editorial/descricao.txt",
    "tags": null,
    "captions": "build/v1/legendas.srt",
    "credits": "producao/creditos.md",
    "sources": "editorial/notas-editoriais.md"
  },
  "tags": ["assunto específico"],
  "notes": ["Thumbnail selecionada: opção 2. Aprovação ainda não registrada."]
}
```

Os nomes finais são `video.mp4`, `thumbnail.jpg` ou extensão original, `titulo.txt`, `descricao.txt`, `tags.txt`, `legendas.srt`, `creditos.txt`/`.md` e `fontes.txt`/`.md`. Capítulos disponíveis geram `capitulos.txt`. Variantes adicionais podem gerar `video-horizontal.mp4` e `video-vertical.mp4`.

O empacotamento valida os arquivos selecionados antes de alterar a entrega, copia os materiais e gera hashes SHA-256. Ao mudar os arquivos finais, preserva o pacote anterior em `renders/historico/pacotes/<data-id>/`. Ausências ficam como `null` na seleção e como pendências no manifesto; não criar placeholders. Título de trabalho e número de revisão não implicam aprovação. `kind: "demo"` distingue uma demonstração técnica de um episódio.

`render` reserva exportações em `renders/historico/exportacoes/vNNN/`, atualiza vídeo, legendas e créditos da seleção e monta o pacote. `package` também serve a composições próprias Remotion ou HyperFrames.

## Versionamento

O repositório versiona só o que é genérico: código, skills, docs, schemas e `channel-template/`. Tudo em `channel/` (prompts preenchidos, referências, episódios, composições próprias) fica local. Para versionar o próprio canal, use um repositório separado dentro de `channel/` ou faça backup dessa pasta.
