---
title: &apos;Importar atributos&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2024-01-31
tags:
  - ECMAScript
description: &apos;Atributos de importação: a evolução das afirmações de importação&apos;
tweet: &apos;&apos;
---

## Anteriormente

O V8 lançou o recurso [import assertions](https://chromestatus.com/feature/5765269513306112) na versão v9.1. Este recurso permitiu que declarações de importação de módulos incluíssem informações adicionais usando a palavra-chave `assert`. Essas informações adicionais atualmente são usadas para importar módulos JSON e CSS dentro de módulos JavaScript.

<!--truncate-->
## Atributos de importação

Desde então, as afirmações de importação evoluíram para [import attributes](https://github.com/tc39/proposal-import-attributes). O objetivo do recurso permanece o mesmo: permitir que declarações de importação de módulos incluam informações adicionais.

A diferença mais importante é que as afirmações de importação tinham semânticas apenas de afirmação, enquanto os atributos de importação têm semânticas mais relaxadas. Semânticas apenas de afirmação significam que as informações adicionais não afetam como um módulo é carregado, apenas se ele é carregado. Por exemplo, um módulo JSON é sempre carregado como módulo JSON por conta de seu tipo MIME, e a cláusula `assert { type: &apos;json&apos; }` só pode causar falha no carregamento se o tipo MIME do módulo solicitado não for `application/json`.

No entanto, as semânticas apenas de afirmação tinham uma falha fatal. Na web, a forma das requisições HTTP difere dependendo do tipo de recurso solicitado. Por exemplo, o cabeçalho [`Accept`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) afeta o tipo MIME da resposta, e o cabeçalho de metadados [`Sec-Fetch-Dest`](https://web.dev/articles/fetch-metadata) afeta se o servidor web aceita ou rejeita a requisição. Como uma afirmação de importação não podia afetar como carregar um módulo, ela não era capaz de alterar a forma da requisição HTTP. O tipo do recurso solicitado também afeta quais [Políticas de Segurança de Conteúdo](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) são usadas: as afirmações de importação não podiam trabalhar corretamente com o modelo de segurança da web.

Os atributos de importação relaxam as semânticas apenas de afirmação para permitir que os atributos afetem como um módulo é carregado. Em outras palavras, os atributos de importação podem gerar requisições HTTP que contenham os cabeçalhos `Accept` e `Sec-Fetch-Dest` apropriados. Para corresponder à sintaxe às novas semânticas, a antiga palavra-chave `assert` foi atualizada para `with`:

```javascript
// main.mjs
//
// Nova sintaxe &apos;with&apos;.
import json from &apos;./foo.json&apos; with { type: &apos;json&apos; };
console.log(json.answer); // 42
```

## `import()` dinâmico

De forma semelhante, a [importação dinâmica `import()`](https://v8.dev/features/dynamic-import#dynamic) também foi atualizada para aceitar uma opção `with`.

```javascript
// main.mjs
//
// Nova opção &apos;with&apos;.
const jsonModule = await import(&apos;./foo.json&apos;, {
  with: { type: &apos;json&apos; }
});
console.log(jsonModule.default.answer); // 42
```

## Disponibilidade de `with`

Os atributos de importação estão habilitados por padrão no V8 v12.3.

## Depreciação e eventual remoção de `assert`

A palavra-chave `assert` foi depreciada a partir do V8 v12.3 e está planejada para ser removida na versão v12.6. Por favor, use `with` em vez de `assert`! O uso da cláusula `assert` imprimirá um aviso no console incentivando o uso de `with`.

## Suporte para atributos de importação

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
