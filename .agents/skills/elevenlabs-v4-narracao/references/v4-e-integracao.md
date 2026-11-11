# V4 e integração

Regras conferidas em 31 de outubro de 2026. Ao mudar parâmetros ou encontrar comportamento divergente, conferir novamente a documentação oficial; modelos e endpoints podem mudar.

## Modelo e interpretação

O padrão do projeto é `eleven_v4`. A variante `eleven_v4_turbo` prioriza baixa latência e não substitui esse padrão por conta própria. A escolha da voz é independente do modelo.

No v4, os ajustes usados pela integração são `stability` e `similarity_boost`. O primeiro regula a consistência da interpretação; o segundo, a proximidade com a voz de referência. Não há um valor universalmente melhor para emoção: o ponto de partida local é 0,5 e 0,75, respectivamente, sujeito à escuta de uma amostra quando a geração estiver autorizada.

`speed` e `style` não são controles suportados pelo v4. O provider omite `speed` nesses modelos. Dirigir o andamento pelo texto e pelas audio tags, sem prometer um ritmo cronometrado. O v4 também não aceita SSML, como `<break>` ou `<phoneme>`.

Colchetes contêm direções de interpretação ou eventos de áudio. Por isso, retirar do texto enviado indicações como `[b-roll]`, `[música de fundo]`, `[fonte]` e `[corte]`. Não confiar que o modelo distinguirá uma nota editorial de um pedido de som.

As tags aceitam descrições de voz e combinações de intenção. Começar por comandos claros e apropriados ao roteiro; uma tag sugerida pela skill é uma direção a testar, não um resultado garantido. O v4 suporta clones profissionais, mas a escolha da tag ainda precisa respeitar as características da voz.

O modelo oferece pronúncia com IPA entre barras, por exemplo `/transcrição/`. Usar somente uma transcrição correta e conferir a leitura quando ela for necessária. Não substituir nomes por aproximações inventadas nem inserir anotações fonéticas destinadas ao editor na fala final.

## Contrato local

Ler `README.md`, `src/config.ts`, `src/providers/elevenlabs.ts` e os schemas na raiz do projeto antes de alterar configurações de produção. `channel/narracao.prompt.md` contém a voz e o modelo (frontmatter) e a direção de interpretação (corpo). A skill não precisa mudar esse cadastro para cada conversão de texto. O texto de API fica em `narracao/narracao.txt`, separado do roteiro em `editorial/roteiro.md`.

O contrato atual aceita até 4.500 caracteres em `scene.narration`, contando as tags. Um `narracao.txt` completo pode exceder isso: o limite pertence a cada cena do `video.json`. Quando a conversão para cenas for pedida, dividir em unidades coerentes, respeitando frases, parágrafos e a continuidade da interpretação. Restabelecer a intenção no início de uma requisição independente quando necessário, sem criar uma tag pendurada ao fim do bloco anterior.

A concatenação das falas das cenas, retiradas apenas as tags, deve preservar a narração final. Não converter cada pequena mudança visual em uma nova requisição de voz por obrigação. Títulos de cena ficam em `title`, nunca dentro de `narration`. Fontes, prompts de imagem e instruções de montagem também ficam fora da fala.

O provider envia as tags no texto da requisição. As legendas são construídas com o alinhamento retornado, filtrando controles entre colchetes no v4 e preservando os timestamps dos caracteres falados. Não remover palavras do áudio para fazer a legenda caber nem atribuir às tags tempos de fala inventados.

Para uma conversão solicitada, validar sem gerar áudio:

```sh
npm run video -- validate <video>
```

`prepare` gera áudio e pode consumir créditos. Alterar texto, tags, modelo ou ajustes muda a chave do cache de voz. A integração não repete automaticamente uma requisição paga que falhou; não acrescentar tentativas silenciosas como parte da preparação textual.

## Fontes oficiais

- [Eleven v4](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4): variantes, voz, parâmetros e exemplos de direção.
- [Audio tags em v3 e v4](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4): sintaxe dos controles e identificação do modelo na API.
- [Guia de prompting](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices): seções Prompting Eleven v4 e IPA with Eleven v4. Usar as orientações de v4; a página também contém exemplos de SSML para modelos anteriores.
- [Voice settings do plugin oficial](https://github.com/elevenlabs/plugin/blob/main/skills/general/text-to-speech/references/voice-settings.md): parâmetros enviados ao v4.
