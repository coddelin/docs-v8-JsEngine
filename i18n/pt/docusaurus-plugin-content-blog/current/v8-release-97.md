---
title: "Lançamento do V8 v9.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-11-05
tags:
 - lançamento
description: "O lançamento do V8 v9.7 traz novos métodos de JavaScript para busca reversa em arrays."
tweet: ""
---
A cada quatro semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é branqueada a partir do Git principal do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7), que está em beta até seu lançamento em coordenação com o Chrome 97 Stable em algumas semanas. O V8 v9.7 está repleto de várias novidades voltadas para desenvolvedores. Este post fornece um preview de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### `findLast` e `findLastIndex` métodos de array

Os métodos `findLast` e `findLastIndex` em `Array`s e `TypedArray`s encontram elementos que correspondem a um predicado a partir do final de um array.

Por exemplo:

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (último elemento par)
```

Esses métodos estão disponíveis sem necessidade de sinalizador a partir da versão v9.7.

Para mais detalhes, consulte nosso [explicativo de funcionalidade](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end).

## API do V8

Por favor, use `git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` para obter uma lista das mudanças na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 9.7 -t branch-heads/9.7` para experimentar os novos recursos no V8 v9.7. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
