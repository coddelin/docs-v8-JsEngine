---
title: 'Subsume JSON ou seja, JSON ⊂ ECMAScript'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-08-14
tags:
  - ES2019
description: 'JSON agora é um subconjunto sintático do ECMAScript.'
tweet: '1161649929904885762'
---
Com a [proposta _JSON ⊂ ECMAScript_](https://github.com/tc39/proposal-json-superset), JSON torna-se um subconjunto sintático do ECMAScript. Se você está surpreso por isso ainda não ser o caso, você não está sozinho!

## O comportamento do ES2018 antigo

Em ES2018, literais string do ECMAScript não podiam conter os caracteres U+2028 LINE SEPARATOR e U+2029 PARAGRAPH SEPARATOR sem escapá-los, porque eles são considerados terminadores de linhas mesmo nesse contexto:

```js
// Uma string contendo um caractere bruto U+2028.
const LS = ' ';
// → ES2018: SyntaxError

// Uma string contendo um caractere bruto U+2029, produzida por `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
```

Isso é problemático porque strings JSON _podem_ conter esses caracteres. Como resultado, os desenvolvedores tinham que implementar lógica de pós-processamento especializada ao incorporar JSON válido em programas ECMAScript para lidar com esses caracteres. Sem essa lógica, o código teria bugs sutis ou até mesmo [problemas de segurança](#security)!

<!--truncate-->
## O novo comportamento

Em ES2019, literais string agora podem conter caracteres brutos U+2028 e U+2029, eliminando o desajuste confuso entre ECMAScript e JSON.

```js
// Uma string contendo um caractere bruto U+2028.
const LS = ' ';
// → ES2018: SyntaxError
// → ES2019: sem exceção

// Uma string contendo um caractere bruto U+2029, produzida por `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
// → ES2019: sem exceção
```

Essa pequena melhoria simplifica bastante o modelo mental para os desenvolvedores (menos um caso especial para lembrar!), e reduz a necessidade de lógica especializada de pós-processamento ao incorporar JSON válido em programas ECMAScript.

## Incorporando JSON em programas JavaScript

Como resultado desta proposta, `JSON.stringify` agora pode ser usado para gerar literais de strings ECMAScript válidos, literais de objetos e literais de arrays. E, graças à proposta separada [_`JSON.stringify` bem formados_](/features/well-formed-json-stringify), esses literais podem ser representados com segurança em UTF-8 e outras codificações (o que é útil se você estiver tentando gravá-los em um arquivo no disco). Isso é muito útil para casos de uso de metaprogramação, como criar dinamicamente código fonte JavaScript e gravá-lo no disco.

Aqui está um exemplo de criação de um programa JavaScript válido que incorpora um objeto de dados fornecido, aproveitando a gramática JSON que agora é um subconjunto do ECMAScript:

```js
// Um objeto JavaScript (ou array, ou string) representando alguns dados.
const data = {
  LineTerminators: '\n\r  ',
  // Nota: a string contém 4 caracteres: '\n\r\u2028\u2029'.
};

// Transforme os dados na sua forma JSON-stringificada. Graças ao JSON ⊂
// ECMAScript, a saída de `JSON.stringify` é garantida a ser
// um literal ECMAScript sintaticamente válido:
const jsObjectLiteral = JSON.stringify(data);

// Crie um programa ECMAScript válido que incorpora os dados como um objeto
// literal.
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// (Escapamentos adicionais são necessários se o alvo for um <script> inline.)

// Escreva um arquivo contendo o programa ECMAScript no disco.
saveToDisk(filePath, program);
```

O script acima produz o seguinte código, que avalia para um objeto equivalente:

```js
const data = {"LineTerminators":"\n\r  "};
```

## Incorporando JSON em programas JavaScript com `JSON.parse`

Como explicado em [_o custo do JSON_](/blog/cost-of-javascript-2019#json), em vez de incorporar os dados como um literal de objeto JavaScript, assim:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…os dados podem ser representados na forma JSON-stringificada e, então, analisados como JSON em tempo de execução, para melhorar o desempenho no caso de objetos grandes (10 kB+):

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Aqui está um exemplo de implementação:

```js
// Um objeto JavaScript (ou array, ou string) representando alguns dados.
const data = {
  LineTerminators: '\n\r  ',
  // Nota: a string contém 4 caracteres: '\n\r\u2028\u2029'.
};

// Transforme os dados na sua forma JSON-stringificada.
const json = JSON.stringify(data);

// Agora, queremos inserir o JSON em um corpo de script como um literal de string JavaScript per https://v8.dev/blog/cost-of-javascript-2019#json,
// escapando caracteres especiais como `"` nos dados.
// Graças ao JSON ⊂ ECMAScript, a saída de `JSON.stringify` é
// garantida a ser um literal ECMAScript sintaticamente válido:
const jsStringLiteral = JSON.stringify(json);
// Crie um programa ECMAScript válido que incorpora o literal de string
// JavaScript representando os dados JSON dentro de uma chamada `JSON.parse`.
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// (Escapamento adicional é necessário se o destino for um <script> embutido.)

// Escreva um arquivo contendo o programa ECMAScript no disco.
saveToDisk(filePath, program);
```

O script acima produz o seguinte código, que avalia para um objeto equivalente:

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

O [benchmark do Google comparando `JSON.parse` com literais de objeto JavaScript](https://github.com/GoogleChromeLabs/json-parse-benchmark) utiliza essa técnica em sua etapa de construção. A funcionalidade “copiar como JS” do DevTools do Chrome foi [significativamente simplificada](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js) ao adotar uma técnica semelhante.

## Uma observação sobre segurança

JSON ⊂ ECMAScript reduz o descompasso entre JSON e ECMAScript no caso de literais de string especificamente. Como literais de string podem ocorrer dentro de outras estruturas de dados suportadas pelo JSON, como objetos e arrays, também lida com esses casos, como mostrado nos exemplos de código acima.

No entanto, U+2028 e U+2029 ainda são tratados como caracteres terminadores de linha em outras partes da gramática ECMAScript. Isso significa que ainda existem casos em que não é seguro injetar JSON em programas JavaScript. Considere este exemplo, onde um servidor injeta algum conteúdo fornecido pelo usuário em uma resposta HTML após rodá-lo através de `JSON.stringify()`:

```ejs
<script>
  // Informações de depuração:
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

Note que o resultado de `JSON.stringify` é injetado em um comentário de uma única linha dentro do script.

Quando usado como no exemplo acima, `JSON.stringify()` é garantido a retornar uma única linha. O problema é que o que constitui uma “única linha” [difere entre JSON e ECMAScript](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136). Se `ua` contiver um caractere U+2028 ou U+2029 não escapado, saímos do comentário de uma linha e executamos o resto de `ua` como código-fonte JavaScript:

```html
<script>
  // Informações de depuração:
  // User-Agent: "String fornecida pelo usuário<U+2028>  alert('XSS');//"
</script>
<!-- …é equivalente a: -->
<script>
  // Informações de depuração:
  // User-Agent: "String fornecida pelo usuário
  alert('XSS');//"
</script>
```

:::note
**Nota:** No exemplo acima, o caractere U+2028 bruto e não escapado é representado como `<U+2028>` para facilitar o acompanhamento.
:::

JSON ⊂ ECMAScript não ajuda aqui, já que impacta apenas literais de string — e neste caso, a saída de `JSON.stringify` é injetada em uma posição onde não produz diretamente um literal de string JavaScript.

A menos que um pós-processamento especial para esses dois caracteres seja introduzido, o trecho de código acima apresenta uma vulnerabilidade de script entre sites (XSS)!

:::note
**Nota:** É extremamente importante pós-processar a entrada controlada pelo usuário para escapar quaisquer sequências de caracteres especiais, dependendo do contexto. Neste caso específico, estamos injetando em uma tag `<script>`, portanto, devemos (também) [escapar `</script`, `<script` e `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations).
:::

## Suporte ao JSON ⊂ ECMAScript

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="yes"
                 safari="yes"
                 nodejs="10"
                 babel="yes https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
