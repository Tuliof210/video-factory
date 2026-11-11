---
name: trilha-audio
description: Escolher, gerar e mixar trilha sonora e efeitos para um vídeo do video-factory, usando bibliotecas de uso livre (YouTube Audio Library, Pixabay Music, Free Music Archive, Openverse) ou geração (media-use/HyperFrames, ElevenLabs Music/SFX), conforme channel/trilha.prompt.md. Usar para trilha, efeitos sonoros, mixagem e créditos de áudio.
---

# Trilha e efeitos

Ler `channel/trilha.prompt.md` (estilo, origem permitida, referências, mixagem, créditos) e os arquivos em `channel/referencias/trilha/`.

## Planejar

Ouvir/ler a narração e a timeline. Marcar onde a trilha entra, muda de intensidade, para e volta, e quais ações na tela pedem efeito. A trilha acompanha a estrutura do vídeo; não é uma cama única do início ao fim.

## Obter

**Biblioteca livre** (quando o canal permitir):

- YouTube Audio Library: só para uso no YouTube; algumas faixas exigem crédito.
- Pixabay Music: licença Pixabay, sem crédito obrigatório (registrar mesmo assim).
- Free Music Archive / Openverse / Incompetech: conferir a licença de cada faixa (CC BY exige crédito; CC BY-NC e ND podem não servir para canal monetizado).

Baixar para `channel/videos/<video>/assets/audio/` e anotar autor, faixa, licença e link.

**Geração:** a skill [media-use](../media-use/SKILL.md) gera ou busca música (`bgm`) e efeitos (`sfx`) com HeyGen, Openverse ou MusicGen local; ver `media-use/audio/references/bgm.md` e `sfx.md`. ElevenLabs também tem endpoints de música e efeitos; usar só se o usuário autorizar o custo. Descrever no prompt gênero, instrumentos, andamento, clima e duração, a partir do prompt do canal.

## Mixar

- Voz sempre inteligível. Trilha tipicamente 18 a 24 dB abaixo da voz nos trechos falados, subindo nos respiros.
- Ducking sob a fala, fades nas entradas e saídas, sem cortes secos no meio de compasso.
- Loudness final conforme o prompt do canal (YouTube costuma normalizar perto de -14 LUFS integrado; pico real abaixo de -1 dBTP).
- Em Remotion, controlar volume por frame (`<Audio volume={(f) => ...}>`); em HyperFrames, seguir a mixagem do media-use. Para medir: `ffmpeg -i video.mp4 -af loudnorm=print_format=summary -f null -`.

## Créditos

Toda faixa e efeito de terceiros entra em `creditos.txt` do episódio no formato definido pelo canal. Não usar áudio sem licença verificada. Não declarar que ouviu a mixagem se só mediu.
