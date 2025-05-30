---
title: "`Object.fromEntries`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), encantador de JavaScript"
avatars: 
  - "mathias-bynens"
date: 2019-06-18
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries é uma adição útil à biblioteca JavaScript incorporada que complementa Object.entries."
tweet: "1140993821897121796"
---
`Object.fromEntries` é uma adição útil à biblioteca JavaScript incorporada. Antes de explicar o que ele faz, é útil entender a API pré-existente `Object.entries`.

## `Object.entries`

A API `Object.entries` existe há algum tempo.

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

Para cada par de chave-valor em um objeto, `Object.entries` fornece um array em que o primeiro elemento é a chave e o segundo elemento é o valor.

`Object.entries` é especialmente útil em combinação com `for`-`of`, pois permite iterar de forma muito elegante sobre todos os pares de chave-valor em um objeto:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`O valor de ${key} é ${value}.`);
}
// Registros:
// O valor de x é 42.
// O valor de y é 50.
```

Infelizmente, não há uma maneira fácil de voltar do resultado de entries para um objeto equivalente… até agora!

## `Object.fromEntries`

A nova API `Object.fromEntries` realiza a operação inversa de `Object.entries`. Isso facilita a reconstrução de um objeto com base em seus entries:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Um caso de uso comum é a transformação de objetos. Agora você pode fazer isso iterando sobre seus entries e usando métodos de array com os quais você já pode estar familiarizado:

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

Neste exemplo, estamos `filter`ando o objeto para obter apenas chaves de comprimento `1`, ou seja, apenas as chaves `x` e `y`, mas não a chave `abc`. Em seguida, `map`eamos os entries restantes e retornamos um par atualizado de chave-valor para cada um. Neste exemplo, dobramos cada valor multiplicando-o por `2`. O resultado final é um novo objeto, com apenas as propriedades `x` e `y`, e os novos valores.

<!--truncate-->
## Objetos vs. mapas

O JavaScript também suporta `Map`s, que frequentemente são uma estrutura de dados mais apropriada do que objetos regulares. Portanto, em código que você tem controle total, pode estar usando mapas em vez de objetos. No entanto, como desenvolvedor, você nem sempre pode escolher a representação. Às vezes, os dados com os quais você está operando vêm de uma API externa ou de alguma função de biblioteca que fornece um objeto em vez de um mapa.

`Object.entries` tornou fácil converter objetos em mapas:

```js
const object = { language: 'JavaScript', coolness: 9001 };

// Converter o objeto em um mapa:
const map = new Map(Object.entries(object));
```

O inverso é igualmente útil: mesmo que seu código esteja usando mapas, você pode precisar serializar seus dados em algum momento, por exemplo, para transformá-los em JSON para enviar uma solicitação de API. Ou talvez você precise passar os dados para outra biblioteca que espera um objeto em vez de um mapa. Nesses casos, você precisa criar um objeto com base nos dados do mapa. `Object.fromEntries` torna isso trivial:

```js
// Converter o mapa de volta em um objeto:
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

Com `Object.entries` e `Object.fromEntries` na linguagem, agora você pode facilmente converter entre mapas e objetos.

### Aviso: cuidado com a perda de dados

Ao converter mapas em objetos simples, como no exemplo acima, há uma suposição implícita de que cada chave é única ao ser transformada em uma string. Se essa suposição não se sustenta, ocorre perda de dados:

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// Nota: o valor 'a' não está em lugar algum, pois ambas as chaves
// são transformadas na mesma string '[object Object]'.
```

Antes de usar `Object.fromEntries` ou qualquer outra técnica para converter um mapa em um objeto, certifique-se de que as chaves do mapa produzem resultados `toString` únicos.

## Suporte para `Object.fromEntries`

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
