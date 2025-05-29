---
title: &apos;BigInt: inteiros de precisão arbitrária em JavaScript&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: &apos;BigInts são um novo tipo numérico em JavaScript que pode representar inteiros com precisão arbitrária. Este artigo explora alguns casos de uso e explica a nova funcionalidade no Chrome 67, comparando BigInts a Numbers em JavaScript.&apos;
tweet: &apos;990991035630206977&apos;
---
`BigInt`s são um novo tipo numérico em JavaScript que pode representar inteiros com precisão arbitrária. Com `BigInt`s, você pode armazenar e operar com segurança em grandes inteiros, mesmo além do limite seguro de inteiros para `Number`s. Este artigo explora alguns casos de uso e explica a nova funcionalidade no Chrome 67 comparando `BigInt`s com `Number`s em JavaScript.

<!--truncate-->
## Casos de uso

Inteiros de precisão arbitrária desbloqueiam muitos novos casos de uso para JavaScript.

`BigInt`s tornam possível realizar operações aritméticas de inteiros corretamente sem transbordamento. Isso, por si só, permite inúmeras novas possibilidades. Operações matemáticas com números grandes são comumente usadas em tecnologia financeira, por exemplo.

[IDs de inteiros grandes](https://developer.twitter.com/en/docs/basics/twitter-ids) e [carimbos de tempo de alta precisão](https://github.com/nodejs/node/pull/20220) não podem ser representados com segurança como `Number`s em JavaScript. Isso [frequentemente](https://github.com/stedolan/jq/issues/1399) leva a [erros no mundo real](https://github.com/nodejs/node/issues/12115) e faz com que os desenvolvedores JavaScript os representem como strings. Com `BigInt`, esses dados agora podem ser representados como valores numéricos.

`BigInt` poderia formar a base de uma implementação futura de `BigDecimal`. Isso seria útil para representar somas de dinheiro com precisão decimal e para operar com elas de forma precisa (também conhecido como o problema `0.10 + 0.20 !== 0.30`).

Anteriormente, aplicativos JavaScript com qualquer um desses casos de uso tinham que recorrer a bibliotecas desenvolvidas por usuários que emulam a funcionalidade semelhante a `BigInt`. Quando `BigInt` se tornar amplamente disponível, esses aplicativos podem eliminar essas dependências em tempo de execução em favor de `BigInt`s nativos. Isso ajuda a reduzir o tempo de carregamento, análise e compilação e, além disso, oferece melhorias significativas de desempenho em tempo de execução.

![A implementação nativa de `BigInt` no Chrome tem melhor desempenho do que bibliotecas populares desenvolvidas por usuários.](/_img/bigint/performance.svg)

## O status quo: `Number`

`Number`s em JavaScript são representados como [pontos flutuantes de precisão dupla](https://en.wikipedia.org/wiki/Floating-point_arithmetic). Isso significa que eles têm precisão limitada. A constante `Number.MAX_SAFE_INTEGER` fornece o maior inteiro possível que pode ser incrementado com segurança. Seu valor é `2**53-1`.

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**Nota:** Para facilitar a leitura, estou agrupando os dígitos deste número grande por milhar, usando sublinhados como separadores. [A proposta dos separadores literais numéricos](/features/numeric-separators) permite exatamente isso para os literais numéricos comuns em JavaScript.
:::

Incrementá-lo uma vez dá o resultado esperado:

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

Mas, se o incrementarmos uma segunda vez, o resultado já não será representado exatamente como um `Number` em JavaScript:

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

Note como `max + 1` produz o mesmo resultado que `max + 2`. Sempre que obtemos esse valor específico em JavaScript, não há como saber se ele é preciso ou não. Qualquer cálculo com inteiros fora do intervalo de inteiros seguros (ou seja, de `Number.MIN_SAFE_INTEGER` a `Number.MAX_SAFE_INTEGER`) potencialmente perde precisão. Por essa razão, só podemos confiar em valores numéricos inteiros dentro do intervalo seguro.

## A novidade: `BigInt`

`BigInt`s são um novo tipo numérico em JavaScript que podem representar inteiros com [precisão arbitrária](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic). Com `BigInt`s, você pode armazenar e operar com segurança em inteiros grandes, mesmo além do limite seguro de inteiros para `Number`s.

Para criar um `BigInt`, adicione o sufixo `n` a qualquer literal inteiro. Por exemplo, `123` se torna `123n`. A função global `BigInt(number)` pode ser usada para converter um `Number` em um `BigInt`. Em outras palavras, `BigInt(123) === 123n`. Vamos usar essas duas técnicas para resolver o problema que estávamos tendo anteriormente:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

Aqui está outro exemplo, onde estamos multiplicando dois `Number`s:

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

Olhando para os dígitos menos significativos, `9` e `3`, sabemos que o resultado da multiplicação deveria terminar em `7` (porque `9 * 3 === 27`). No entanto, o resultado termina em um monte de zeros. Isso não pode estar certo! Vamos tentar novamente com `BigInt`s:

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

Desta vez obtivemos o resultado correto.

Os limites de inteiros seguros para `Number`s não se aplicam aos `BigInt`s. Portanto, com `BigInt` podemos realizar operações aritméticas inteiras corretas sem nos preocupar em perder precisão.

### Um novo primitivo

`BigInt`s são um novo primitivo na linguagem JavaScript. Como tal, eles têm seu próprio tipo, que pode ser detectado usando o operador `typeof`:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

Como `BigInt`s são um tipo separado, um `BigInt` nunca é estritamente igual a um `Number`, por exemplo, `42n !== 42`. Para comparar um `BigInt` com um `Number`, converta um deles para o tipo do outro antes de fazer a comparação ou use igualdade abstrata (`==`):

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

Quando convertido em um booleano (o que acontece ao usar `if`, `&&`, `||`, ou `Boolean(int)`, por exemplo), os `BigInt`s seguem a mesma lógica que os `Number`s.

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → exibe 'else', porque `0n` é falsy.
```

### Operadores

`BigInt`s suportam os operadores mais comuns. `+`, `-`, `*` e `**` binários funcionam como esperado. `/` e `%` funcionam, arredondando para zero conforme necessário. As operações bit a bit `|`, `&`, `<<`, `>>` e `^` executam aritmética bit a bit assumindo uma [representação de complemento de dois](https://en.wikipedia.org/wiki/Two%27s_complement) para valores negativos, assim como fazem com `Number`s.

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

O operador unário `-` pode ser usado para denotar um valor `BigInt` negativo, por exemplo, `-42n`. O operador unário `+` _não_ é suportado porque quebraria códigos asm.js, que esperam que `+x` sempre produza um `Number` ou uma exceção.

Um detalhe a ser observado é que não é permitido misturar operações entre `BigInt`s e `Number`s. Isso é bom, pois qualquer coerção implícita poderia acarretar perda de informações. Considere este exemplo:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

Qual deveria ser o resultado? Não há uma boa resposta aqui. `BigInt`s não podem representar frações, e `Number`s não podem representar `BigInt`s além do limite seguro de inteiros. Por essa razão, misturar operações entre `BigInt`s e `Number`s resulta em uma exceção `TypeError`.

A única exceção a esta regra são os operadores de comparação, como `===` (como discutido anteriormente), `<` e `>=` – porque eles retornam booleanos, não há risco de perda de precisão.

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

Como `BigInt`s e `Number`s geralmente não se misturam, evite sobrecarregar ou “atualizar magicamente” seu código existente para usar `BigInt`s em vez de `Number`s. Decida em qual desses dois domínios operar e mantenha-se nele. Para _novas_ APIs que operam com inteiros potencialmente grandes, `BigInt` é a melhor escolha. `Number`s ainda fazem sentido para valores inteiros que estão dentro do intervalo seguro de inteiros.

Outra coisa a notar é que o [operador `>>>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift), que realiza um deslocamento à direita sem sinal, não faz sentido para `BigInt`s, já que eles são sempre com sinal. Por esta razão, `>>>` não funciona com `BigInt`s.

### API

Várias novas APIs específicas para `BigInt` estão disponíveis.

O construtor global `BigInt` é semelhante ao construtor `Number`: ele converte seu argumento em um `BigInt` (como mencionado anteriormente). Se a conversão falhar, ele lança uma exceção `SyntaxError` ou `RangeError`.

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

O primeiro desses exemplos passa um literal numérico para `BigInt()`. Isso é uma má prática, já que `Number`s sofrem com perda de precisão, e assim podemos já perder precisão antes que a conversão `BigInt` aconteça:

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

Por esta razão, recomendamos ou utilizar a notação literal do `BigInt` (com o sufixo `n`), ou passar uma string (não um `Number`!) para `BigInt()` em vez disso:

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

Duas funções de biblioteca permitem envolver valores `BigInt` como inteiros assinados ou não assinados, limitados a um número específico de bits. `BigInt.asIntN(width, value)` envolve um valor `BigInt` para um inteiro binário assinado de `width` dígitos, e `BigInt.asUintN(width, value)` faz o mesmo para um inteiro binário não assinado. Se você estiver fazendo aritmética de 64 bits, por exemplo, pode usar essas APIs para se manter dentro do intervalo apropriado:

```js
// O maior valor de BigInt possível que pode ser representado como um
// inteiro de 64 bits assinado.
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
→ 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ negativo devido ao estouro
```

Observe como ocorre o estouro assim que passamos um valor de `BigInt` que excede o intervalo de um inteiro de 64 bits (ou seja, 63 bits para o valor numérico absoluto + 1 bit para o sinal).

`BigInt`s possibilitam a representação precisa de inteiros assinados e não assinados de 64 bits, que são comumente usados em outras linguagens de programação. Dois novos tipos de arrays tipados, `BigInt64Array` e `BigUint64Array`, facilitam a representação eficiente e a operação em listas desses valores:

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

O tipo `BigInt64Array` garante que seus valores permaneçam dentro do limite assinado de 64 bits.

```js
// Maior valor de BigInt possível que pode ser representado como
// inteiro assinado de 64 bits.
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ negativo devido ao estouro
```

O tipo `BigUint64Array` faz o mesmo, mas usando o limite não assinado de 64 bits.

## Polyfill e transpile de BigInts

No momento da escrita, `BigInt`s são suportados apenas no Chrome. Outros navegadores estão ativamente trabalhando para implementá-los. Mas e se você quiser usar a funcionalidade de `BigInt` *hoje* sem sacrificar a compatibilidade com navegadores? Fico feliz que você perguntou! A resposta é… interessante, para dizer o mínimo.

Ao contrário da maioria dos outros recursos modernos do JavaScript, `BigInt`s não podem ser razoavelmente transpilados para ES5.

A proposta de `BigInt` [altera o comportamento de operadores](#operators) (como `+`, `>=`, etc.) para funcionar com `BigInt`s. Essas alterações são impossíveis de implementar diretamente via polyfill, e também dificultam (na maioria dos casos) o transpile de código `BigInt` para código de fallback usando Babel ou ferramentas similares. Isso ocorre porque esse transpile teria que substituir *todo operador* no programa por uma chamada a uma função que realiza verificações de tipo nos inputs, o que acarretaria em uma penalidade de desempenho inaceitável. Além disso, aumentaria muito o tamanho do arquivo de qualquer *bundle* transpilado, afetando negativamente os tempos de download, análise e compilação.

Uma solução mais viável e preparada para o futuro é escrever seu código usando [a biblioteca JSBI](https://github.com/GoogleChromeLabs/jsbi#why) por enquanto. JSBI é uma porta JavaScript da implementação de `BigInt` no V8 e Chrome — por design, ela se comporta exatamente como a funcionalidade nativa de `BigInt`. A diferença é que, em vez de depender da sintaxe, ela expõe [uma API](https://github.com/GoogleChromeLabs/jsbi#how):

```js
import JSBI from &apos;./jsbi.mjs&apos;;

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt(&apos;2&apos;);
const result = JSBI.add(max, two);
console.log(result.toString());
// → &apos;9007199254740993&apos;
```

Quando `BigInt`s forem suportados nativamente em todos os navegadores importantes, você poderá [usar `babel-plugin-transform-jsbi-to-bigint` para transpilar seu código para código nativo de `BigInt`](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) e remover a dependência do JSBI. Por exemplo, o código acima seria transpilado como:

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → &apos;9007199254740993&apos;
```

## Leituras adicionais

Se você está interessado em como `BigInt`s funcionam nos bastidores (por exemplo, como eles são representados na memória, e como operações com eles são realizadas), [leia nosso post no blog do V8 com detalhes de implementação](/blog/bigint).

## Suporte a `BigInt`

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
