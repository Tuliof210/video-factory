# video-factory

Produção de vídeos com agentes de IA, genérica para qualquer canal. O projeto traz skills, CLI e composições base (Remotion, HyperFrames, Three.js, ElevenLabs, Pixabay). Tudo o que é específico do canal (nicho, idioma, voz, persona, formato, estilo de roteiro, visual, edição, trilha, CTA, produtos) você define em `channel/`, a partir do molde `channel-template/`.

## Começar

```sh
npm ci
cp .env.example .env              # chaves ElevenLabs / Pixabay
npm run video -- channel-init     # cria channel/ a partir de channel-template/
```

Depois peça ao agente: **"configure meu canal"**. A skill [canal-setup](.agents/skills/canal-setup/SKILL.md) conduz a conversa e preenche os `channel/*.prompt.md`. Para ver o que falta:

```sh
npm run video -- channel-check
```

## Organização

```text
channel-template/        molde versionado: *.prompt.md + referencias/
channel/                 seu canal (gitignored): prompts preenchidos, referências,
                         composições próprias (remotion/) e episódios (videos/)
.agents/skills/          skills agnósticas de canal
src/                     CLI, pipeline e composição genérica Remotion
schemas/                 contratos JSON
docs/                    guias
```

`.claude/` é um link para `.agents/`, então Claude Code e Codex enxergam as mesmas skills.

## Skills

| Tarefa                                    | Skill                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Setup do canal                            | [canal-setup](.agents/skills/canal-setup/SKILL.md)                       |
| Memória entre sessões                     | [ai-memory-*](docs/ai-memory.md)                                         |
| Revisar roteiros (tirar cara de IA)       | [humanizer](.agents/skills/humanizer/SKILL.md)                           |
| Roteiro → texto ElevenLabs v4 com emoções | [elevenlabs-v4-narracao](.agents/skills/elevenlabs-v4-narracao/SKILL.md) |
| Gerar narração ElevenLabs v4              | [elevenlabs-v4-audio](.agents/skills/elevenlabs-v4-audio/SKILL.md)       |
| Imagens por IA (subagente Antigravity)    | [antigravity-imagens](.agents/skills/antigravity-imagens/SKILL.md)       |
| Buscar b-roll                             | [broll-busca](.agents/skills/broll-busca/SKILL.md)                       |
| Trilha e efeitos                          | [trilha-audio](.agents/skills/trilha-audio/SKILL.md)                     |
| Edição (Remotion, HyperFrames, Three.js)  | [edicao-video](.agents/skills/edicao-video/SKILL.md)                     |

Catálogo completo: [.agents/skills/README.md](.agents/skills/README.md).

## Produzir um vídeo

```sh
npm run video -- video-init meu-video --title "Título de trabalho"  # cria channel/videos/<unixtimestamp>-meu-video/
npm run video -- validate meu-video     # sem custo
npm run video -- prepare meu-video      # gera narração (ElevenLabs, pago) e baixa mídia
npm run video -- render meu-video
npm run video -- package meu-video      # monta renders/final/
npm run studio                          # Remotion Studio
```

Na prática você conduz pelo agente ("escreva o roteiro de X", "prepare a narração", "monte o vídeo") e ele usa esses comandos. Detalhes: [estrutura do canal](docs/channel-structure.md), [pipeline e APIs](docs/production-pipeline.md), [HyperFrames e Three.js](docs/video-tools.md).

## Desenvolvimento

```sh
npm run check
npm test
npm run schemas
npm run smoke
```

Os testes de provedores usam HTTP simulado. O smoke renderiza fixtures em `work/`, sem créditos de voz.
