# HyperFrames e Three.js no video-factory

As ferramentas fazem parte do projeto e servem a qualquer canal. Quando e como usá-las é decidido em `channel/edicao.prompt.md`.

| Ferramenta                                               | Versão instalada | Uso na produção                                                                                  |
| -------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | `0.9.8`          | Composições HTML/CSS, animações explicativas, títulos, gráficos e exportação de sequências.      |
| [Three.js](https://github.com/mrdoob/three.js/)          | `0.187.0`        | Objetos, materiais, iluminação, câmeras e animações 3D. Tipos em `@types/three` na mesma versão. |

## Instalação e diagnóstico

Executar na raiz do repositório:

```sh
npm ci
npm run hyperframes -- --version
npm run hyperframes -- doctor --json
npm ls hyperframes three @types/three
```

`npm run hyperframes -- <comando>` usa a CLI local fixada no lockfile. Usar esse comando também ao trabalhar em um projeto criado dentro de um episódio; passar sua pasta como argumento.

HyperFrames requer uma instalação completa de FFmpeg e FFprobe. Neste macOS, foram instalados com `brew install ffmpeg`. Em outra máquina, instalar o pacote completo pelo gerenciador do sistema antes de renderizar. Os binários reduzidos incluídos no Remotion não têm todos os filtros necessários, como `setparams`. As variáveis `HYPERFRAMES_FFMPEG_PATH` e `HYPERFRAMES_FFPROBE_PATH` permitem escolher binários completos próprios.

O HyperFrames encontra ou baixa seu navegador com `npm run hyperframes -- browser ensure`. O diagnóstico inclui ferramentas opcionais de transcrição, voz, música e Docker; elas podem aparecer ausentes sem impedir o render local. Conferir especialmente Node.js, Chrome, FFmpeg e FFprobe. A renderização local não exige uma conta HeyGen. Serviços pagos ou de nuvem só entram na produção quando autorizados.

A versão do HyperFrames depende de `undici` `7.25.0`. O `package.json` aplica um override restrito a essa dependência para `7.30.1`, que corrige os avisos de segurança encontrados na instalação. As demais versões existentes do projeto foram preservadas.

## Skills locais

As quatro skills principais oficiais estão instaladas em `.agents/skills/` e disponíveis aos agentes no próximo turno:

- [hyperframes](../.agents/skills/hyperframes/SKILL.md): formato das composições, animação determinística e fluxo de produção.
- [hyperframes-cli](../.agents/skills/hyperframes-cli/SKILL.md): criação, diagnóstico, conferência, preview e exportação.
- [hyperframes-registry](../.agents/skills/hyperframes-registry/SKILL.md): consulta e instalação de blocos e componentes.
- [media-use](../.agents/skills/media-use/SKILL.md): uso e preparação de mídia.

As instruções do projeto e os prompts do canal governam a produção. Ler [edicao-video](../.agents/skills/edicao-video/SKILL.md) para os critérios audiovisuais; aplicar as skills HyperFrames às sequências feitas nessa ferramenta. Usar resolução, FPS, idioma, voz e identidade do canal. Os exemplos e padrões iniciais das ferramentas precisam ser adaptados a esses valores.

## Criar e exportar uma sequência HyperFrames

Exemplo a partir da raiz, substituindo `<video>` pelo episódio e escolhendo uma pasta nova para cada revisão:

```sh
npm run hyperframes -- init channel/videos/<video>/assets/hyperframes/explicacao-v1 --non-interactive --skip-skills
npm run hyperframes -- check channel/videos/<video>/assets/hyperframes/explicacao-v1 --json
npm run hyperframes -- snapshot channel/videos/<video>/assets/hyperframes/explicacao-v1 --at 0,1
npm run hyperframes -- preview channel/videos/<video>/assets/hyperframes/explicacao-v1 --background
npm run hyperframes -- render channel/videos/<video>/assets/hyperframes/explicacao-v1 --fps <fps do canal> --quality delivery -o channel/videos/<video>/assets/explicacao-v1.mp4
```

Após `init`, construir a sequência e definir `data-width`, `data-height` e `data-fps` conforme `channel/formato.prompt.md` na composição raiz, além de `data-duration` em segundos. Os comandos de conferência e preview vêm depois dessa implementação. Ao concluir a revisão, encerrar o preview com `npm run hyperframes -- preview <pasta-da-sequencia> --stop`.

Importar o MP4 como mídia local no `video.json`, usando `provider: "local"`, `path: "assets/explicacao-v1.mp4"`, `kind: "video"`, duração, dimensões, autoria, origem e licença. Também é possível usá-lo diretamente em uma composição própria Remotion. Registrar créditos dos modelos, texturas, fontes e demais materiais utilizados. Guardar as fontes HTML/JS junto do episódio; selecionar o resultado em `publicacao.json` e executar `npm run video -- package <video>`. A entrega fica em `channel/videos/<video>/renders/final/`, com manifesto em `renders/entrega.json`, conforme o [padrão de organização](channel-structure.md).

Para sobreposições com transparência, consultar `render --help` e a documentação HyperFrames antes de escolher WebM/MOV e o codec. Conferir a composição e o arquivo exportado, incluindo movimento e sincronização com a fala.

## Usar Three.js

Em código TypeScript que passa pelo bundler:

```ts
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
```

Three.js é uma biblioteca; não possui uma CLI de exportação de vídeo. No Remotion, sincronizar posições, rotações, câmera e shaders a `useCurrentFrame()` e `useVideoConfig().fps`, mantendo o resultado independente da ordem de renderização dos frames. A instalação inclui `three` e seus tipos; wrappers React adicionais podem ser escolhidos quando uma composição precisar deles.

Em HyperFrames, empacotar os imports para um arquivo JavaScript local dentro de `assets/`, ou usar um import map com cópias locais dos módulos da versão instalada. Um `<script type="module">` no navegador não resolve sozinho o import de `three` do Node. Derivar todo o estado visual do evento `hf-seek` e registrar promessas de preparação de modelos/texturas conforme a [referência de runtimes](../.agents/skills/hyperframes/references/runtimes.md):

```js
function renderAt(time) {
  mesh.rotation.y = time * 0.6;
  renderer.render(scene, camera);
}
window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
renderAt(0);
```

Carregar os assets antes da captura e conferir o comportamento do canvas no navegador de renderização. Modelos e texturas devem estar disponíveis localmente. O relógio da animação é o tempo da composição; evitar loops independentes de `requestAnimationFrame` e valores aleatórios sem semente.
