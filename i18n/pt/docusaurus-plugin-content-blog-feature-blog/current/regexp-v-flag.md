---
title: 'Flag `v` do RegExp com notação de conjunto e propriedades de strings'
author: 'Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer, e Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mark-davis'
  - 'markus-scherer'
  - 'mathias-bynens'
date: 2022-06-27
tags:
  - ECMAScript
description: 'A nova flag `v` do RegExp habilita o modo `unicodeSets`, desbloqueando suporte para classes de caracteres estendidas, incluindo propriedades Unicode de strings, notação de conjuntos e correspondência melhorada para maiúsculas e minúsculas.'
tweet: '1541419838513594368'
---
JavaScript suporta expressões regulares desde o ECMAScript 3 (1999). Dezesseis anos depois, o ES2015 introduziu [modo Unicode (a flag `u`)](https://mathiasbynens.be/notes/es6-unicode-regex), [modo sticky (a flag `y`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description), e [o getter `RegExp.prototype.flags`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags). Três anos depois, o ES2018 introduziu [modo `dotAll` (a flag `s`)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll), [afirmações lookbehind](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), [grupos de captura nomeados](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups), e [escapes de propriedades de caracteres Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes). E no ES2020, [`String.prototype.matchAll`](https://v8.dev/features/string-matchall) tornou mais fácil trabalhar com expressões regulares. As expressões regulares do JavaScript evoluíram bastante e continuam melhorando.

<!--truncate-->
O exemplo mais recente disso é [o novo modo `unicodeSets`, habilitado usando a flag `v`](https://github.com/tc39/proposal-regexp-v-flag). Este novo modo desbloqueia suporte para _classes de caracteres estendidas_, incluindo os seguintes recursos:

- [Propriedades Unicode de strings](/features/regexp-v-flag#unicode-properties-of-strings)
- [Notação de conjuntos + sintaxe literal de string](/features/regexp-v-flag#set-notation)
- [Correspondência melhorada para maiúsculas e minúsculas](/features/regexp-v-flag#ignoreCase)

Este artigo explora cada um desses recursos. Mas primeiro — veja como usar a nova flag:

```js
const re = /…/v;
```

A flag `v` pode ser combinada com flags de expressão regular existentes, com uma exceção notável. A flag `v` habilita todas as boas características da flag `u`, mas com recursos e melhorias adicionais — alguns dos quais são incompatíveis retroativamente com a flag `u`. É importante ressaltar que `v` é um modo completamente separado de `u` e não complementar. Por esta razão, as flags `v` e `u` não podem ser combinadas — tentar usar ambas as flags na mesma expressão resultará em um erro. As únicas opções válidas são: ou usar `u`, ou usar `v`, ou não usar nem `u` nem `v`. Mas como `v` é a opção mais completa em recursos, a escolha é fácil...

Vamos explorar a nova funcionalidade!

## Propriedades Unicode de strings

O Padrão Unicode atribui várias propriedades e valores de propriedades a cada símbolo. Por exemplo, para obter o conjunto de símbolos usados no script grego, pesquise no banco de dados Unicode por símbolos cujo valor da propriedade `Script_Extensions` inclua `Greek`.

Os escapes de propriedades de caracteres Unicode do ES2018 tornam possível acessar essas propriedades de caracteres Unicode nativamente em expressões regulares do ECMAScript. Por exemplo, o padrão `\p{Script_Extensions=Greek}` corresponde a todo símbolo usado no script grego:

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

Por definição, as propriedades de caracteres Unicode se expandem para um conjunto de pontos de código e podem, portanto, ser transpostas como uma classe de caracteres contendo os pontos de código correspondentes individualmente. Por exemplo, `\p{ASCII_Hex_Digit}` é equivalente a `[0-9A-Fa-f]`: ela sempre corresponde a um único caractere Unicode/ponto de código de cada vez. Em algumas situações, isso é insuficiente:

```js
// Unicode define uma propriedade de caractere chamada “Emoji”.
const re = /^\p{Emoji}$/u;

// Corresponde a um emoji que consiste em apenas 1 ponto de código:
re.test('⚽'); // '\u26BD'
// → true ✅

// Corresponde a um emoji que consiste em vários pontos de código:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

No exemplo acima, a expressão regular não corresponde ao emoji 👨🏾‍⚕️ porque ele consiste em vários pontos de código, e `Emoji` é uma propriedade _de caractere_ Unicode.

Felizmente, o Padrão Unicode também define várias [propriedades de strings](https://www.unicode.org/reports/tr18/#domain_of_properties). Essas propriedades expandem para um conjunto de strings, cada uma contendo um ou mais pontos de código. Em expressões regulares, propriedades de strings se traduzem em um conjunto de alternativas. Para ilustrar isso, imagine uma propriedade Unicode que se aplica às strings `&apos;a&apos;`, `&apos;b&apos;`, `&apos;c&apos;`, `&apos;W&apos;`, `&apos;xy&apos;` e `&apos;xyz&apos;`. Essa propriedade se traduz em qualquer um dos seguintes padrões de expressão regular (usando alternância): `xyz|xy|a|b|c|W` ou `xyz|xy|[a-cW]`. (Strings mais longas primeiro, para que um prefixo como `&apos;xy&apos;` não esconda uma string mais longa como `&apos;xyz&apos;`.) Diferentemente dos escapes de propriedades Unicode existentes, esse padrão pode corresponder a strings com vários caracteres. Aqui está um exemplo de uma propriedade de strings em uso:

```js
const re = /^\p{RGI_Emoji}$/v;

// Corresponde a um emoji que consiste em apenas 1 ponto de código:
re.test(&apos;⚽&apos;); // &apos;\u26BD&apos;
// → true ✅

// Corresponde a um emoji que consiste em múltiplos pontos de código:
re.test(&apos;👨🏾‍⚕️&apos;); // &apos;\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F&apos;
// → true ✅
```

Este trecho de código se refere à propriedade de strings `RGI_Emoji`, que o Unicode define como "o subconjunto de todos os emojis válidos (caracteres e sequências) recomendados para intercâmbio geral". Com isso, agora podemos corresponder emojis independentemente do número de pontos de código que eles consistem internamente!

A flag `v` habilita suporte para as seguintes propriedades Unicode de strings desde o início:

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

Essa lista de propriedades suportadas pode aumentar no futuro à medida que o Padrão Unicode definir propriedades adicionais de strings. Embora todas as propriedades atuais de strings sejam relacionadas a emojis, as futuras propriedades de strings podem atender a casos de uso completamente diferentes.

:::note
**Nota:** Embora as propriedades de strings atualmente estejam disponíveis apenas com a nova flag `v`, [planejamos eventualmente disponibilizá-las no modo `u` também](https://github.com/tc39/proposal-regexp-v-flag/issues/49).
:::

## Notação de conjuntos + sintaxe literal de string

Ao trabalhar com escapes `\p{…}` (sejam propriedades de caracteres ou as novas propriedades de strings), pode ser útil realizar diferença/subtração ou interseção. Com a flag `v`, agora as classes de caracteres podem ser aninhadas, e essas operações de conjunto podem ser realizadas dentro delas, em vez de usar asserções lookahead ou lookbehind adjacentes ou classes de caracteres longas expressando os intervalos calculados.

### Diferença/subtração com `--`

A sintaxe `A--B` pode ser usada para corresponder a strings _em `A`, mas não em `B`_, também conhecida como diferença/subtração.

Por exemplo, e se você quiser corresponder a todos os símbolos gregos, exceto a letra `π`? Com a notação de conjuntos, resolver isso é trivial:

```js
/[\p{Script_Extensions=Greek}--π]/v.test(&apos;π&apos;); // → false
```

Ao usar `--` para diferença/subtração, o mecanismo de expressão regular faz o trabalho duro para você, mantendo seu código legível e fácil de manter.

E se, em vez de um único caractere, quisermos subtrair o conjunto de caracteres `α`, `β` e `γ`? Sem problemas — podemos usar uma classe de caracteres aninhada e subtrair seu conteúdo:

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test(&apos;α&apos;); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test(&apos;β&apos;); // → false
```

Outro exemplo é corresponder a dígitos não ASCII, por exemplo, para convertê-los em dígitos ASCII mais tarde:

```js
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;𑜹&apos;); // → true
/[\p{Decimal_Number}--[0-9]]/v.test(&apos;4&apos;); // → false
```

A notação de conjuntos também pode ser usada com as novas propriedades de strings:

```js
// Nota: 🏴 consiste em 7 pontos de código.

/^\p{RGI_Emoji_Tag_Sequence}$/v.test(&apos;🏴&apos;); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test(&apos;🏴&apos;); // → false
```

Este exemplo corresponde a qualquer sequência de tags de emoji RGI _exceto_ a bandeira da Escócia. Observe o uso de `\q{…}`, que é outra nova peça de sintaxe para literais de string dentro de classes de caracteres. Por exemplo, `\q{a|bc|def}` corresponde às strings `a`, `bc` e `def`. Sem `\q{…}`, não seria possível subtrair strings codificadas com vários caracteres.

### Interseção com `&&`

A sintaxe `A&&B` corresponde a strings que estão _tanto em `A` quanto em `B`_, também conhecida como interseção. Isso permite que você faça coisas como corresponder a letras gregas:

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 LETRA MINÚSCULA GREGA PI
re.test(&apos;π&apos;); // → true
// U+1018A SINAL DE ZERO GREGO
re.test(&apos;𐆊&apos;); // → false
```

Corresponder a todos os espaços em branco ASCII:

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test(&apos;\n&apos;); // → true
re.test(&apos;\u2028&apos;); // → false
```

Ou corresponder a todos os números mongóis:

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 DÍGITO MONGOL SETE
re.test(&apos;᠗&apos;); // → true
// U+1834 LETRA MONGOL CHA
re.test(&apos;ᠴ&apos;); // → false
```

### União

Corresponder a strings que estão _em A ou em B_ já era possível anteriormente para strings de um único caractere usando uma classe de caracteres como `[\p{Letter}\p{Number}]`. Com a flag `v`, essa funcionalidade se torna mais poderosa, pois agora pode ser combinada com propriedades de strings ou literais de string também:

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test(&apos;4️⃣&apos;); // → true
re.test(&apos;_&apos;); // → true
re.test(&apos;🇧🇪&apos;); // → true
re.test(&apos;abc&apos;); // → true
re.test(&apos;x&apos;); // → true
re.test(&apos;4&apos;); // → true
```

A classe de caracteres neste padrão combina:

- uma propriedade de strings (`\p{Emoji_Keycap_Sequence}`)
- uma propriedade de caracteres (`\p{ASCII}`)
- sintaxe literal de string para as strings com múltiplos pontos de código `🇧🇪` e `abc`
- sintaxe clássica de classe de caracteres para caracteres solitários `x`, `y` e `z`
- sintaxe clássica de classe de caracteres para o intervalo de caracteres de `0` a `9`

Outro exemplo é corresponder todos os emojis de bandeira comumente usados, independentemente de serem codificados como um código ISO de duas letras (`RGI_Emoji_Flag_Sequence`) ou como uma sequência especial de tags (`RGI_Emoji_Tag_Sequence`):

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// Uma sequência de bandeira, composta de 2 pontos de código (bandeira da Bélgica):
reFlag.test(&apos;🇧🇪&apos;); // → true
// Uma sequência de tags, composta de 7 pontos de código (bandeira da Inglaterra):
reFlag.test(&apos;🏴&apos;); // → true
// Uma sequência de bandeira, composta de 2 pontos de código (bandeira da Suíça):
reFlag.test(&apos;🇨🇭&apos;); // → true
// Uma sequência de tags, composta de 7 pontos de código (bandeira do País de Gales):
reFlag.test(&apos;🏴&apos;); // → true
```

## Melhoria na correspondência insensível a maiúsculas e minúsculas

O sinalizador `u` do ES2015 sofre de [comportamento confuso na correspondência insensível a maiúsculas e minúsculas](https://github.com/tc39/proposal-regexp-v-flag/issues/30). Considere as duas expressões regulares a seguir:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

O primeiro padrão corresponde a todas as letras minúsculas. O segundo padrão usa `\P` em vez de `\p` para corresponder a todos os caracteres, exceto as letras minúsculas, mas é então envolvido em uma classe de caracteres negada (`[^…]`). Ambas as expressões regulares são tornadas insensíveis a maiúsculas e minúsculas configurando o sinalizador `i` (`ignoreCase`).

Intuitivamente, você pode esperar que ambas as expressões regulares se comportem da mesma maneira. Na prática, elas se comportam de forma muito diferente:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;aAbBcC4#&apos;&apos;
```

O novo sinalizador `v` tem um comportamento menos surpreendente. Com o sinalizador `v` em vez do sinalizador `u`, ambos os padrões se comportam da mesma maneira:

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = &apos;aAbBcC4#&apos;;

string.replaceAll(re1, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;

string.replaceAll(re2, &apos;X&apos;);
// → &apos;XXXXXX4#&apos;
```

Mais geralmente, o sinalizador `v` torna `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` e `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`, independentemente de o sinalizador `i` estar configurado ou não.

## Leitura adicional

[O repositório da proposta](https://github.com/tc39/proposal-regexp-v-flag) contém mais detalhes e informações sobre essas funcionalidades e suas decisões de design.

Como parte do nosso trabalho nessas funcionalidades do JavaScript, fomos além de “apenas” propor mudanças na especificação para ECMAScript. Propusemos a definição de “propriedades de cadeias de caracteres” para [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings), para que outras linguagens de programação possam implementar funcionalidades semelhantes de forma unificada. Também estamos [propondo uma mudança no padrão HTML](https://github.com/whatwg/html/pull/7908) com o objetivo de permitir essas novas funcionalidades no atributo `pattern` também.

## Suporte ao sinalizador `v` em RegExp

O V8 v11.0 (Chrome 110) oferece suporte experimental para essa nova funcionalidade via o sinalizador `--harmony-regexp-unicode-sets`. O V8 v12.0 (Chrome 112) tem os novos recursos habilitados por padrão. Babel também suporta a transpiração do sinalizador `v` — [experimente os exemplos deste artigo no Babel REPL](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! A tabela de suporte abaixo contém links para problemas de rastreamento aos quais você pode se inscrever para receber atualizações.

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
