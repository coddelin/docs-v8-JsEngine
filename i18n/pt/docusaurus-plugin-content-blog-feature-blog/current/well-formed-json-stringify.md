---
title: '`JSON.stringify` Bem-formado'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-09-11
tags:
  - ECMAScript
  - ES2019
description: 'JSON.stringify agora gera sequências de escape para surrogates solitários, tornando sua saída Unicode válido (e representável em UTF-8).'
---
`JSON.stringify` anteriormente era especificado para retornar strings Unicode malformadas se a entrada contivesse algum surrogate solitário:

```js
JSON.stringify('\uD800');
// → '"�"'
```

[A proposta “`JSON.stringify` Bem-formado”](https://github.com/tc39/proposal-well-formed-stringify) altera `JSON.stringify` para que ele gere sequências de escape para surrogates solitários, tornando sua saída Unicode válido (e representável em UTF-8):

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Observe que `JSON.parse(stringified)` ainda produz os mesmos resultados de antes.

Este recurso é uma pequena correção que já era há muito necessária no JavaScript. É uma preocupação a menos para os desenvolvedores JavaScript. Em combinação com [_JSON ⊂ ECMAScript_](/features/subsume-json), ele permite a incorporação segura de dados transformados por JSON-stringify como literais em programas JavaScript, além de possibilitar gravar o código gerado em disco em qualquer codificação compatível com Unicode (por exemplo, UTF-8). Isso é extremamente útil para [casos de uso de metaprogramação](/features/subsume-json#embedding-json).

## Suporte ao recurso

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
