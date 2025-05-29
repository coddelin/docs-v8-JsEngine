---
title: 'Índices de correspondência RegExp'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), regularmente expressando novos recursos'
avatars:
  - 'maya-armyanova'
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: 'Os índices de correspondência RegExp fornecem os índices `início` e `fim` de cada grupo capturado correspondente.'
tweet: '1206970814400270338'
---
O JavaScript agora está equipado com um novo aprimoramento de expressão regular, chamado “índices de correspondência”. Imagine que você deseja encontrar nomes de variáveis inválidas em código JavaScript que coincidem com palavras reservadas e exibir um acento circunflexo e um “sublinhado” sob o nome da variável, como:

<!--truncate-->
```js
const function = foo;
      ^------- Nome de variável inválido
```

No exemplo acima, `function` é uma palavra reservada e não pode ser usada como nome de variável. Para isso, podemos escrever a seguinte função:

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // Índice `1` corresponde ao primeiro grupo capturado.
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // Ajuste a posição do acento circunflexo.
    '^' +
    '-'.repeat(end - start - 1) +   // Adicione o sublinhado.
    ' ' + message;                  // Adicione a mensagem.
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // código com erro
displayError(code, 'Nome de variável inválido');
```

:::note
**Nota:** Para simplificar, o exemplo acima contém apenas algumas das [palavras reservadas](https://mathiasbynens.be/notes/reserved-keywords) do JavaScript.
:::

Resumidamente, o novo array `indices` armazena as posições de início e fim de cada grupo capturado correspondente. Este novo array está disponível quando a expressão regular fonte usa o sinalizador `/d` para todos os métodos integrados que produzem objetos de correspondência de expressão regular, incluindo `RegExp#exec`, `String#match` e [`String#matchAll`](https://v8.dev/features/string-matchall).

Leia mais se estiver interessado em como funciona em mais detalhes.

## Motivação

Vamos para um exemplo mais completo e pensar em como resolver a tarefa de analisar uma linguagem de programação (por exemplo, o que o [compilador TypeScript](https://github.com/microsoft/TypeScript/tree/master/src/compiler) faz) — primeiro divida o código fonte de entrada em tokens, depois forneça uma estrutura sintática para esses tokens. Se o usuário escrever algum código sintaticamente incorreto, você desejará apresentar a ele um erro significativo, idealmente apontando a localização onde o código problemático foi encontrado pela primeira vez. Por exemplo, dado o seguinte trecho de código:

```js
let foo = 42;
// algum outro código
let foo = 1337;
```

Queremos apresentar ao programador um erro como:

```js
let foo = 1337;
    ^
SyntaxError: Identificador 'foo' já foi declarado
```

Para alcançar isso, precisamos de alguns blocos de construção, sendo o primeiro deles reconhecer identificadores do TypeScript. Então vamos nos concentrar em identificar a localização exata onde o erro ocorreu. Considere o seguinte exemplo, usando uma regex para verificar se uma string é um identificador válido:

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**Nota:** Um analisador real poderia usar os recém-introduzidos [escapes de propriedades em regexes](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples) e usar a seguinte expressão regular para corresponder a todos os nomes de identificadores válidos do ECMAScript:

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

Por simplicidade, vamos manter nossa regex anterior, que corresponde apenas a caracteres latinos, números e sublinhados.
:::

Se encontrarmos um erro com uma declaração de variável como acima e quisermos imprimir a posição exata para o usuário, podemos querer estender a regex acima e usar uma função semelhante:

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

Pode-se usar a propriedade `index` no objeto de correspondência retornado por `RegExp.prototype.exec`, que retorna a posição inicial da correspondência inteira. Para casos de uso como o descrito acima, porém, você frequentemente desejará usar (possivelmente múltiplos) grupos de captura. Até recentemente, o JavaScript não expunha os índices onde começam e terminam as substrings capturadas pelos grupos de captura.

## Explicação dos índices de correspondência RegExp

Idealmente, queremos imprimir um erro na posição do nome da variável, não na palavra-chave `let`/`const` (como o exemplo acima faz). Mas, para isso, precisaríamos encontrar a posição do grupo capturado com índice `2`. (O índice `1` refere-se ao grupo capturado `(let|const|var)` e `0` refere-se à correspondência inteira.)

Como mencionado acima, [o novo recurso do JavaScript](https://github.com/tc39/proposal-regexp-match-indices) adiciona uma propriedade `indices` ao resultado (o array de substrings) de `RegExp.prototype.exec()`. Vamos aprimorar nosso exemplo anterior para utilizar essa nova propriedade:

```js
function getVariablePosition(source) {
  // Observe a flag `d`, que habilita `match.indices`
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition(&apos;let foo&apos;);
// → [4, 7]
```

Este exemplo retorna o array `[4, 7]`, que é a posição `[start, end)` da substring correspondente do grupo com índice `2`. Com base nessa informação, nosso compilador agora pode exibir o erro desejado.

## Recursos adicionais

O objeto `indices` também contém uma propriedade `groups`, que pode ser indexada pelos nomes dos [grupos de captura nomeados](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups). Usando isso, a função acima pode ser reescrita como:

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition(&apos;let foo&apos;);
```

## Suporte para índices de correspondência de RegExp

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
