# video-factory

Produção de vídeos com agentes de IA, genérica para qualquer canal. O projeto traz skills, CLI e composições base (Remotion, HyperFrames, Three.js, ElevenLabs, Pixabay). Tudo o que é específico do canal (nicho, idioma, voz, persona, formato, estilo de roteiro, visual, edição, trilha, CTA, produtos) você define em `channel/`, a partir do molde `channel-template/`.

## Começar (passo a passo para leigos)

Você vai usar o projeto dentro do **Claude Code** (o agente que lê as skills e roda os comandos). Os comandos abaixo são para colar no Terminal. Tudo aqui é para macOS/Linux; no Windows use WSL.

### 1. Instalar as ferramentas da máquina (uma vez só)

| Ferramenta                                    | Para quê               | Como instalar                                                                         |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| [Node.js 22+](https://nodejs.org)             | roda o projeto         | baixe o instalador LTS no site                                                        |
| [Git](https://git-scm.com)                    | baixa o projeto        | `brew install git` (macOS)                                                            |
| [FFmpeg](https://ffmpeg.org)                  | processa áudio e vídeo | `brew install ffmpeg`                                                                 |
| [Claude Code](https://claude.com/claude-code) | o agente               | `npm install -g @anthropic-ai/claude-code` e depois `claude` para entrar na sua conta |

Sem o Homebrew (macOS), instale-o antes em <https://brew.sh>.

### 2. Instalar o RTK (global, opcional, economiza tokens)

O [RTK](https://github.com/rtk-ai/rtk) encurta a saída dos comandos que o agente roda, gastando menos contexto.

```sh
brew install rtk          # ou: curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk --version             # confere a instalação
rtk init -g               # liga o hook global no Claude Code
rtk gain                  # mostra a economia (se der erro, é outro programa chamado "rtk": desinstale-o)
```

Depois do `rtk init -g`, reinicie o Claude Code. A partir daí `git status` vira `rtk git status` sozinho.

### 3. Instalar o ai-memory (global, opcional, memória entre sessões)

O [ai-memory](https://github.com/akitaonrails/ai-memory) guarda o que foi feito em cada sessão, para o agente retomar de onde parou.

```sh
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory --version       # se não achar o comando: adicione ~/.local/bin ao PATH
ai-memory init            # cria a pasta de dados
```

Se a sua versão tiver o comando `ai-memory setup`, ele faz os passos 3 a 5 de uma vez (mostra o plano e pergunta antes de aplicar). Se não tiver, siga os passos abaixo.

### 4. Rodar o servidor do ai-memory

O servidor precisa estar ligado sempre que você usar o Claude Code. Deixe numa aba do Terminal:

```sh
ai-memory serve --transport http --bind 127.0.0.1:49374
```

Para conferir, em outra aba: `ai-memory status`. Se preferir que ele suba sozinho no login, o `ai-memory setup` (ou a documentação oficial) cria o serviço do sistema.

### 5. Ligar o ai-memory ao Claude Code (MCP e hooks)

Isso é global: vale para todos os projetos.

```sh
claude mcp add --transport http ai-memory http://127.0.0.1:49374/mcp
```

```sh
ai-memory install-hooks --agent claude-code --server-url http://127.0.0.1:49374 --apply
```

O primeiro comando registra as ferramentas de memória (MCP). O segundo grava em `~/.claude/settings.json` os **hooks**: pequenos comandos que o Claude Code dispara em `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact` e `Stop` para capturar a sessão e devolver a pendência da sessão anterior. É seguro repetir (ele troca só as entradas do ai-memory e faz backup antes). Para valer só neste projeto, acrescente `--scope project`.

### 6. Ligar o ai-memory a este projeto (bind)

O vínculo é o arquivo [.ai-memory.toml](.ai-memory.toml), já versionado:

```toml
workspace = "default"
project = "video-factory"
```

Nada a fazer se você clonou este repositório. Para instalar as instruções e skills de memória no `AGENTS.md`, rode na raiz do projeto (idempotente):

```sh
ai-memory install-instructions --target AGENTS.md
```

Confira tudo com `ai-memory doctor` na raiz: `claude-code` deve aparecer com ✓. Mais detalhes em [docs/ai-memory.md](docs/ai-memory.md). Sem ai-memory e sem RTK o projeto funciona do mesmo jeito.

### 7. Baixar e preparar o projeto

```sh
git clone <url-deste-repositorio> video-factory
cd video-factory
npm ci
cp .env.example .env              # abra o .env e cole as chaves ElevenLabs / Pixabay
npm run video -- channel-init     # cria channel/ a partir de channel-template/
```

### 8. Chaves de API e Antigravity

**ElevenLabs (narração, pago).**

1. Crie conta em <https://elevenlabs.io> e escolha um plano (a API consome créditos do plano).
2. Em _Developers → API Keys_, crie uma chave e copie o valor.
3. No `.env`, cole depois do `=`: `ELEVENLABS_API_KEY=sua_chave`.
4. Para testar sem gastar crédito de voz, use `npm run video -- voices` (lista vozes). Só `prepare` gera áudio de verdade.

**Pixabay (b-roll e imagens de banco, grátis).**

1. Crie conta em <https://pixabay.com> e abra <https://pixabay.com/api/docs/>.
2. Logado, a chave aparece na própria página da documentação.
3. No `.env`: `PIXABAY_API_KEY=sua_chave`.
4. Opcional: `PEXELS_API_KEY` (chave em <https://www.pexels.com/api/>) só se você pedir Pexels explicitamente.

Confira o que está configurado com `npm run video -- doctor` (mostra `configured` ou `not configured` para cada chave, sem expor o valor). O `.env` fica fora do git: nunca publique nem cole as chaves em conversas.

**Antigravity (imagens por IA, CLI `agy`).** O agente não gera imagens sozinho: ele escreve o prompt e delega ao `agy`, que tem a ferramenta `generate_image`.

1. Instale o Antigravity pelo site oficial do Google e confirme com `agy --help`.
2. Faça o login você mesmo, uma vez: rode `agy` no Terminal e siga o fluxo de entrada na conta Google. O agente não autentica por você.
3. Confira os modelos disponíveis com `agy models`.
4. A skill [antigravity-imagens](.agents/skills/antigravity-imagens/SKILL.md) cuida do resto: lê o estilo em `channel/imagens-ia.prompt.md` (ou `thumbnail.prompt.md`) e salva as imagens na pasta do episódio.

Sem `agy`, o projeto funciona: só ficam de fora as imagens geradas por IA (b-roll de banco continua valendo). Se quiser memória também nas sessões do `agy`: `ai-memory install-hooks --agent antigravity-cli --apply`.

### 9. Abrir no Claude Code e configurar o canal

```sh
claude
```

Dentro do Claude Code, peça: **"configure meu canal"**. A skill [canal-setup](.agents/skills/canal-setup/SKILL.md) conduz a conversa e preenche os `channel/*.prompt.md`. Para ver o que falta:

```sh
npm run video -- channel-check
```

Depois é só pedir: **"crie um vídeo sobre X"**. O agente responde as perguntas de escopo (incluindo gastos) uma vez e entrega o vídeo pronto.

### Problemas comuns

- `command not found: ai-memory` ou `rtk`: abra um Terminal novo; se persistir, adicione `~/.local/bin` ao `PATH`.
- Hooks do ai-memory dão erro: o servidor (passo 4) não está rodando.
- `npm ci` falha: confira `node --version` (precisa ser 22 ou maior).

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
