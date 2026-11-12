---
name: broll-busca
description: Encontrar, avaliar e registrar b-rolls e imagens de banco ou de acervos públicos (Pixabay, Pexels opcional, Wikimedia Commons, Internet Archive, acervos oficiais) com licença e crédito, para um trecho do roteiro. Usar quando a edição precisar de cobertura filmada ou fotográfica real.
---

# Busca de b-roll

Ler a seção "Mistura de materiais" de `channel/edicao.prompt.md` para saber quando o canal usa b-roll e de onde. O frontmatter `media.bRoll` / `media.stockImages` libera vídeo/imagem de banco; `media.provider` define o banco padrão.

## Antes de buscar

Para cada trecho, escrever o que o plano precisa mostrar: gesto, objeto, lugar, época, detalhe. Buscar pelo conteúdo visual, não pela palavra-chave do assunto. "Mão passando produto no leitor" acha mais do que "código de barras".

## Bancos com API (Pixabay; Pexels opcional)

Pixabay é o banco padrão (`PIXABAY_API_KEY` em `.env`). Pexels é opcional: só com `--provider pexels` e `PEXELS_API_KEY` preenchida; sem a chave, não é usado.

```bash
npm run video -- stock-search --kind video --query "hand scanning product checkout" --orientation landscape --limit 15 --out channel/videos/<video>/build/candidatos/scan-01.json
```

- `--kind image|video`, `--orientation landscape|portrait` (seguir o formato do canal), `--provider pexels` só para usar o banco opcional; o padrão é Pixabay (ou o `media.provider` do canal).
- Buscar em inglês costuma render mais resultados.
- O JSON traz URL, autor, licença, dimensões e duração. Um item escolhido entra no `video.json` como `asset` (ou `shots[].asset`) do jeito que veio; `prepare` baixa, faz cache e escreve os créditos.

## Acervos públicos

Para material histórico ou documental: Wikimedia Commons, Internet Archive (Prelinger e domínio público), acervos nacionais e de agências públicas (NASA, Library of Congress, Arquivo Nacional). Conferir a licença de cada arquivo, não do acervo. Baixar para `channel/videos/<video>/assets/` e registrar como `provider: "local"` com `creator`, `sourceUrl` e `license`.

## Avaliar

Abrir os candidatos (thumbnail ou frames) antes de escolher. Recusar: conteúdo genérico que só compartilha palavra-chave, época ou lugar errado para o fato narrado, marcas d'água, logos em destaque, rostos identificáveis em contexto sensível, resolução abaixo do formato. Não usar o mesmo clipe em loop visível.

## Registrar

Créditos vão para `creditos.txt` via `prepare`. Para assets locais, manter fonte e licença no próprio `video.json`. Material sem licença clara não entra no vídeo.
