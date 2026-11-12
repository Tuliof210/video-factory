# Pipeline técnico

Comandos executados da raiz do repositório. Para configuração e navegação, consulte [estrutura do canal](channel-structure.md).

## Ambiente

- Node.js 22 ou superior (Node 24 LTS recomendado; verificação local também executada com Node 25).
- `npm ci` para reinstalar as versões do lockfile.
- No macOS, usa Google Chrome instalado quando disponível; nos demais casos o Remotion baixa seu navegador headless. Para escolher outro executável, use `REMOTION_BROWSER_EXECUTABLE` no `.env`. O fluxo Remotion utiliza seus próprios binários de mídia; HyperFrames requer FFmpeg completo, conforme o [guia de ferramentas](video-tools.md).
- Copie `.env.example` para `.env` e preencha `PIXABAY_API_KEY` e `ELEVENLABS_API_KEY`. `PEXELS_API_KEY` é opcional para buscas nesse outro banco. As credenciais nunca entram no bundle React.

```sh
npm run video -- doctor
npm run studio
npm run check
npm test
npm run smoke
```

`doctor` não exibe valores de chaves nem chama APIs. `smoke` gera fixtures e MP4s em `work/`, sem ler o canal, acessar bancos de mídia ou gastar créditos de voz. O primeiro render pode precisar baixar o Chromium do Remotion.

## Configuração do canal

Os parâmetros técnicos vêm do frontmatter de `channel/*.prompt.md`; a tabela completa de chaves e valores está em [estrutura do canal](channel-structure.md#frontmatter). Os formatos completos estão em `schemas/channel.schema.json` e `schemas/video.schema.json`. As decisões editoriais, visuais, sonoras e de publicação ficam no corpo dos mesmos arquivos, como instruções para os agentes; a CLI não as interpreta.

`dynamic` aumenta a amplitude do zoom; `webdoc` e `minimal` mantêm movimento discreto. Títulos e rótulos de proveniência aparecem somente quando preenchidos. A composição não adiciona nome ou ícone do canal.

Um canal com `voice.voiceId: null` pode guardar sua configuração e seus roteiros. `doctor` e `channel-check` identificam essa pendência. A preparação de um vídeo com narração exige uma voz definida e para antes de criar o build ou chamar as APIs quando ela estiver ausente. As demais opções omitidas seguem os padrões técnicos do schema; isso não define uma identidade visual final para o canal.

## Narração para ElevenLabs v4

A skill local [elevenlabs-v4-narracao](../.agents/skills/elevenlabs-v4-narracao/SKILL.md) transforma um roteiro existente em locução com direção emocional, respeitando o idioma, a voz e o tom definidos em `channel/narracao.prompt.md`. A geração do áudio segue [elevenlabs-v4-audio](../.agents/skills/elevenlabs-v4-audio/SKILL.md). Use `$elevenlabs-v4-narracao` para preparar a narração depois da escrita e revisão do roteiro.

- `narracao/narracao.txt`: texto pronto para enviar à API, com fala e audio tags pertinentes, sem títulos, fontes ou comandos de edição.
- `narracao/narracao-sem-tags.txt`: referência do texto falado, usada para contagem e conferência.
- `narracao/direcao-de-voz.md`: intenções de interpretação, contagens e notas que não devem ser pronunciadas.

O padrão é `eleven_v4` (`voice.modelId` em `channel/narracao.prompt.md`). A integração envia `stability` e `similarity_boost`, preserva as audio tags no texto da requisição e filtra esses controles das legendas sem recalcular os timestamps dos caracteres falados. `speed`, `style` e SSML não são usados para dirigir o v4. O andamento e a emoção são trabalhados no texto; sua qualidade e duração precisam ser confirmadas com uma geração ouvida.

Preparar esses arquivos não gera áudio nem consome créditos de voz. A chamada paga ocorre no `prepare`.

## Roteiro e seleção de mídia

Cada `video.json` possui `schemaVersion`, `title` e `scenes`. Cada cena contém:

- `id`: identificador único em letras minúsculas, números e hífens.
- `title`: texto exibido na cena (pode ser vazio).
- `narration`: texto enviado à ElevenLabs, até 4.500 caracteres por cena, incluindo audio tags. Divida roteiros longos em cenas sem quebrar frases ou deixar controles de interpretação pendurados entre requisições.
- `durationSeconds`: opcional em cenas narradas; obrigatório em cenas silenciosas. Nunca pode ser menor que o áudio.
- `asset`: opcional; registro da busca Pixabay/Pexels, ou mídia local com `provider: "local"`, `path`, `kind`, `creator`, `sourceUrl`, `license`, `width` e `height`. O caminho local é relativo à pasta do vídeo e deve permanecer dentro de `assets/`, inclusive ao resolver links simbólicos. Imagens aceitam PNG, JPEG, WebP e SVG; vídeos aceitam MP4, WebM e MOV e precisam de `duration`.
- `shots`: sequência opcional que substitui `asset`, mantendo uma única locução contínua. Cada plano tem `startAt` em segundos a partir do início da cena e um `asset`. O primeiro começa em zero; os seguintes têm tempos crescentes e terminam no plano seguinte ou no fim medido da cena. A preparação rejeita planos fora da duração.
- Cada plano aceita `title`, `label` (por exemplo, “Reconstrução ilustrada · IA”), `fit` (`cover`/`contain`), `focusX`/`focusY` (0–100), `startFromSeconds` para vídeo, `motion` (`none`/`slow-zoom`/`pan`) e `effect` (`none`/`scan`). Não usar títulos nem rótulos como marca-d'água do canal.

Busque candidatos e selecione manualmente o registro adequado para cada cena:

```sh
npm run video -- stock-search --kind image --query "coffee beans" --orientation landscape --out work/photos.json
npm run video -- stock-search --kind video --query "supermarket" --orientation landscape --out work/clips.json
```

Com `channel/` configurado, a busca usa `media.provider` e respeita `media.bRoll`/`media.stockImages`. `--provider pixabay` ou `--provider pexels` escolhe explicitamente o banco. Sem canal nem provedor, usa Pixabay. Pexels é opcional: só entra com `--provider pexels` ou `media.provider: pexels` e exige `PEXELS_API_KEY`; assets Pexels já registrados no `video.json` baixam e recebem crédito sem a chave. A skill [broll-busca](../.agents/skills/broll-busca/SKILL.md) cobre também acervos públicos.

A busca salva metadados e não baixa os arquivos. Não escolhe automaticamente uma imagem por palavras-chave. Confira relevância, enquadramento, permissões e precisão histórica. O enquadramento padrão é `cover`; planos podem usar `contain` e ajustar o foco. Revise possíveis cortes em rostos e objetos nos formatos de saída.

## Produção

Depois que o canal e o vídeo existirem:

```sh
npm run video -- validate <video>
npm run video -- prepare <video>
npm run video -- render <video>
```

1. `validate` verifica roteiro, configurações e permissões de stock do canal, sem chamadas externas.
2. `prepare` gera narração por cena usando a API com timestamps; mede o MP3 real; calcula os frames; baixa apenas a mídia selecionada; cria legendas e créditos. **Esta etapa pode consumir créditos ElevenLabs.**
3. `render` usa o material local preparado e exporta H.264/AAC em uma nova revisão em `renders/historico/exportacoes/vNNN/`. Com `both`, gera horizontal e vertical. Atualiza a seleção em `publicacao.json` e monta `renders/final/`, com SRT e créditos; registra itens ainda ausentes em `renders/entrega.json`. Uma composição própria pode produzir seus arquivos em `build/` ou no histórico e usar `package` para a entrega.

O vídeo de stock é silenciado e repetido quando mais curto que a cena. A fala nunca é acelerada ou truncada para caber numa duração arbitrária. O fade é visual e não corta o áudio. As legendas são obtidas do alinhamento da ElevenLabs, dispensando Whisper para esta integração; revisão de fala, nomes e timestamps continua necessária.

## Cache, custos e segurança operacional

- Voz em `.cache/speech/`: chave composta por texto, modelo, voz, ajustes e idioma. Uma nova orientação reutiliza o áudio.
- Stock em `.cache/stock/`: chave pela URL e tipo de mídia.
- Buscas Pixabay em `.cache/stock-search/pixabay/`: reutilizadas por 24 horas, separadas por conta e parâmetros, sem guardar a API key no arquivo. O cache é local e ignorado pelo Git.
- Não há retry automático de POST de voz. Uma resposta de erro não dispara outra geração paga.
- Arquivos de áudio já recebidos são persistidos antes dos timestamps. Se o cache ficar incompleto, o processo para e pede restauração ou remoção explícita, em vez de cobrar outra geração silenciosamente.
- `prepare` trava uma produção contra execuções simultâneas; se for interrompido à força, confira o processo antes de remover `build/.prepare.lock`.
- Alterações no roteiro ou nos parâmetros técnicos do canal invalidam o manifesto; execute `prepare` novamente antes de renderizar. Ao editar o conteúdo de um arquivo local, rode `prepare` também para atualizar a cópia de mídia preparada, mesmo quando o caminho continuar igual.
- O render reserva uma nova revisão a cada execução. O empacotamento preserva o pacote anterior em `renders/historico/pacotes/` antes de substituir `renders/final/`.
- Downloads de stock aceitam apenas HTTPS nos hosts confiáveis do provedor do asset, verificam redirects, tipo de mídia e limite de 256 MB.
- Uma trava por hash impede duas gerações simultâneas da mesma fala. Se o processo for encerrado à força, verifique se ainda existe uma geração ativa antes de remover `.cache/speech/<hash>/.generation.lock`.
- Não há geração automática de roteiro, busca na web, publicação em redes sociais ou clonagem de voz neste core. Trilhas e efeitos podem ser finalizados numa etapa de mixagem do episódio.

## Bancos públicos e licenças

Pixabay e Pexels oferecem mídia gratuita sob suas respectivas licenças. Isso não significa domínio público. A configuração `bRoll`/`stockImages` permite ou bloqueia os tipos de mídia; nenhum banco pago foi integrado. Cada API requer sua própria chave e tem quotas.

No Pixabay, fotos Full HD ou originais dependem do acesso da conta. Quando esses URLs não são retornados, a busca usa a imagem disponível de até 1280 pixels, registrando essa resolução. Vídeos usam a versão de resolução mais próxima de Full HD que corresponda à orientação solicitada. O vídeo final continua na resolução do canal; revisar a qualidade das fontes antes da seleção.

Cada produção registra a página original, o autor, a licença e o horário de preparação em `credits.json`, além de `credits.txt` para usar na descrição do vídeo. Os créditos não são publicados automaticamente. A existência de uma licença de stock não garante que determinada imagem represente um acontecimento histórico.

- [API Pixabay](https://pixabay.com/api/docs/)
- [Licença Pixabay](https://pixabay.com/service/license-summary/)
- [API Pexels](https://www.pexels.com/api/documentation/)
- [Licença Pexels](https://www.pexels.com/license/)
- [ElevenLabs: texto para fala com timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- [Remotion: renderMedia](https://www.remotion.dev/docs/renderer/render-media)
- [Licença Remotion](https://www.remotion.dev/license)

## Desenvolvimento

```sh
npm run check
npm test
npm run schemas
npm run smoke
```

Os testes de integração com provedores usam HTTP simulado e não fazem chamadas cobradas. Uma integração real exige suas chaves e ainda precisa de validação na sua conta.
