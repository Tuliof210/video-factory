---
name: canal-setup
description: Configurar ou revisar o canal do video-factory, copiando channel-template/ para channel/ e preenchendo os arquivos *.prompt.md por conversa (nicho, idioma, formato, voz, persona, roteiro, CTA, produtos, visual, thumbnails, edição, trilha, publicação). Usar quando o usuário pedir para criar, configurar, ajustar ou conferir o canal.
---

# Configuração do canal

O canal inteiro vive em `channel/` (fora do git). Cada `*.prompt.md` cobre um tema; o frontmatter guarda só os parâmetros que a CLI lê. O molde versionado é `channel-template/`, e o [README do template](../../../channel-template/README.md) lista os arquivos e convenções.

## Fluxo

1. Se `channel/` não existir, executar `npm run video -- channel-init`. O comando nunca sobrescreve um canal existente.
2. Executar `npm run video -- channel-check` para ver o que falta. Cada linha aponta arquivo e linha com `PREENCHER` ou frontmatter inválido.
3. Conduzir a conversa por blocos, na ordem abaixo, agrupando perguntas. Oferecer 2 ou 3 sugestões concretas quando o usuário não souber responder, coerentes com o que já foi decidido.
4. Gravar cada resposta no arquivo certo, substituindo o comentário `<!-- PREENCHER: ... -->` pela decisão escrita como instrução para um agente ("Usar...", "Nunca..."). Não apagar seções: se o canal não usa um recurso, escrever isso.
5. Repetir `channel-check` até ficar só o que o usuário decidiu deixar para depois.

| Bloco | Arquivo | Frontmatter |
| --- | --- | --- |
| Identidade, nicho, subnicho, público, personalidade, persona | `canal.prompt.md` | `name`, `language` |
| Plataforma, vertical/horizontal, duração | `formato.prompt.md` | `video.format`, `video.fps`, `video.shortSide` |
| Estilo de roteiro | `roteiro.prompt.md` | — |
| CTA, produtos e infoprodutos | `cta-e-produtos.prompt.md` | — |
| Voz e interpretação | `narracao.prompt.md` | `voice.*` |
| Paleta, tipografia, marca | `identidade-visual.prompt.md` | `editing.background/foreground/accent/fontFamily` |
| Estilo das imagens de IA | `imagens-ia.prompt.md` | — |
| Thumbnails | `thumbnail.prompt.md` | — |
| Edição: 3D, IA, b-roll, motion, legendas | `edicao.prompt.md` | `media.*`, `editing.*` |
| Trilha e efeitos | `trilha.prompt.md` | — |
| Títulos, descrição, tags | `publicacao.prompt.md` | — |

## Regras

- Frontmatter é `chave: valor` em uma linha. Chaves com ponto formam objetos. Hex entre aspas (`"#1E1B18"`). Valores válidos estão no comentário logo abaixo do frontmatter de cada arquivo e em `src/config.ts`.
- `voice.voiceId` fica `null` até a voz ser escolhida. Para listar vozes: `npm run video -- voices` (requer `ELEVENLABS_API_KEY`; não gera custo). Não inventar IDs.
- Manter as cores do frontmatter iguais às da paleta escrita no corpo.
- Referências (imagens, thumbnails, áudios, links) vão para `channel/referencias/<tema>/` e precisam ser citadas no prompt com o que ensinam.
- Logo, ícone e banner ficam em `channel/assets/branding/`. Gerar imagens só com pedido explícito, via [antigravity-imagens](../antigravity-imagens/SKILL.md).
- Não copiar identidade, voz ou textos de outro canal. Canais de referência informam ritmo e estrutura, não marca.
- Preparar o canal não gera mídia paga nem publica nada.

Para criar episódios depois do setup: `npm run video -- video-init <video> --title "Título"`. A estrutura do episódio está em [docs/channel-structure.md](../../../docs/channel-structure.md).
