---
title: &apos;`globalThis`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: &apos;globalThis introduz um mecanismo unificado para acessar o this global em qualquer ambiente JavaScript, independentemente do objetivo do script.&apos;
tweet: &apos;1151140681374547969&apos;
---
Se você já escreveu JavaScript para uso em um navegador web antes, pode ter usado `window` para acessar o `this` global. No Node.js, você pode ter usado `global`. Se você escreveu um código que deve funcionar em qualquer um dos ambientes, pode ter detectado qual deles está disponível e usado isso - mas a lista de identificadores a verificar cresce com o número de ambientes e casos de uso que você deseja suportar. Isso foge do controle rapidamente:

<!--truncate-->
```js
// Uma tentativa ingênua de obter o `this` global. Não use isso!
const getGlobalThis = () => {
  if (typeof globalThis !== &apos;undefined&apos;) return globalThis;
  if (typeof self !== &apos;undefined&apos;) return self;
  if (typeof window !== &apos;undefined&apos;) return window;
  if (typeof global !== &apos;undefined&apos;) return global;
  // Nota: isso ainda pode retornar o resultado errado!
  if (typeof this !== &apos;undefined&apos;) return this;
  throw new Error(&apos;Não é possível localizar o `this` global&apos;);
};
const theGlobalThis = getGlobalThis();
```

Para obter mais detalhes sobre por que a abordagem acima é insuficiente (bem como uma técnica ainda mais complicada), leia [_um horrível polyfill `globalThis` em JavaScript universal_](https://mathiasbynens.be/notes/globalthis).

[A proposta `globalThis`](https://github.com/tc39/proposal-global) introduz um mecanismo *unificado* para acessar o `this` global em qualquer ambiente JavaScript (navegador, Node.js, ou outra coisa?), independentemente do objetivo do script (script clássico ou módulo?).

```js
const theGlobalThis = globalThis;
```

Observe que códigos modernos podem não precisar acessar o `this` global de forma alguma. Com módulos JavaScript, você pode `importar` e `exportar` funcionalidades de forma declarativa em vez de mexer no estado global. `globalThis` ainda é útil para polyfills e outras bibliotecas que precisam de acesso global.

## Suporte a `globalThis`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
