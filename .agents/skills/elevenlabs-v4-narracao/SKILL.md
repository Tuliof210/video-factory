---
name: elevenlabs-v4-narracao
description: "Converter um roteiro existente em narração pronta para a API ElevenLabs v4, com oralidade, direção emocional e audio tags adequadas à voz e ao conteúdo. Use para preparar ou revisar o texto de locução; gerar áudio é uma etapa separada."
---

# Narração para ElevenLabs v4

Transformar o roteiro recebido em uma interpretação escrita para `eleven_v4`. A entrega é texto pronto para enviar à API, preservando o conteúdo e escolhendo como ele deve soar. No video-factory, este é o modelo padrão.

Narração limpa contém a fala e as audio tags necessárias à interpretação. Títulos, referências, timestamps e comandos de edição ficam fora desse arquivo. As tags são controles do modelo, não palavras que o narrador deve pronunciar.

## Contexto e fidelidade

- Ler o roteiro inteiro antes de marcar emoções. Consultar o briefing e `channel/narracao.prompt.md` (voz, interpretação, emoções e pronúncias aprovadas), além de `channel/canal.prompt.md` e `roteiro.prompt.md` para personalidade e tom. Usar a voz, o idioma, o público, o registro e a duração daquela produção; não herdar escolhas de outro canal ou de um exemplo desta skill.
- Identificar a fala aprovada, distinguindo-a de notas de câmera, trilha, efeitos, fontes e perguntas de entrevista ainda sem resposta. Uma indicação como `[imagem do arquivo]` não é uma audio tag. Um depoimento documental real continua sendo material de arquivo ou de captação, salvo pedido de adaptação para locução com atribuição adequada.
- Preservar nomes, datas, números, citações, ressalvas e relações de causa. Ajustar oralidade e grafia de números sem mudar o sentido. Não acrescentar acontecimentos, sentimentos atribuídos a pessoas, testemunhos ou certezas para tornar a leitura mais dramática.
- Quando o usuário fornecer somente um tema, falta o roteiro de entrada. Se também pedir sua criação, escrever o roteiro seguindo `channel/roteiro.prompt.md` e revisar com [humanizer](../humanizer/SKILL.md) antes de preparar a locução. Não tratar uma sinopse como roteiro completo por conta própria.

## Direção de interpretação

Escolher uma intenção para o narrador e acompanhar como ela muda ao longo do texto. Considerar proximidade com o ouvinte, energia, ritmo e peso emocional. Essas decisões vêm do conteúdo: uma explicação técnica, uma celebração e um relato de perda pedem interpretações diferentes. Não impor a sequência curiosidade, tensão e surpresa a todos os roteiros.

Trabalhar a expressividade também na escrita: referentes claros, frases que possam ser ditas com naturalidade, parágrafos que formem unidades de pensamento e transições compreensíveis pelo ouvido. Manter a personalidade do canal. Conversa informal, humor e contrações dependem do registro recebido.

Aplicar o [humanizer](../humanizer/SKILL.md) em modo incorporado ao texto falado. Preservar audio tags, dados e referências durante essa revisão. Cortar solenidade artificial, suspense vazio e conclusões repetidas; não acrescentar hesitações, gaguejos, risos ou suspiros apenas para simular humanidade.

### Audio tags

Ler [V4 e integração](references/v4-e-integracao.md) ao preparar tags, pausas, pronúncia ou uma entrega para a pipeline. Essa referência reúne os controles atuais e suas fontes oficiais.

- Escrever instruções curtas entre colchetes no ponto em que a interpretação deve mudar. Usar preferencialmente descrições claras em inglês, mantendo a fala no idioma original. Exemplos documentados incluem `[curious]`, `[excited]` e `[whispers]`. Descrições como `[quiet, measured narration]` também podem dirigir voz e ritmo; não há um catálogo fechado que garanta resultados idênticos em toda voz.
- Escolher a tag pelo trecho seguinte, não por palavras isoladas. Curiosidade pode sustentar uma pergunta real; entusiasmo pode acompanhar uma conquista; uma explicação pode pedir leitura calma e precisa. A intensidade precisa combinar com o assunto e com a pessoa que narra.
- Inserir marcações onde acrescentem direção. Não preencher cada frase nem repetir automaticamente a mesma lista em todo parágrafo. Um trecho contínuo pode compartilhar uma intenção; uma mudança de assunto ou energia pode pedir outra marcação. Evitar instruções contraditórias ou pilhas de sinônimos.
- Separar interpretação vocal de efeitos sonoros. Uma narração sobre um tiro ou sobre o bipe do caixa não pede automaticamente `[gunshot]` ou outro som. Risos, choro, sussurros e reações audíveis entram quando a proposta os justificar.
- Usar pontuação e estrutura para pausas naturais. Reticências sugerem hesitação e não devem substituir toda vírgula. Não usar SSML no v4 nem prometer segundos exatos com uma tag de pausa. Reservas de silêncio de edição pertencem às notas da montagem.
- Manter o timbre e o sotaque escolhidos para o canal. Uma mudança de emoção não exige trocar de personagem, idioma ou identidade vocal. A resposta às tags depende da voz e só pode ser confirmada ouvindo uma geração.

Exemplos de intenções, não um molde a repetir:

```text
[curious] Como fazer empresas diferentes reconhecerem o mesmo produto?

[quiet, measured narration] A equipe voltou ao local na manhã seguinte.

[excited] Depois de quatro tentativas, o equipamento voltou a funcionar.
```

Essas frases são exemplos de locução. Não acrescentá-las a um roteiro que não contenha essas informações.

## Revisão e tempo

Revisar o resultado inteiro como uma fala contínua. Conferir se as mudanças de energia ajudam a compreender o roteiro e se a leitura continua coerente depois de retirar as tags. Comparar com a origem para detectar omissões, repetições ou alterações factuais. Não confundir emoção do narrador com novas informações sobre a história.

Conferir colchetes completos, tags sem quebras internas e ausência de instruções editoriais misturadas à fala. Preservar a grafia dos nomes; preparar ajustes de pronúncia somente com base confiável. Quando houver dúvida, registrá-la fora da narração em vez de inventar uma transcrição fonética.

Contar por ferramenta as palavras faladas, excluindo as tags, e os caracteres enviados, incluindo os controles. Usar cadência medida da voz quando existir; sem medição, identificar a estimativa utilizada e considerar que interpretação e pausas mudam a duração. Não deduzir o tempo de fala pelo limite de caracteres nem acelerar a voz para cumprir o alvo.

Um pedido de preparação de narração termina nos arquivos de texto. Não chamar TTS pago apenas para validar esta conversão. Se a geração de áudio também estiver autorizada, testar um trecho representativo e ouvir a interpretação, a pronúncia e a continuidade antes de produzir o restante. Não substituir essa escuta por uma afirmação de que o resultado já está natural.

## Entrega

Em uma produção existente, salvar a versão para a API em `narracao/narracao.txt`, dentro do episódio, preservando `editorial/roteiro.md` como origem. O arquivo não contém Markdown, cercas de código, títulos ou explicações. Atualizar o destino pedido pelo usuário quando ele indicar outro arquivo.

Salvar também `narracao/narracao-sem-tags.txt` como referência do texto falado para contagem e conferência. Registrar em `narracao/direcao-de-voz.md` as intenções de interpretação, o modelo, as contagens e eventuais dúvidas de pronúncia, sem duplicar o roteiro inteiro. Explicitar se houve somente revisão textual ou se a voz foi efetivamente ouvida em uma geração.

Sem destino de arquivo definido, entregar a narração com tags em um bloco de texto copiável e as notas necessárias fora dele. Não inventar um voiceId para acomodar o pedido.

Converter para `video.json`, gerar áudio e renderizar somente quando essas etapas fizerem parte do pedido. Para gerar o áudio, usar [elevenlabs-v4-audio](../elevenlabs-v4-audio/SKILL.md).

Na etapa de edição, aplicar [edicao-video](../edicao-video/SKILL.md). Uma revisão apenas visual preserva a locução já aprovada e seus alinhamentos.
