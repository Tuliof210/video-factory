---
name: antigravity-imagens
description: Gerar ou editar imagens por IA delegando ao subagente do Antigravity (CLI `agy`, ferramenta generate_image), seguindo o estilo de channel/imagens-ia.prompt.md ou thumbnail.prompt.md. Usar para cenas ilustradas, objetos recortados, thumbnails, ícones e banners do canal.
---

# Imagens com o subagente do Antigravity

O agente atual não gera imagens. Ele escreve o prompt e delega ao Antigravity CLI (`agy`), cujo agente tem a ferramenta `generate_image`. O resultado volta como arquivo no episódio.

## Pré-requisitos

- `agy` instalado e autenticado (`agy --help`; `agy models` lista modelos). Se faltar, pedir ao usuário para instalar e fazer login; não tentar autenticar.
- Ler `channel/imagens-ia.prompt.md` (cenas) ou `channel/thumbnail.prompt.md` (thumbnails), mais as imagens que eles citam em `channel/referencias/`.

## Montar o pedido

Para cada imagem, definir:

- **Prompt:** prompt base do canal + o que a cena precisa mostrar (sujeito, ação, enquadramento, luz). Concreto, sem adjetivos vazios.
- **Evitar:** lista "Evitar" do prompt do canal.
- **Formato:** proporção do vídeo (`channel/formato.prompt.md`) ou da thumbnail (16:9 1280×720 no YouTube), e se precisa de fundo transparente para animar.
- **Destino:** caminho absoluto dentro do episódio, por exemplo `channel/videos/<video>/assets/ia/cena-03-v1.png`. Thumbnails em `assets/thumbnails/`.

## Delegar

Executar a partir da raiz do projeto, com o diretório de destino liberado para o subagente:

```bash
agy -p "Use the generate_image tool to create ONE image and save it exactly at <caminho absoluto>. Prompt: <prompt>. Avoid: <evitar>. Aspect ratio: <proporção>. Reply only with the saved path." \
  --add-dir "<pasta de destino absoluta>" --mode accept-edits --print-timeout 10m
```

- Para usar uma referência visual, incluir o caminho absoluto da imagem no prompt e liberar a pasta dela com outro `--add-dir`.
- Para editar uma imagem existente, pedir explicitamente "edit the image at <caminho>" e salvar com novo nome (`-v2`); nunca sobrescrever.
- Uma imagem por chamada. Para variações, chamadas separadas com sufixos `-v1`, `-v2`.
- Não usar `--dangerously-skip-permissions`.

## Conferir

Abrir cada arquivo gerado (ferramenta de leitura de imagem) e conferir: estilo do canal, conteúdo pedido, texto indesejado na imagem, mãos/rostos/objetos deformados, proporção e transparência. Refazer o que falhar ajustando o prompt, não aceitando "parecido".

Registrar em `channel/videos/<video>/assets/ia/prompts.md` o prompt final de cada arquivo e o status (gerado, aprovado, descartado). Imagens de IA que reconstroem fatos devem ser tratadas conforme a seção "Uso documental" do prompt do canal.
