---
title: &apos;`Symbol.prototype.description`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Symbol.prototype.description bietet eine ergonomische Möglichkeit, auf die Beschreibung eines Symbols zuzugreifen.&apos;
tweet: &apos;1143432835665211394&apos;
---
JavaScript-`Symbol`s können bei ihrer Erstellung eine Beschreibung erhalten:

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
```

Bisher war die einzige Möglichkeit, programmgesteuert auf diese Beschreibung zuzugreifen, indirekt über `Symbol.prototype.toString()`:

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
symbol.toString();
// → &apos;Symbol(foo)&apos;
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → &apos;foo&apos;
```

Der Code wirkt jedoch etwas magisch, ist nicht sehr selbsterklärend und verletzt das Prinzip „Absicht ausdrücken, nicht Implementierung“. Die obige Technik erlaubt es außerdem nicht, zwischen einem Symbol ohne Beschreibung (d.h. `Symbol()`) und einem Symbol mit leerem String als Beschreibung (d.h. `Symbol(&apos;&apos;)`) zu unterscheiden.

<!--truncate-->
[Der neue Getter `Symbol.prototype.description`](https://tc39.es/ecma262/#sec-symbol.prototype.description) bietet eine ergonomischere Möglichkeit, auf die Beschreibung eines `Symbol`s zuzugreifen:

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
symbol.description;
// → &apos;foo&apos;
```

Bei `Symbol`s ohne Beschreibung gibt der Getter `undefined` zurück:

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## Unterstützung für `Symbol.prototype.description`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
