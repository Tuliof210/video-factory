# ai-memory neste projeto

O projeto usa [ai-memory](https://github.com/akitaonrails/ai-memory) para continuidade entre sessões e entre agentes (Claude Code, Codex, etc.). A identidade fica em `.ai-memory.toml` (workspace `default`, projeto `video-factory`); o bloco gerenciado em `AGENTS.md` e as skills `.agents/skills/ai-memory-*` dizem aos agentes como usar.

## Instalar

1. Instale o ai-memory seguindo o README oficial e suba o servidor local.
2. Rode `ai-memory doctor` na raiz do projeto para conferir identidade e hooks.
3. Para atualizar o bloco de `AGENTS.md` e as skills: `ai-memory install-instructions --target AGENTS.md` (ou peça ao agente usando a skill `ai-memory-routing-install`).

Sem ai-memory instalado, o projeto funciona normalmente; os agentes só perdem a memória entre sessões.

## Uso

- Retomar trabalho: peça "o que ficou pendente?" (skill `ai-memory-handoff`) ou "o que já decidimos sobre X?" (`ai-memory-retrieval`).
- Guardar algo durável: peça explicitamente "lembre que..." (`ai-memory-durable-pages`). Regras permanentes do projeto vão para `AGENTS.md`, não para a memória.
- Decisões do canal ficam em `channel/*.prompt.md`. A memória registra contexto de produção (o que foi tentado, aprovado, descartado), não substitui os prompts.

## Filtro opcional de hooks

`scripts/ai-memory-hook-filter.py` filtra prompts automáticos do composer do Codex antes de chegarem ao hook do ai-memory. É opcional e específico de quem usa hooks do Codex; instale apontando o hook para uma cópia estável do script e reinstale se o checkout mudar de caminho.
