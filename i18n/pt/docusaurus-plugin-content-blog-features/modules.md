---
title: "Módulos JavaScript"
author: "Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) e Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
- "addy-osmani"
- "mathias-bynens"
date: 2018-06-18
tags: 
  - ECMAScript
  - ES2015
description: "Este artigo explica como usar módulos JavaScript, como implantá-los de forma responsável e como a equipe do Chrome está trabalhando para melhorar ainda mais os módulos no futuro."
tweet: "1008725884575109120"
---
Os módulos JavaScript agora estão [suportados em todos os principais navegadores](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

Este artigo explica como usar módulos JS, como implantá-los de forma responsável e como a equipe do Chrome está trabalhando para tornar os módulos ainda melhores no futuro.

## O que são módulos JS?

Os módulos JS (também conhecidos como “módulos ES” ou “módulos do ECMAScript”) são uma nova grande funcionalidade, ou melhor, uma coleção de novas funcionalidades. Você pode ter usado um sistema de módulo JavaScript de terceiros antes. Talvez você tenha usado [CommonJS como no Node.js](https://nodejs.org/docs/latest-v10.x/api/modules.html), ou talvez [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md), ou algo do tipo. Todos esses sistemas de módulos têm uma coisa em comum: eles permitem que você importe e exporte funcionalidades.

<!--truncate-->
O JavaScript agora tem uma sintaxe padronizada para exatamente isso. Dentro de um módulo, você pode usar a palavra-chave `export` para exportar praticamente qualquer coisa. Você pode exportar um `const`, uma `function`, ou qualquer outra vinculação ou declaração de variável. Basta prefixar a declaração ou vinculação da variável com `export` e você está pronto:

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

Depois você pode usar a palavra-chave `import` para importar o módulo de outro módulo. Aqui, estamos importando as funcionalidades `repeat` e `shout` do módulo `lib`, e usando-as no módulo `main`:

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('Módulos em ação');
// → 'MÓDULOS EM AÇÃO!'
```

Você também poderia exportar um valor _default_ de um módulo:

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

Esses `default` exports podem ser importados usando qualquer nome:

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

Os módulos são um pouco diferentes dos scripts clássicos:

- Os módulos têm [modo estrito](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) habilitado por padrão.

- A sintaxe de comentário estilo HTML não é suportada em módulos, embora funcione em scripts clássicos.

    ```js
    // Não use a sintaxe de comentário estilo HTML em JavaScript!
    const x = 42; <!-- TODO: Renomear x para y.
    // Use um comentário regular de linha única em vez disso:
    const x = 42; // TODO: Renomear x para y.
    ```

- Os módulos têm um escopo léxico de nível superior. Isso significa que, por exemplo, executar `var foo = 42;` dentro de um módulo *não* cria uma variável global chamada `foo`, acessível através de `window.foo` em um navegador, embora isso seria o caso em um script clássico.

- Da mesma forma, o `this` dentro dos módulos não se refere ao `this` global, e sim é `undefined`. (Use [`globalThis`](/features/globalthis) se precisar de acesso ao `this` global.)

- A nova sintaxe estática `import` e `export` só está disponível dentro de módulos — ela não funciona em scripts clássicos.

- [`await` no nível superior](/features/top-level-await) está disponível em módulos, mas não em scripts clássicos. Relativamente, `await` não pode ser usado como um nome de variável em nenhum lugar de um módulo, embora variáveis em scripts clássicos _possam_ ser nomeadas como `await` fora de funções assíncronas.

Por causa dessas diferenças, *o mesmo código JavaScript pode se comportar de forma diferente quando tratado como módulo vs. script clássico*. Como tal, o runtime JavaScript precisa saber quais scripts são módulos.

## Usando módulos JS no navegador

Na web, você pode informar aos navegadores para tratar um elemento `<script>` como um módulo configurando o atributo `type` como `module`.

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Os navegadores que entendem `type="module"` ignoram scripts com o atributo `nomodule`. Isso significa que você pode servir uma carga útil baseada em módulo para navegadores que suportam módulos enquanto fornece um fallback para outros navegadores. A capacidade de fazer essa distinção é incrível, especialmente em termos de desempenho! Pense nisso: apenas navegadores modernos suportam módulos. Se um navegador entende seu código de módulo, ele também suporta [funcionalidades que foram introduzidas antes dos módulos](https://codepen.io/samthor/pen/MmvdOM), como funções arrow ou `async`-`await`. Não é mais necessário transpilar essas funcionalidades no seu pacote de módulos! Você pode [servir cargas úteis menores e praticamente não transpiladas baseadas em módulos para navegadores modernos](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/). Apenas navegadores legados recebem a carga útil `nomodule`.

Como [os módulos são adiados por padrão](#defer), você pode querer carregar o script `nomodule` de forma adiada também:

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### Diferenças específicas do navegador entre módulos e scripts clássicos

Como você já sabe, os módulos são diferentes dos scripts clássicos. Além das diferenças independentes da plataforma que destacamos acima, existem algumas diferenças específicas para navegadores.

Por exemplo, módulos são avaliados apenas uma vez, enquanto scripts clássicos são avaliados tantas vezes quanto você os adiciona ao DOM.

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js é executado várias vezes. -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import './module.mjs';</script>
<!-- module.mjs é executado apenas uma vez. -->
```

Além disso, scripts de módulo e suas dependências são buscados com CORS. Isso significa que qualquer script de módulo de outra origem deve ser servido com os cabeçalhos corretos, como `Access-Control-Allow-Origin: *`. Isso não é verdade para scripts clássicos.

Outra diferença está relacionada ao atributo `async`, que faz com que o script seja baixado sem bloquear o parser de HTML (como `defer`), mas também executa o script assim que possível, sem ordem garantida e sem esperar pela finalização do parser de HTML. O atributo `async` não funciona para scripts clássicos embutidos, mas funciona para `<script type="module">` embutido.

### Uma observação sobre extensões de arquivo

Você pode ter notado que estamos usando a extensão do arquivo `.mjs` para módulos. Na Web, a extensão do arquivo não importa muito, desde que o arquivo seja servido com [o tipo MIME do JavaScript `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type). O navegador sabe que é um módulo por causa do atributo `type` no elemento de script.

Ainda assim, recomendamos usar a extensão `.mjs` para módulos por duas razões:

1. Durante o desenvolvimento, a extensão `.mjs` deixa claro para você e para qualquer outra pessoa olhando seu projeto que o arquivo é um módulo, ao contrário de um script clássico. (Nem sempre é possível dizer apenas olhando o código.) Como mencionado antes, os módulos são tratados de maneira diferente de scripts clássicos, então a diferença é extremamente importante!
1. Ela garante que seu arquivo seja analisado como um módulo por ambientes como [Node.js](https://nodejs.org/api/esm.html#enabling) e [`d8`](/docs/d8), e ferramentas de build como [Babel](https://babeljs.io/docs/en/options#sourcetype). Embora esses ambientes e ferramentas tenham maneiras proprietárias, via configuração, de interpretar arquivos com outras extensões como módulos, a extensão `.mjs` é a forma compatível entre diferentes plataformas para garantir que arquivos sejam tratados como módulos.

:::note
**Nota:** Para implantar `.mjs` na web, seu servidor web precisa ser configurado para servir arquivos com essa extensão usando o cabeçalho apropriado `Content-Type: text/javascript`, como mencionado acima. Além disso, você pode querer configurar seu editor para tratar arquivos `.mjs` como arquivos `.js` para obter realce de sintaxe. A maioria dos editores modernos já faz isso por padrão.
:::

### Especificadores de módulo

Ao `importar` módulos, a string que especifica a localização do módulo é chamada de "especificador de módulo" ou "especificador de importação". Em nosso exemplo anterior, o especificador de módulo é `'./lib.mjs'`:

```js
import {shout} from './lib.mjs';
//                  ^^^^^^^^^^^
```

Algumas restrições se aplicam aos especificadores de módulo em navegadores. Especificadores de módulo chamados de "bare" atualmente não são suportados. Essa restrição está [especificada](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier) para que, no futuro, os navegadores possam permitir carregadores de módulo personalizados que deem um significado especial a especificadores de módulo 'bare', como os seguintes exemplos:

```js
// Ainda não é suportado:
import {shout} from 'jquery';
import {shout} from 'lib.mjs';
import {shout} from 'modules/lib.mjs';
```

Por outro lado, os exemplos a seguir são todos suportados:

```js
// Suportado:
import {shout} from './lib.mjs';
import {shout} from '../lib.mjs';
import {shout} from '/modules/lib.mjs';
import {shout} from 'https://simple.example/modules/lib.mjs';
```

Por enquanto, os especificadores de módulo devem ser URLs completos ou URLs relativos começando com `/`, `./` ou `../`.

### Módulos são adiados por padrão

Scripts clássicos `<script>` bloqueiam o parser de HTML por padrão. Você pode contornar isso adicionando [o atributo `defer`](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer), o qual garante que o download do script aconteça em paralelo com o parsing do HTML.

![](/_img/modules/async-defer.svg)

Scripts de módulo são adiados por padrão. Portanto, não há necessidade de adicionar `defer` às suas tags `<script type="module">`! Não apenas o download do módulo principal acontece em paralelo com a análise do HTML, mas o mesmo ocorre para todos os módulos de dependência!

## Outros recursos de módulo

### `import()` dinâmico

Até agora, utilizamos apenas `import` estático. Com `import` estático, todo o gráfico de módulos precisa ser baixado e executado antes que seu código principal possa rodar. Às vezes, você não quer carregar um módulo antecipadamente, mas sim sob demanda, apenas quando precisar — quando o usuário clicar em um link ou botão, por exemplo. Isso melhora o desempenho do tempo de carregamento inicial. [O `import()` dinâmico](/features/dynamic-import) torna isso possível!

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './lib.mjs';
    const {repeat, shout} = await import(moduleSpecifier);
    repeat('hello');
    // → 'hello hello'
    shout('Dynamic import in action');
    // → 'DYNAMIC IMPORT IN ACTION!'
  })();
</script>
```

Diferentemente de `import` estático, o `import()` dinâmico pode ser usado dentro de scripts regulares. É uma maneira fácil de começar a usar módulos gradualmente em sua base de código já existente. Para mais detalhes, veja [nosso artigo sobre `import()` dinâmico](/features/dynamic-import).

:::note
**Nota:** [webpack tem sua própria versão do `import()`](https://web.dev/use-long-term-caching/) que divide inteligentemente o módulo importado em seu próprio fragmento, separado do pacote principal.
:::

### `import.meta`

Outro novo recurso relacionado a módulos é o `import.meta`, que fornece informações sobre o módulo atual. Os metadados exatos que você obtém não são especificados como parte do ECMAScript; eles dependem do ambiente de hospedagem. Em um navegador, você pode obter metadados diferentes do que em Node.js, por exemplo.

Aqui está um exemplo de `import.meta` na web. Por padrão, imagens são carregadas em relação ao URL atual em documentos HTML. `import.meta.url` torna possível carregar uma imagem relativa ao módulo atual.

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail('../img/thumbnail.png');
container.append(thumbnail);
```

## Recomendações de desempenho

### Continue agrupando

Com módulos, torna-se possível desenvolver sites sem usar empacotadores como webpack, Rollup ou Parcel. É aceitável usar módulos JS nativos diretamente nos seguintes cenários:

- durante o desenvolvimento local
- em produção para aplicativos web pequenos com menos de 100 módulos no total e com uma árvore de dependência relativamente rasa (isto é, profundidade máxima menor que 5)

No entanto, como aprendemos durante [nossa análise do gargalo da pipeline de carregamento do Chrome ao carregar uma biblioteca modularizada composta por ~300 módulos](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub), o desempenho de carregamento de aplicativos agrupados é melhor do que os não agrupados.

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

Uma razão para isso é que a sintaxe estática de `import`/`export` é analisável de forma estática, e pode, assim, ajudar ferramentas de empacotamento a otimizar seu código eliminando exportações não utilizadas. `import` e `export` estáticos são mais do que apenas sintaxe; eles são uma funcionalidade crítica para ferramentas!

*Nossa recomendação geral é continuar utilizando empacotadores antes de implantar módulos em produção.* De certa forma, o empacotamento é uma otimização semelhante à minificação de código: resulta em um benefício de desempenho, porque você acaba enviando menos código. O empacotamento tem o mesmo efeito! Continue empacotando.

Como sempre, [o recurso de cobertura de código do DevTools](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) pode ajudá-lo a identificar se você está enviando código desnecessário para os usuários. Também recomendamos o uso de [divisão de código](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading) para dividir pacotes e atrasar o carregamento de scripts não críticos para a Primeira Pintura Significativa.

#### Concessões entre empacotamento e envio de módulos não agrupados

Como de costume no desenvolvimento web, tudo é uma concessão. Enviar módulos não agrupados pode diminuir o desempenho do carregamento inicial (cache frio), mas pode realmente melhorar o desempenho de carregamento para visitas subsequentes (cache quente) em comparação ao envio de um único pacote sem divisão de código. Para uma base de código de 200 KB, alterar um único módulo granular e fazer dele a única busca no servidor para visitas subsequentes é muito melhor do que ter que buscar o pacote inteiro novamente.

Se você está mais preocupado com a experiência de visitantes com caches quentes do que com o desempenho na primeira visita e tem um site com menos de algumas centenas de módulos granulares, pode experimentar enviar módulos não agrupados, medir o impacto de desempenho para carregamentos frios e quentes e, então, tomar uma decisão baseada em dados!

Os engenheiros de navegadores estão trabalhando arduamente para melhorar o desempenho dos módulos de forma nativa. Com o tempo, esperamos que o envio de módulos não agrupados se torne viável em mais situações.

### Use módulos de granulação fina

Adquira o hábito de escrever seu código usando pequenos módulos de granulação fina. Durante o desenvolvimento, geralmente é melhor ter apenas algumas exportações por módulo do que combinar manualmente muitas exportações em um único arquivo.

Considere um módulo chamado `./util.mjs` que exporta três funções chamadas `drop`, `pluck` e `zip`:

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

Se sua base de código realmente precisa apenas da funcionalidade `pluck`, você provavelmente a importaria da seguinte forma:

```js
import {pluck} from './util.mjs';
```

Neste caso, (sem uma etapa de agrupamento em tempo de compilação) o navegador ainda precisa baixar, analisar e compilar todo o módulo `./util.mjs` mesmo que precise apenas dessa única exportação. Isso é desperdício!

Se `pluck` não compartilha nenhum código com `drop` e `zip`, seria melhor movê-lo para seu próprio módulo de granulação fina, por exemplo, `./pluck.mjs`.

```js
export function pluck() { /* … */ }
```

Podemos então importar `pluck` sem a sobrecarga de lidar com `drop` e `zip`:

```js
import {pluck} from './pluck.mjs';
```

:::note
**Nota:** Você poderia usar uma exportação `default` em vez de uma exportação nomeada aqui, dependendo de sua preferência pessoal.
:::

Isso não apenas mantém seu código-fonte claro e simples, mas também reduz a necessidade de eliminação de código morto realizada por empacotadores. Se um dos módulos em sua árvore de origem não for utilizado, ele nunca é importado e, assim, o navegador nunca o baixa. Os módulos que _são_ utilizados podem ser individualmente [armazenados em cache de código](/blog/code-caching-for-devs) pelo navegador. (A infraestrutura para fazer isso já foi implementada no V8, e [o trabalho está em andamento](https://bugs.chromium.org/p/chromium/issues/detail?id=841466) para habilitar isso também no Chrome.)

Usar pequenos módulos de granulação fina ajuda a preparar sua base de código para o futuro onde [uma solução de agrupamento nativa](#web-packaging) possa estar disponível.

### Pré-carregue módulos

Você pode otimizar ainda mais a entrega de seus módulos utilizando [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload). Dessa forma, os navegadores podem pré-carregar e até pré-analisar e pré-compilar módulos e suas dependências.

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

Isso é especialmente importante para árvores de dependência maiores. Sem `rel="modulepreload"`, o navegador precisa realizar várias requisições HTTP para entender a árvore completa de dependências. No entanto, se você declarar a lista completa de scripts de módulos dependentes com `rel="modulepreload"`, o navegador não precisa descobrir essas dependências progressivamente.

### Use HTTP/2

Usar HTTP/2, sempre que possível, é uma boa dica de desempenho — mesmo que apenas por [seu suporte a multiplexação](https://web.dev/performance-http2/#request-and-response-multiplexing). Com a multiplexação do HTTP/2, várias mensagens de requisição e resposta podem estar em trânsito ao mesmo tempo, o que é benéfico para o carregamento de árvores de módulos.

A equipe do Chrome investigou se outro recurso do HTTP/2, especificamente o [push de servidor do HTTP/2](https://web.dev/performance-http2/#server-push), poderia ser uma solução prática para implantar aplicativos altamente modularizados. Infelizmente, [o push de servidor do HTTP/2 é complicado de acertar](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/), e as implementações de servidores web e navegadores atualmente não estão otimizadas para casos de uso de aplicativos web altamente modularizados. É difícil empurrar apenas os recursos que o usuário ainda não tem armazenados em cache, por exemplo, e resolver isso comunicando todo o estado de cache de uma origem ao servidor é um risco à privacidade.

Então, utilize HTTP/2 de todas as formas! Apenas tenha em mente que o push de servidor do HTTP/2 (infelizmente) não é uma solução mágica.

## Adoção de módulos JS na web

Os módulos JS estão lentamente ganhando adoção na web. [Nossos contadores de uso](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062) mostram que 0.08% de todas as cargas de página atualmente utilizam `<script type="module">`. Note que esse número exclui outros pontos de entrada como o `import()` dinâmico ou [worklets](https://drafts.css-houdini.org/worklets/).

## O que vem a seguir para os módulos JS?

A equipe do Chrome está trabalhando para melhorar a experiência de desenvolvimento com módulos JS de diversas formas. Vamos discutir algumas delas.

### Algoritmo de resolução de módulos mais rápido e determinístico

Propusemos uma alteração no algoritmo de resolução de módulos que abordou uma deficiência em velocidade e determinismo. O novo algoritmo já está ativo tanto na [especificação HTML](https://github.com/whatwg/html/pull/2991) quanto na [especificação ECMAScript](https://github.com/tc39/ecma262/pull/1006), e está implementado no [Chrome 63](http://crbug.com/763597). Aguarde para que essa melhoria chegue em mais navegadores em breve!

O novo algoritmo é muito mais eficiente e rápido. A complexidade computacional do algoritmo antigo era quadrática, ou seja, 𝒪(n²), em relação ao tamanho do grafo de dependências, assim como era a implementação no Chrome na época. O novo algoritmo é linear, ou seja, 𝒪(n).

Além disso, o novo algoritmo relata erros de resolução de uma maneira determinística. Dado um grafo contendo vários erros, diferentes execuções do algoritmo antigo poderiam relatar erros diferentes como responsáveis pela falha de resolução. Isso tornava a depuração desnecessariamente difícil. O novo algoritmo garante relatar o mesmo erro todas as vezes.

### Worklets e Web Workers

O Chrome agora implementa [worklets](https://drafts.css-houdini.org/worklets/), que permitem aos desenvolvedores da web personalizar lógica embutida nas “partes de baixo nível” dos navegadores. Com os worklets, os desenvolvedores da web podem alimentar um módulo JS no pipeline de renderização ou no pipeline de processamento de áudio (e possivelmente em mais pipelines no futuro!).

O Chrome 65 suporta [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi) (também conhecida como API CSS Paint) para controlar como um elemento DOM é pintado.

```js
const result = await css.paintWorklet.addModule('paint-worklet.mjs');
```

O Chrome 66 suporta [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet), que permite controlar o processamento de áudio com seu próprio código. A mesma versão do Chrome iniciou um [OriginTrial para `AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ), que permite criar animações processuais de alto desempenho vinculadas a rolagem e outras.

Finalmente, [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/) (também conhecida como API CSS Layout) está implementada no Chrome 67.

Estamos [trabalhando](https://bugs.chromium.org/p/chromium/issues/detail?id=680046) para adicionar suporte ao uso de módulos JS com web workers dedicados no Chrome. Você já pode experimentar esse recurso com `chrome://flags/#enable-experimental-web-platform-features` habilitado.

```js
const worker = new Worker('worker.mjs', { type: 'module' });
```

O suporte a módulos JS para shared workers e service workers está chegando em breve:

```js
const worker = new SharedWorker('worker.mjs', { type: 'module' });
const registration = await navigator.serviceWorker.register('worker.mjs', { type: 'module' });
```

### Mapas de importação

No Node.js/npm, é comum importar módulos JS pelo seu “nome do pacote”. Por exemplo:

```js
import moment from 'moment';
import {pluck} from 'lodash-es';
```

Atualmente, [de acordo com a especificação HTML](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier), tais “especificadores de importação simplificados” geram uma exceção. [Nossa proposta de mapas de importação](https://github.com/domenic/import-maps) permite que esse tipo de código funcione na web, incluindo em aplicativos de produção. Um mapa de importação é um recurso JSON que ajuda o navegador a converter especificadores de importação simplificados em URLs completos.

Os mapas de importação ainda estão na fase de proposta. Embora tenhamos pensado muito sobre como eles atendem a vários casos de uso, ainda estamos engajados com a comunidade e ainda não redigimos uma especificação completa. Feedbacks são bem-vindos!

### Empacotamento na Web: Pacotes Nativos

A equipe de carregamento do Chrome está explorando [um formato de empacotamento nativo para a web](https://github.com/WICG/webpackage) como uma nova maneira de distribuir aplicativos da web. Os recursos principais do empacotamento na web incluem:

[Trocas HTTP Assinadas](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html), que permitem que um navegador confie que um par de solicitação/resposta HTTP foi gerado pela origem que ele alega; [Trocas HTTP Empacotadas](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00), isto é, uma coleção de trocas, cada uma das quais pode ser assinada ou não, com alguns metadados descrevendo como interpretar o pacote como um todo.

Combinados, tal formato de empacotamento na web permitiria *vários recursos de mesma origem* serem *embutidos com segurança* em uma *única* resposta HTTP `GET`.

Ferramentas de empacotamento existentes como webpack, Rollup ou Parcel atualmente emitem um único pacote de JavaScript, no qual a semântica dos módulos e ativos separados originais é perdida. Com pacotes nativos, os navegadores poderiam desempacotar os recursos de volta à sua forma original. Em termos simplificados, você pode imaginar uma Troca HTTP Empacotada como um pacote de recursos que pode ser acessado em qualquer ordem por meio de um índice (manifesto), e onde os recursos contidos podem ser armazenados e rotulados de forma eficiente de acordo com sua importância relativa, mantendo a noção de arquivos individuais. Por causa disso, pacotes nativos podem melhorar a experiência de depuração. Ao visualizar ativos no DevTools, os navegadores poderiam apontar para o módulo original sem a necessidade de mapas de origem complexos.

A transparência do formato de pacote nativo oferece diversas oportunidades de otimização. Por exemplo, se um navegador já tiver parte de um pacote nativo armazenado em cache localmente, poderá comunicar isso ao servidor da web e então baixar apenas as partes ausentes.

O Chrome já suporta parte da proposta ([`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)), mas o formato de empacotamento em si, bem como sua aplicação em apps altamente modularizados, ainda estão em fase de exploração. Seu feedback é muito bem-vindo no repositório ou por e-mail para [loading-dev@chromium.org](mailto:loading-dev@chromium.org)!

### APIs em Camadas

Implementar e distribuir novos recursos e APIs da web implica em custos contínuos de manutenção e tempo de execução — cada novo recurso polui o namespace do navegador, aumenta os custos de inicialização e representa uma nova superfície para introduzir bugs no código-base. [APIs em camadas](https://github.com/drufball/layered-apis) são um esforço para implementar e distribuir APIs de nível superior com navegadores da web de maneira mais escalável. Módulos JS são uma tecnologia chave para habilitar APIs em camadas:

- Como os módulos são explicitamente importados, exigir que APIs em camadas sejam expostas via módulos garante que os desenvolvedores paguem apenas pelas APIs em camadas que utilizam.
- Como o carregamento de módulos é configurável, APIs em camadas podem ter um mecanismo embutido para carregar automaticamente polyfills em navegadores que não suportam APIs em camadas.

Os detalhes de como módulos e APIs em camadas funcionam juntos [ainda estão sendo definidos](https://github.com/drufball/layered-apis/issues), mas a proposta atual é algo parecido com isto:

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

O elemento `<script>` carrega a API `virtual-scroller` ou do conjunto integrado de APIs em camadas do navegador (`std:virtual-scroller`) ou de uma URL alternativa que aponta para um polyfill. Essa API pode fazer qualquer coisa que módulos JS podem fazer em navegadores da web. Um exemplo seria definir [um elemento `<virtual-scroller>` personalizado](https://www.chromestatus.com/feature/5673195159945216), para que o HTML a seguir seja aprimorado progressivamente conforme desejado:

```html
<virtual-scroller>
  <!-- O conteúdo vai aqui. -->
</virtual-scroller>
```

## Créditos

Agradecimentos a Domenic Denicola, Georg Neis, Hiroki Nakagawa, Hiroshige Hayashizaki, Jakob Gruber, Kouhei Ueno, Kunihiko Sakamoto e Yang Guo por tornar os módulos JavaScript rápidos!

Além disso, parabéns a Eric Bidelman, Jake Archibald, Jason Miller, Jeffrey Posnick, Philip Walton, Rob Dodson, Sam Dutton, Sam Thorogood e Thomas Steiner por lerem uma versão preliminar deste guia e darem seu feedback.
