---
voice.provider: elevenlabs
voice.voiceId: null
voice.modelId: eleven_v4
voice.stability: 0.5
voice.similarityBoost: 0.75
voice.speed: 1
---

# Narração

<!-- Frontmatter: `voice.voiceId` é o ID da voz ElevenLabs (liste com `npm run video -- voices`). Manter null até escolher. `stability` e `similarityBoost` vão de 0 a 1; `speed` de 0.7 a 1.2 (ignorado no v4). -->

## Voz

- **Nome da voz:** <!-- PREENCHER: nome na biblioteca ElevenLabs e link de referência, se houver. -->
- **Perfil:** <!-- PREENCHER: gênero, idade aparente, sotaque, timbre. -->
- **Por que esta voz:** <!-- PREENCHER: o que ela transmite para o público do canal. -->

## Interpretação

<!-- PREENCHER: energia padrão, proximidade com o ouvinte, como varia ao longo do vídeo. Ex.: "calma e curiosa; mais intensa nas revelações; nunca teatral". -->

## Emoções e audio tags

<!-- PREENCHER: tags do v4 que funcionam bem com esta voz (ex.: [curious], [excited], [quiet, measured narration]) e as que evitar. Frequência aceitável. Atualizar depois de ouvir gerações. -->

## Pronúncia

<!-- PREENCHER: nomes, siglas e termos com pronúncia definida (IPA entre barras, se confirmada). Ex.: "GPU: ler letra por letra". -->

## Entrega

Padrão de arquivos do episódio: `narracao/narracao.txt` (texto para a API, com tags), `narracao/narracao-sem-tags.txt` e `narracao/direcao-de-voz.md`. Skills: `elevenlabs-v4-narracao` (texto) e `elevenlabs-v4-audio` (geração).
