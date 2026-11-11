---
name: edicao-video
description: Montar, editar e revisar vídeos do video-factory com Remotion, HyperFrames e Three.js, seguindo o estilo de edição, a identidade visual e o formato definidos em channel/*.prompt.md. Usar para decupagem, motion design, renders 3D, composição, render, revisão em movimento e entrega do vídeo.
---

# Edição de vídeo

A qualidade de acabamento é um padrão do projeto; a linguagem vem do canal. Ler antes de editar:

- `channel/edicao.prompt.md`: linguagem, abertura, mistura de materiais (b-roll, IA, 3D, motion), texto em tela, transições, acabamento.
- `channel/formato.prompt.md` e `identidade-visual.prompt.md`: formato, FPS, resolução, paleta, tipografia, marca.
- `channel/trilha.prompt.md` quando a tarefa incluir som.
- Os materiais do episódio em `channel/videos/<video>/` (`editorial/`, `narracao/`, `producao/`, `assets/`).

Executar só o escopo pedido. Preservar narração e materiais já aprovados.

## Escolher a ferramenta

| Necessidade | Ferramenta |
| --- | --- |
| Sequência simples de mídia + narração + legendas | Renderer genérico `Video` via `video.json` + `npm run video -- prepare/render <video>` |
| Motion design narrativo, timelines complexas, composição React/SVG | Composição Remotion própria em `channel/remotion/` |
| Layout HTML/CSS animado, tipografia cinética, blocos prontos (títulos, gráficos, mapas, transições) | HyperFrames: skills [hyperframes](../hyperframes/SKILL.md), [hyperframes-cli](../hyperframes-cli/SKILL.md), [hyperframes-registry](../hyperframes-registry/SKILL.md) |
| Mecanismos internos, objetos 3D, câmera em volume | Three.js (`three` instalado), dentro de Remotion ou HyperFrames, sincronizado ao frame |
| Música, efeitos, tratamento de imagem, recortes | [media-use](../media-use/SKILL.md) e [trilha-audio](../trilha-audio/SKILL.md) |
| B-roll e imagens de banco/acervo | [broll-busca](../broll-busca/SKILL.md) |
| Imagens geradas por IA | [antigravity-imagens](../antigravity-imagens/SKILL.md) |

Misturar ferramentas é normal: um trecho em HyperFrames ou Three.js pode ser renderizado em MP4 e entrar como asset numa composição Remotion. Sempre respeitar FPS, resolução e identidade do canal, mesmo quando os exemplos das ferramentas usam outros valores.

## Direção e decupagem

Organizar as sequências pelo que o espectador precisa viver: situar, observar, demonstrar, comparar, revelar, concluir. Para cada sequência, anotar em `producao/decupagem.md` a fala, o material visual, a ação, a informação nova e o motivo do próximo corte.

- **Abertura:** conforme o prompt do canal. Sem prompt específico, entrar com a fala e uma ação pertinente desde o primeiro frame, sem vinheta de espera.
- **Motion design:** animar relações e transformações que ajudam a entender. Zoom global numa prancha pronta não substitui uma demonstração.
- **Ritmo:** sustentar o plano enquanto houver o que observar; cortar quando a contribuição acabar. Não impor cortes a cada N segundos.
- **B-roll e arquivo:** escolher pelo gesto, detalhe ou evidência que o trecho precisa. Rever o conteúdo real dos candidatos.
- **Continuidade:** rótulos, números e marcações presos ao objeto durante o movimento.

## Acabamento

Texto em tela orienta ou destaca, com tempo de leitura e sem competir com a legenda. Conferir enquadramento na resolução final e nas áreas seguras do formato. Datas, unidades, escalas e identificadores corretos durante toda a animação. Reconstruções e arte de IA tratadas conforme o canal. Marca-d'água só se o canal pedir. Voz sempre inteligível.

## Implementação e revisão

Ler [Execução e revisão](references/execucao-e-revisao.md) antes de montar a timeline ou renderizar.

1. Medir o áudio real e construir a timeline a partir dele.
2. Implementar: `video.json` para o renderer genérico, ou componente em `channel/remotion/episodes/<video>/` registrado em `channel/remotion/index.tsx`.
3. Renderizar trechos críticos (abertura, explicação complexa, passagens de ritmo) antes do filme inteiro e revisar em movimento, com som.
4. Corrigir e exportar. Revisar o arquivo final: começo, meio, fim, sincronização, picos de áudio e especificações técnicas.
5. Entregar em `channel/videos/<video>/renders/final/` via `publicacao.json` + `npm run video -- package <video>`, preservando versões anteriores em `renders/historico/`. Registrar composição e comandos em `producao/PRODUCAO.md`.

O vídeo está pronto quando a abertura prende, as imagens acrescentam entendimento, os movimentos têm função, o ritmo combina com o canal e não restam falhas de acabamento ou precisão. Não declarar revisão em movimento ou escuta que não aconteceu.
