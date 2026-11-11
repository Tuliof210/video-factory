# Skills do video-factory

Todas as skills são agnósticas de canal. As decisões do canal (nicho, voz, estilo, formato…) ficam em `channel/*.prompt.md`, e cada skill lê o prompt correspondente antes de agir. Nenhuma skill carrega identidade de um canal específico.

| Tarefa | Skill | Lê do canal |
| --- | --- | --- |
| Criar e configurar o canal | [canal-setup](canal-setup/SKILL.md) | todos os `*.prompt.md` |
| Memória entre sessões | `ai-memory-*` ([retrieval](ai-memory-retrieval/SKILL.md), [handoff](ai-memory-handoff/SKILL.md), [durable-pages](ai-memory-durable-pages/SKILL.md), [learning-maintenance](ai-memory-learning-maintenance/SKILL.md), [messaging](ai-memory-messaging/SKILL.md), [routing-install](ai-memory-routing-install/SKILL.md)) | — |
| Revisar roteiros e textos | [humanizer](humanizer/SKILL.md) | `roteiro.prompt.md`, `canal.prompt.md` |
| Roteiro → texto ElevenLabs v4 com emoções | [elevenlabs-v4-narracao](elevenlabs-v4-narracao/SKILL.md) | `narracao.prompt.md` |
| Gerar a narração (áudio) | [elevenlabs-v4-audio](elevenlabs-v4-audio/SKILL.md) | `narracao.prompt.md` |
| Imagens por IA via subagente Antigravity | [antigravity-imagens](antigravity-imagens/SKILL.md) | `imagens-ia.prompt.md`, `thumbnail.prompt.md` |
| Buscar b-roll e acervo | [broll-busca](broll-busca/SKILL.md) | `edicao.prompt.md` |
| Trilha, efeitos e mixagem | [trilha-audio](trilha-audio/SKILL.md) | `trilha.prompt.md` |
| Edição: Remotion, HyperFrames, Three.js | [edicao-video](edicao-video/SKILL.md) | `edicao.prompt.md`, `formato.prompt.md`, `identidade-visual.prompt.md` |

Ferramentas de apoio usadas pelas skills acima:

| Ferramenta | Skill |
| --- | --- |
| Composição HTML para vídeo | [hyperframes](hyperframes/SKILL.md) |
| Comandos, prévia e render HTML | [hyperframes-cli](hyperframes-cli/SKILL.md) |
| Blocos e componentes HTML | [hyperframes-registry](hyperframes-registry/SKILL.md) |
| Obtenção e tratamento de mídia, música e SFX | [media-use](media-use/SKILL.md) |

Roteiro, títulos, thumbnails e publicação não têm skill própria: o agente segue o prompt do canal (`roteiro.prompt.md`, `publicacao.prompt.md`, `thumbnail.prompt.md`) e revisa o texto com o humanizer.

As skills `ai-memory-*`, `hyperframes*` e `media-use` são mantidas pelas respectivas integrações; `humanizer` é uma cópia da skill MIT de Siqi Chen (ver `humanizer/LICENSE`). Cada skill tem seu próprio `SKILL.md`, com `references/`, `scripts/` e `agents/` só quando necessários.
