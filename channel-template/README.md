# Template de canal

Esta pasta é o molde versionado de um canal. Ela não é lida pela produção: a produção lê `channel/`, que fica fora do git.

## Como usar

1. Copie o molde para `channel/`:

   ```bash
   npm run video -- channel-init
   ```

2. Preencha cada `*.prompt.md` em `channel/`. O jeito mais simples é pedir ao agente: "configure meu canal". A skill `canal-setup` conduz a conversa e grava as respostas.
3. Confira o que falta:

   ```bash
   npm run video -- channel-check
   ```

## Arquivos

| Arquivo | Define |
| --- | --- |
| [canal.prompt.md](canal.prompt.md) | Nome, idioma, nicho, subnicho, público, proposta, personalidade e persona |
| [formato.prompt.md](formato.prompt.md) | Vertical/horizontal, resolução, FPS e duração dos vídeos |
| [roteiro.prompt.md](roteiro.prompt.md) | Estilo de roteiro, estrutura, gancho, ritmo e apuração |
| [cta-e-produtos.prompt.md](cta-e-produtos.prompt.md) | Estilo de CTA e produtos/infoprodutos trabalhados |
| [narracao.prompt.md](narracao.prompt.md) | Voz ElevenLabs, interpretação, emoções e pronúncia |
| [identidade-visual.prompt.md](identidade-visual.prompt.md) | Paleta de cores, tipografia e marca |
| [imagens-ia.prompt.md](imagens-ia.prompt.md) | Estilo artístico das imagens geradas por IA |
| [thumbnail.prompt.md](thumbnail.prompt.md) | Padrão de imagem e texto das thumbnails |
| [edicao.prompt.md](edicao.prompt.md) | Estilo de edição: quando usar 3D, IA, b-roll, motion, legendas |
| [trilha.prompt.md](trilha.prompt.md) | Estilo de trilha, efeitos e fontes de áudio livres |
| [publicacao.prompt.md](publicacao.prompt.md) | Títulos, descrição, tags e capítulos |
| [referencias/](referencias/) | Imagens, thumbnails, áudios e links apontados pelos prompts |

## Convenções

- Cada trecho a preencher está marcado com `<!-- PREENCHER: ... -->`. Substitua o comentário pela decisão do canal. `channel-check` lista os que restarem.
- O frontmatter (entre `---`) guarda só os parâmetros que a CLI usa: voz, formato, FPS, cores e permissões de mídia. Chaves com ponto (`video.fps`) formam objetos. Valores aceitam número, `true`/`false`, `null` ou texto.
- Arquivos de referência ficam em `referencias/<tema>/` e são citados pelo prompt correspondente com caminho relativo, por exemplo `referencias/thumbnails/exemplo-01.jpg`.
- Se o canal não usa um recurso (persona, produtos, 3D), escreva isso explicitamente em vez de apagar a seção. "Não usar" também é uma decisão.
- Episódios ficam em `channel/videos/<video>/` e composições Remotion próprias do canal em `channel/remotion/`.
