---
title: '`await` de nível superior'
author: 'Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))'
avatars:
  - 'myles-borins'
date: 2019-10-08
tags:
  - ECMAScript
  - Node.js 14
description: '`await` de nível superior está chegando aos módulos JavaScript! Em breve, você poderá usar `await` sem precisar estar em uma função assíncrona.'
tweet: '1181581262399643650'
---
[`await` de nível superior](https://github.com/tc39/proposal-top-level-await) permite que os desenvolvedores usem a palavra-chave `await` fora de funções assíncronas. Ele age como uma grande função assíncrona, fazendo com que outros módulos que o `importam` esperem antes de começar a avaliar seu corpo.

<!--truncate-->
## O comportamento antigo

Quando `async`/`await` foi introduzido pela primeira vez, tentar usar um `await` fora de uma função `async` resultava em um `SyntaxError`. Muitos desenvolvedores utilizaram expressões de função assíncrona invocadas imediatamente como uma forma de acessar o recurso.

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await só é válido em funções assíncronas

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## O novo comportamento

Com o `await` de nível superior, o código acima funciona como você esperaria dentro de [módulos](/features/modules):

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**Nota:** O `await` de nível superior _somente_ funciona no nível superior de módulos. Não há suporte para scripts clássicos ou funções não assíncronas.
:::

## Casos de uso

Esses casos de uso são emprestados do [repositório da proposta](https://github.com/tc39/proposal-top-level-await#use-cases).

### Caminhos de dependência dinâmica

```js
const strings = await import(`/i18n/${navigator.language}`);
```

Isso permite que os módulos usem valores de tempo de execução para determinar dependências. Isso é útil para cenários como divisões entre desenvolvimento/produção, internacionalização, divisões de ambiente, etc.

### Inicialização de recursos

```js
const connection = await dbConnector();
```

Isso permite que os módulos representem recursos e também produzam erros nos casos em que o módulo não possa ser usado.

### Alternativas de dependências

O exemplo a seguir tenta carregar uma biblioteca JavaScript do CDN A, recorrendo ao CDN B se isso falhar:

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## Ordem de execução de módulos

Uma das maiores mudanças no JavaScript com o `await` de nível superior é a ordem de execução dos módulos no seu grafo. O mecanismo JavaScript executa módulos em [traversal pós-ordem](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order): começando da subárvore mais à esquerda do seu grafo de módulos, os módulos são avaliados, suas ligações são exportadas, e seus irmãos são executados, seguidos por seus pais. Esse algoritmo ocorre recursivamente até executar a raiz do grafo do módulo.

Antes do `await` de nível superior, essa ordem era sempre síncrona e determinista: entre várias execuções do seu código, seu grafo era garantido a executar na mesma ordem. Quando o `await` de nível superior chega, a mesma garantia existe, mas apenas enquanto você não usar o `await` de nível superior.

Veja o que acontece quando você usa o `await` de nível superior em um módulo:

1. A execução do módulo atual é adiada até que a promessa `await` seja resolvida.
1. A execução do módulo pai é adiada até que o módulo filho que chamou o `await` e todos os seus irmãos exportem as ligações.
1. Os módulos irmãos e os irmãos dos módulos pais podem continuar sendo executados na mesma ordem síncrona — assumindo que não haja ciclos ou outras promessas `await` no grafo.
1. O módulo que chamou o `await` retoma sua execução após a resolução da promessa `await`.
1. O módulo pai e subsequentes árvores continuam a ser executados em uma ordem síncrona desde que não existam outras promessas `await`.

## Isso já funciona no DevTools?

De fato, sim! O REPL no [Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await), [Node.js](https://github.com/nodejs/node/issues/13209) e Safari Web Inspector já oferecem suporte para `await` de nível superior há algum tempo. No entanto, essa funcionalidade era não padronizada e limitada ao REPL! Ela é distinta da proposta de `await` de nível superior, que faz parte da especificação da linguagem e se aplica apenas a módulos. Para testar o código de produção que depende do `await` de nível superior de uma forma que corresponda totalmente à semântica da proposta de especificação, certifique-se de testar em seu aplicativo real, e não apenas no DevTools ou no REPL do Node.js!

## O `await` de nível superior não é uma armadilha?

Talvez você tenha visto [o famoso gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221) de [Rich Harris](https://twitter.com/Rich_Harris), que inicialmente descreveu uma série de preocupações sobre o `await` no nível superior e incentivou a linguagem JavaScript a não implementar o recurso. Algumas preocupações específicas foram:

- O `await` no nível superior poderia bloquear a execução.
- O `await` no nível superior poderia bloquear a obtenção de recursos.
- Não haveria uma história clara de interoperabilidade para módulos CommonJS.

A versão do estágio 3 da proposta aborda diretamente essas questões:

- Como os módulos irmãos podem ser executados, não há bloqueio definitivo.
- O `await` no nível superior ocorre durante a fase de execução do grafo de módulos. Neste ponto, todos os recursos já foram obtidos e vinculados. Não há risco de bloquear a obtenção de recursos.
- O `await` no nível superior é limitado a módulos. Não há, explicitamente, suporte para scripts ou para módulos CommonJS.

Como em qualquer novo recurso de linguagem, sempre há o risco de comportamento inesperado. Por exemplo, com o `await` no nível superior, dependências circulares entre módulos poderiam introduzir um deadlock.

Sem o `await` no nível superior, os desenvolvedores JavaScript frequentemente utilizavam expressões de função assíncrona imediatamente invocadas apenas para obter acesso ao `await`. Infelizmente, esse padrão resulta em menor determinismo na execução do grafo e na capacidade de análise estática das aplicações. Por essas razões, a ausência do `await` no nível superior foi vista como um risco maior do que os perigos introduzidos com o recurso.

## Suporte para o `await` no nível superior

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="não https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="não https://github.com/babel/proposals/issues/44"></feature-support>
