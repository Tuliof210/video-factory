# Execução e revisão no video-factory

Caminhos de código e produções citados abaixo são relativos à raiz do projeto. Conferir a implementação instalada antes de reutilizar APIs ou contratos.

## Canal, episódio e composição

As decisões do canal estão em `channel/*.prompt.md`; o frontmatter desses arquivos forma a configuração técnica validada por `src/config.ts` (formato, FPS, voz, cores, mídia). O briefing do episódio pode definir exceções. Não inserir campos arbitrários nos schemas estritos.

O renderer genérico `src/remotion/Video.tsx` suporta mídia, planos cronometrados, títulos, legendas, movimento global e efeito de scan. É uma base técnica: `editing.style` não cria sozinho os movimentos de uma montagem.

Quando a decupagem pedir ações internas, criar componentes e uma composição própria em `channel/remotion/episodes/<video>/` e registrá-la em `channel/remotion/index.tsx` (exporta `ChannelCompositions`). O alias `@channel` inclui essas composições no Studio (`npm run studio`) e no bundle; sem `channel/remotion/index.tsx`, só a composição genérica `Video` existe. Componentes do canal podem importar tipos do projeto por caminho relativo (`../../../../src/core/captions`). Preservar as composições existentes ao registrar outra.

Para HyperFrames, criar o projeto em `channel/videos/<video>/assets/hyperframes/<sequencia>/` e renderizar com `npm run hyperframes -- render` (comandos em `docs/video-tools.md`); o MP4 resultante entra como asset na montagem ou é a entrega final.

## Timeline e voz

- Medir a fala real e usar o alinhamento existente. Para edição visual, reaproveitar os MP3s já aprovados e conferir sua correspondência com o original; hashes são úteis quando houver cópias e remux.
- Converter segundos em frames usando o FPS daquele canal. Não reutilizar constantes de 24fps ou 8.640 frames de outro episódio. Calcular offsets de áudio pela mesma timeline e preservar as pausas internas da interpretação.
- A mudança de plano pode acontecer durante uma locução contínua. Evitar dividir o TTS em requisições para cada corte; isso afeta continuidade e custo sem ser uma necessidade visual.
- Não regenerar voz para corrigir composição, legenda ou trilha. Se texto ou voz precisarem mudar dentro do escopo solicitado, identificar essa mudança e reutilizar o restante do cache.
- Legendas acompanham o áudio e excluem controles de interpretação. Rever tags, nomes, última palavra, sobreposições e offsets depois de remontar blocos.

## Assets e animação

Preservar origem, autoria, licença e contexto de uso. Verificar resolução, foco, orientação, transparência e espaço para câmera. A seleção automática por busca não substitui a inspeção do conteúdo.

Preparar objetos recortados quando a demonstração depender de movê-los separadamente. Inspecionar alpha e bordas. Não sobrepor um segundo objeto simplificado a outro já presente na pintura quando isso gerar duplicação involuntária. Usar anotações ou enquadramentos sobre o detalhe existente, ou preparar uma composição de camadas adequada.

Dirigir animações pelo frame com `useCurrentFrame`, `interpolate`, `spring` ou recursos equivalentes determinísticos. Dar aos rótulos e seus objetos a mesma transformação. Fazer marcadores seguirem a geometria real da curva. Rever velocidades e trajetórias, não apenas poses isoladas.

Validar também a informação visual. Exemplos de atenção: produtos diferentes com IDs distintos, números que correspondem às barras, valores e unidades legíveis, mapas e datas pertinentes, gráficos com escalas e comparações consistentes. Estes são exemplos de coerência, não componentes necessários para todo tema.

## Render e desempenho

Para montagens complexas, partir de Chrome Headless Shell compatível com o Remotion instalado. Em produções anteriores, `ANGLE` foi estável e mais rápido que `swangle`; tratar isso como ponto de partida a medir na máquina atual. Não prometer ausência de erros pelo navegador escolhido nem adotar software GL por suposta segurança sem benchmark.

Renderizar um trecho curto antes do filme inteiro. Se houver lentidão, verificar filtros, blur, sombras, overscan, imagens, memória, decodificação e concorrência. Ajustar a implementação ou o backend preservando o resultado visual. Não encerrar processos alheios para acelerar o render.

Manter entrada, bundle e assets coerentes. Alterar um PNG sob o mesmo nome exige atualizar a mídia preparada e o bundle; props novos com um bundle antigo podem mostrar o asset anterior. Congelar os inputs de cada exportação; uma revisão posterior recebe novo preparo e render.

Scripts de render ou mix de um episódio (em `channel/videos/<video>/producao/`) contêm caminhos e parâmetros daquele filme. Generalizar antes de reaproveitar em outro episódio.

## Revisão em movimento

Conferir uma sequência completa com sua fala e som, em vez de aprovar uma série de thumbnails. Avaliar:

- O que acontece no início e o que faz o espectador continuar?
- O que mudou no entendimento durante a sequência?
- A resposta visual aparece quando a fala precisa dela?
- Os cortes orientam a atenção e respeitam o tempo de leitura ou observação?
- Objetos, textos e marcações permanecem juntos durante o movimento?
- A trilha permite compreender a voz e muda quando a narrativa pede?

Escolher amostras conforme os riscos da montagem. Incluir os momentos de maior complexidade e os de menor movimento, além de começo, meio e fim. Revisar a saída final: o render pode revelar defeitos ausentes no Studio ou nas imagens de referência.

Usar inspeção de metadados e decodificação para conferir resolução, FPS, duração, streams e integridade. Análises de frames podem apontar flashes, mosaicos, quadros uniformes ou retenções, mas um documento parado ou um corte intencional pode produzir sinais semelhantes. Inspecionar candidatos antes de classificar ou corrigir. Não remover frames automaticamente para melhorar uma métrica.

Corrigir defeitos confirmados e rever o trecho resultante. Repetir ou ampliar verificações quando uma alteração, falha ou preocupação concreta justificar; não repetir testes por rotina depois de resolver os problemas.

## Entrega e reprodução

O pacote selecionado fica em `channel/videos/<video>/renders/final/`, com `video.mp4`, `thumbnail.<ext>` e os textos disponíveis: `titulo.txt`, `descricao.txt`, `tags.txt`, `legendas.srt`, `creditos.txt` e `fontes.md`. `publicacao.json`, na raiz do episódio, guarda a seleção e os metadados. `npm run video -- package <video>` monta o pacote e gera `renders/entrega.json` com arquivos, revisões e pendências; itens ausentes não são preenchidos com conteúdo fictício. Guardar instruções em `producao/PRODUCAO.md` e preservar originais e revisões em `renders/historico/`. Respeitar outro destino quando o usuário o indicar.

Registrar a composição usada, como executá-la, os inputs e as revisões efetivamente feitas, para que outra sessão continue sem reconstruir decisões do chat. Preparar o pacote não publica em serviços externos.
