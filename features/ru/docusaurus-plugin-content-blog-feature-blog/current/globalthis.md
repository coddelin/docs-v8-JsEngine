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
description: &apos;globalThis вводит единый механизм для доступа к глобальному объекту this в любой среде JavaScript, независимо от цели сценария.&apos;
tweet: &apos;1151140681374547969&apos;
---
Если вы писали JavaScript для использования в веб-браузере, возможно, вы использовали `window` для доступа к глобальному объекту `this`. В Node.js вы могли использовать `global`. Если вы писали код, который должен работать в обеих средах, вы могли определить, какой из них доступен, и затем использовать его — но список идентификаторов, которые нужно проверять, растет с увеличением числа окружений и случаев использования. Это быстро выходит из-под контроля:

<!--truncate-->
```js
// Наивная попытка получения глобального объекта `this`. Не используйте это!
const getGlobalThis = () => {
  if (typeof globalThis !== &apos;undefined&apos;) return globalThis;
  if (typeof self !== &apos;undefined&apos;) return self;
  if (typeof window !== &apos;undefined&apos;) return window;
  if (typeof global !== &apos;undefined&apos;) return global;
  // Замечание: это может все еще вернуть неправильный результат!
  if (typeof this !== &apos;undefined&apos;) return this;
  throw new Error(&apos;Невозможно найти глобальный объект `this`&apos;);
};
const theGlobalThis = getGlobalThis();
```

Для получения более подробной информации о том, почему вышеописанный подход недостаточен (а также о ещё более сложной технике), прочитайте [_ужасный полифилл `globalThis` в универсальном JavaScript_](https://mathiasbynens.be/notes/globalthis).

[Предложение `globalThis`](https://github.com/tc39/proposal-global) вводит *унифицированный* механизм для доступа к глобальному `this` в любой среде JavaScript (браузер, Node.js или что-то иное), независимо от цели сценария (классический сценарий или модуль?).

```js
const theGlobalThis = globalThis;
```

Заметьте, что современный код может совсем не нуждаться в доступе к глобальному `this`. С помощью модулей JavaScript вы можете декларативно `import` и `export` функциональность вместо работы с глобальным состоянием. `globalThis` все еще полезен для полифиллов и других библиотек, которые требуют глобального доступа.

## Поддержка `globalThis`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
