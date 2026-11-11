---
name: elevenlabs-v4-audio
description: Gerar a narração em áudio com ElevenLabs v4 no video-factory, a partir de um texto já preparado (narracao/narracao.txt), com cache, alinhamento por caractere e legendas. Usar para escolher voz, testar um trecho, gerar ou regenerar a locução. A preparação do texto com audio tags é da skill elevenlabs-v4-narracao.
---

# Narração ElevenLabs v4 (áudio)

A geração é paga. Antes de qualquer chamada que gere áudio, confirmar com o usuário o escopo (trecho de teste ou vídeo inteiro). Listar vozes e validar não geram custo.

## Configuração

- Chave: `ELEVENLABS_API_KEY` em `.env` (ver `.env.example`).
- Voz e ajustes: frontmatter de `channel/narracao.prompt.md` (`voice.voiceId`, `voice.modelId`, `voice.stability`, `voice.similarityBoost`). Interpretação, emoções e pronúncias aprovadas estão no corpo do mesmo arquivo.
- Listar vozes: `npm run video -- voices`. Ao escolher, gravar o `voiceId` no frontmatter e o nome/perfil no corpo.
- Detalhes do modelo (parâmetros suportados, tags, IPA): [V4 e integração](../elevenlabs-v4-narracao/references/v4-e-integracao.md).

## Gerar

O caminho suportado é o `video.json` do episódio:

1. Dividir `narracao/narracao.txt` em cenas no `video.json` (`scenes[].narration`, até 4.500 caracteres por cena, contando tags). Cortar em fim de frase ou parágrafo; reabrir a intenção com uma tag no começo da cena quando a anterior terminar em outra emoção. Não criar uma cena por corte visual.
2. Validar sem custo: `npm run video -- validate <video>`.
3. Para testar a voz, montar um `video.json` provisório só com um trecho representativo e rodar `npm run video -- prepare <video>`. Ouvir antes de gerar o resto.
4. Gerar tudo: `npm run video -- prepare <video>`.

`prepare` grava cada fala em `.cache/speech/<hash>/` (`audio.mp3` + `alignment.json`) e reaproveita o cache enquanto texto, voz, modelo e ajustes forem iguais. Mudar qualquer um deles gera nova cobrança só para as cenas alteradas. O build do episódio fica em `channel/videos/<video>/build/` com o áudio por cena, `captions.srt` e `manifest.json`; composições próprias em `channel/remotion/` podem usar esses arquivos.

## Regras

- Não repetir automaticamente uma requisição que falhou. Relatar o erro e perguntar.
- Não regenerar voz aprovada para ajustar edição, legenda ou trilha.
- Não acelerar, cortar ou esticar o áudio para caber numa duração.
- Ao entregar, dizer se o áudio foi efetivamente ouvido (por quem) ou só gerado. Registrar em `narracao/direcao-de-voz.md` a voz, o modelo, os ajustes e o que foi aprovado.
- Tags que funcionaram ou falharam com esta voz devem voltar para `channel/narracao.prompt.md`, seção "Emoções e audio tags", quando o usuário confirmar.
