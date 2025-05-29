---
title: &apos;Compreendendo a especificação do ECMAScript, parte 3&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa da especificação&apos;
avatars:
  - marja-holtta
date: 2020-04-01
tags:
  - ECMAScript
  - Compreendendo ECMAScript
description: &apos;Tutorial sobre como ler a especificação do ECMAScript&apos;
tweet: &apos;1245400717667577857&apos;
---

[Todos os episódios](/blog/tags/understanding-ecmascript)

Neste episódio, aprofundaremos na definição da linguagem ECMAScript e sua sintaxe. Se você não está familiarizado com gramáticas livres de contexto, agora é um bom momento para revisar o básico, já que a especificação utiliza gramáticas livres de contexto para definir a linguagem. Consulte [o capítulo sobre gramáticas livres de contexto em "Crafting Interpreters"](https://craftinginterpreters.com/representing-code.html#context-free-grammars) para uma introdução acessível ou a [página da Wikipédia](https://en.wikipedia.org/wiki/Context-free_grammar) para uma definição mais matemática.

<!--truncate-->
## Gramáticas ECMAScript

A especificação ECMAScript define quatro gramáticas:

A [gramática lexical](https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar) descreve como os [pontos de código Unicode](https://en.wikipedia.org/wiki/Unicode#Architecture_and_terminology) são traduzidos em uma sequência de **elementos de entrada** (tokens, terminadores de linha, comentários, espaços em branco).

A [gramática sintática](https://tc39.es/ecma262/#sec-syntactic-grammar) define como programas sintaticamente corretos são compostos de tokens.

A [gramática de RegExp](https://tc39.es/ecma262/#sec-patterns) descreve como os pontos de código Unicode são traduzidos em expressões regulares.

A [gramática de string numérica](https://tc39.es/ecma262/#sec-tonumber-applied-to-the-string-type) descreve como Strings são traduzidas em valores numéricos.

Cada gramática é definida como uma gramática livre de contexto, composta por um conjunto de produções.

As gramáticas usam notações ligeiramente diferentes: a gramática sintática usa `LeftHandSideSymbol :` enquanto a gramática lexical e a de RegExp usam `LeftHandSideSymbol ::` e a gramática de string numérica usa `LeftHandSideSymbol :::`.

A seguir, examinaremos a gramática lexical e a gramática sintática com mais detalhes.

## Gramática lexical

A especificação define o texto fonte do ECMAScript como uma sequência de pontos de código Unicode. Por exemplo, os nomes de variáveis não se limitam a caracteres ASCII, mas podem incluir outros caracteres Unicode. A especificação não trata sobre a codificação real (por exemplo, UTF-8 ou UTF-16). Ela assume que o código fonte já foi convertido em uma sequência de pontos de código Unicode de acordo com a codificação em que estava.

Não é possível tokenizar o código fonte ECMAScript com antecedência, o que torna a definição da gramática lexical um pouco mais complicada.

Por exemplo, não podemos determinar se `/` é o operador de divisão ou o início de uma RegExp sem analisar o contexto maior em que ocorre:

```js
const x = 10 / 5;
```

Aqui, `/` é um `DivPunctuator`.

```js
const r = /foo/;
```

Aqui, o primeiro `/` é o início de um `RegularExpressionLiteral`.

Modelos introduzem uma ambiguidade semelhante — a interpretação de <code>}`</code> depende do contexto em que ocorre:

```js
const what1 = &apos;temp&apos;;
const what2 = &apos;late&apos;;
const t = `Eu sou um(a) ${ what1 + what2 }`;
```

Aqui <code>\`Eu sou um(a) $\{</code> é um `TemplateHead` e <code>\}\`</code> é um `TemplateTail`.

```js
if (0 == 1) {
}`não muito útil`;
```

Aqui `}` é um `RightBracePunctuator` e <code>\`</code> é o início de um `NoSubstitutionTemplate`.

Embora a interpretação de `/` e <code>}`</code> dependa de seu “contexto” — sua posição na estrutura sintática do código — as gramáticas que descreveremos a seguir ainda são livres de contexto.

A gramática lexical utiliza vários símbolos-alvo para distinguir entre os contextos onde alguns elementos de entrada são permitidos e outros não. Por exemplo, o símbolo-alvo `InputElementDiv` é usado em contextos onde `/` é uma divisão e `/=` é uma divisão com atribuição. As produções de [`InputElementDiv`](https://tc39.es/ecma262/#prod-InputElementDiv) listam os possíveis tokens que podem ser produzidos neste contexto:

```grammar
InputElementDiv ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  DivPunctuator
  RightBracePunctuator
```

Neste contexto, encontrar `/` produz o elemento de entrada `DivPunctuator`. Produzir um elemento de entrada `RegularExpressionLiteral` não é uma opção aqui.

Por outro lado, [`InputElementRegExp`](https://tc39.es/ecma262/#prod-InputElementRegExp) é o símbolo-alvo para os contextos onde `/` é o início de uma RegExp:

```grammar
InputElementRegExp ::
  WhiteSpace
  LineTerminator
  Comment
  CommonToken
  RightBracePunctuator
  RegularExpressionLiteral
```

Como vemos nas produções, é possível que isso produza o elemento de entrada `RegularExpressionLiteral`, mas produzir `DivPunctuator` não é possível.

Da mesma forma, há outro símbolo de objetivo, `InputElementRegExpOrTemplateTail`, para contextos onde `TemplateMiddle` e `TemplateTail` são permitidos, além de `RegularExpressionLiteral`. E, finalmente, `InputElementTemplateTail` é o símbolo de objetivo para contextos onde apenas `TemplateMiddle` e `TemplateTail` são permitidos, mas `RegularExpressionLiteral` não é permitido.

Em implementações, o analisador gramatical sintático (“parser”) pode chamar o analisador gramatical lexical (“tokenizador” ou “lexer”), passando o símbolo de objetivo como parâmetro e solicitando o próximo elemento de entrada adequado para esse símbolo de objetivo.

## Gramática sintática

Examinamos a gramática lexical, que define como construímos tokens a partir de pontos de código Unicode. A gramática sintática constrói sobre isso: define como programas sintaticamente corretos são compostos de tokens.

### Exemplo: Permitindo identificadores legados

Introduzir uma nova palavra-chave na gramática pode causar uma mudança potencialmente disruptiva — e se o código existente já usar a palavra-chave como identificador?

Por exemplo, antes de `await` ser uma palavra-chave, alguém poderia ter escrito o seguinte código:

```js
function old() {
  var await;
}
```

A gramática do ECMAScript adicionou cuidadosamente a palavra-chave `await` de forma que este código continue funcionando. Dentro de funções assíncronas, `await` é uma palavra-chave, então isso não funciona:

```js
async function modern() {
  var await; // Erro de sintaxe
}
```

Permitir `yield` como um identificador em não-geradores e proibí-lo em geradores funciona de forma similar.

Entender como `await` é permitido como um identificador exige entender a notação gramatical específica do ECMAScript. Vamos mergulhar nisso!

### Produções e abreviações

Vamos observar como as produções para [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement) são definidas. À primeira vista, a gramática pode parecer um pouco assustadora:

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

O que os subscritos (`[Yield, Await]`) e prefixos (`+` em `+In` e `?` em `?Async`) significam?

A notação é explicada na seção [Notação Gramatical](https://tc39.es/ecma262/#sec-grammar-notation).

Os subscritos são uma abreviação para expressar um conjunto de produções, para um conjunto de símbolos no lado esquerdo, todos de uma vez. O símbolo no lado esquerdo tem dois parâmetros, o que se expande em quatro símbolos "reais" no lado esquerdo: `VariableStatement`, `VariableStatement_Yield`, `VariableStatement_Await` e `VariableStatement_Yield_Await`.

Note que aqui o simples `VariableStatement` significa "`VariableStatement` sem `_Await` e `_Yield`". Não deve ser confundido com <code>VariableStatement<sub>[Yield, Await]</sub></code>.

No lado direito da produção, vemos a abreviação `+In`, significando "usar a versão com `_In`", e `?Await`, significando "usar a versão com `_Await` se e somente se o símbolo do lado esquerdo tiver `_Await`" (de forma similar com `?Yield`).

A terceira abreviação, `~Foo`, significando "usar a versão sem `_Foo`", não é usada nesta produção.

Com essas informações, podemos expandir as produções assim:

```grammar
VariableStatement :
  var VariableDeclarationList_In ;

VariableStatement_Yield :
  var VariableDeclarationList_In_Yield ;

VariableStatement_Await :
  var VariableDeclarationList_In_Await ;

VariableStatement_Yield_Await :
  var VariableDeclarationList_In_Yield_Await ;
```

No final das contas, precisamos descobrir duas coisas:

1. Onde é decidido se estamos no caso com `_Await` ou sem `_Await`?
2. Onde isso faz diferença — onde as produções para `Something_Await` e `Something` (sem `_Await`) divergem?

### `_Await` ou sem `_Await`?

Vamos abordar a questão 1 primeiro. É relativamente fácil adivinhar que funções não-assíncronas e assíncronas diferem no uso do parâmetro `_Await` para o corpo da função ou não. Ao ler as produções para declarações de funções assíncronas, encontramos [isto](https://tc39.es/ecma262/#prod-AsyncFunctionBody):

```grammar
AsyncFunctionBody :
  FunctionBody[~Yield, +Await]
```

Note que `AsyncFunctionBody` não possui parâmetros — eles são adicionados ao `FunctionBody` no lado direito.

Se expandirmos esta produção, obtemos:

```grammar
AsyncFunctionBody :
  FunctionBody_Await
```

Em outras palavras, funções assíncronas têm `FunctionBody_Await`, o que significa um corpo de função onde `await` é tratado como uma palavra-chave.

Por outro lado, se estivermos dentro de uma função não-assíncrona, [a produção relevante](https://tc39.es/ecma262/#prod-FunctionDeclaration) é:

```grammar
FunctionDeclaration[Yield, Await, Default] :
  function BindingIdentifier[?Yield, ?Await] ( FormalParameters[~Yield, ~Await] ) { FunctionBody[~Yield, ~Await] }
```

(O `FunctionDeclaration` tem outra produção, mas não é relevante para nosso exemplo de código.)

Para evitar expansão combinatória, vamos ignorar o parâmetro `Default`, que não é usado nesta produção específica.

A forma expandida da produção é:

```grammar
FunctionDeclaration :
  function BindingIdentifier ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield :
  function BindingIdentifier_Yield ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Await :
  function BindingIdentifier_Await ( FormalParameters ) { FunctionBody }

FunctionDeclaration_Yield_Await :
  function BindingIdentifier_Yield_Await ( FormalParameters ) { FunctionBody }
```

Nesta produção, sempre obtemos `FunctionBody` e `FormalParameters` (sem `_Yield` e sem `_Await`), já que eles são parametrizados com `[~Yield, ~Await]` na produção não expandida.

O nome da função é tratado de maneira diferente: ele recebe os parâmetros `_Await` e `_Yield` se o símbolo do lado esquerdo os tiver.

Para resumir: Funções assíncronas têm um `FunctionBody_Await` e funções não assíncronas têm um `FunctionBody` (sem `_Await`). Como estamos falando de funções não geradoras, tanto nossa função assíncrona quanto nossa função não assíncrona de exemplo são parametrizadas sem `_Yield`.

Talvez seja difícil lembrar qual é `FunctionBody` e qual é `FunctionBody_Await`. `FunctionBody_Await` é para uma função onde `await` é um identificador ou para uma função onde `await` é uma palavra-chave?

Você pode pensar no parâmetro `_Await` como significando "`await` é uma palavra-chave". Esta abordagem também é preparada para o futuro. Imagine uma nova palavra-chave, `blob`, sendo adicionada, mas apenas dentro de funções "blob". Funções não blob, não assíncronas e não geradoras ainda teriam `FunctionBody` (sem `_Await`, `_Yield` ou `_Blob`), exatamente como agora. Funções blob teriam um `FunctionBody_Blob`, funções assíncronas blob teriam `FunctionBody_Await_Blob` e assim por diante. Ainda precisaríamos adicionar o subscrito `Blob` às produções, mas as formas expandidas de `FunctionBody` para funções já existentes permanecem as mesmas.

### Proibir `await` como identificador

Em seguida, precisamos descobrir como `await` é proibido como identificador se estivermos dentro de um `FunctionBody_Await`.

Podemos seguir as produções mais adiante para ver que o parâmetro `_Await` é levado inalterado de `FunctionBody` até a produção `VariableStatement` que estávamos olhando anteriormente.

Assim, dentro de uma função assíncrona, teremos um `VariableStatement_Await` e dentro de uma função não assíncrona, teremos um `VariableStatement`.

Podemos seguir as produções mais adiante e acompanhar os parâmetros. Já vimos as produções para [`VariableStatement`](https://tc39.es/ecma262/#prod-VariableStatement):

```grammar
VariableStatement[Yield, Await] :
  var VariableDeclarationList[+In, ?Yield, ?Await] ;
```

Todas as produções para [`VariableDeclarationList`](https://tc39.es/ecma262/#prod-VariableDeclarationList) apenas carregam os parâmetros como estão:

```grammar
VariableDeclarationList[In, Yield, Await] :
  VariableDeclaration[?In, ?Yield, ?Await]
```

(Aqui mostramos apenas a [produção](https://tc39.es/ecma262/#prod-VariableDeclaration) relevante para nosso exemplo.)

```grammar
VariableDeclaration[In, Yield, Await] :
  BindingIdentifier[?Yield, ?Await] Initializer[?In, ?Yield, ?Await] opt
```

O atalho `opt` significa que o símbolo do lado direito é opcional; há, de fato, duas produções, uma com o símbolo opcional e outra sem.

No caso simples relevante ao nosso exemplo, `VariableStatement` consiste na palavra-chave `var`, seguida por um único `BindingIdentifier` sem inicializador, e terminando com um ponto e vírgula.

Para proibir ou permitir `await` como `BindingIdentifier`, esperamos terminar com algo como isto:

```grammar
BindingIdentifier_Await :
  Identifier
  yield

BindingIdentifier :
  Identifier
  yield
  await
```

Isso proibiria `await` como identificador dentro de funções assíncronas e permitiria como identificador dentro de funções não assíncronas.

Mas a especificação não o define assim, em vez disso encontramos esta [produção](https://tc39.es/ecma262/#prod-BindingIdentifier):

```grammar
BindingIdentifier[Yield, Await] :
  Identifier
  yield
  await
```

Expandido, isso significa as seguintes produções:

```grammar
BindingIdentifier_Await :
  Identifier
  yield
  await

BindingIdentifier :
  Identifier
  yield
  await
```

(Estamos omitindo as produções para `BindingIdentifier_Yield` e `BindingIdentifier_Yield_Await` que não são necessárias em nosso exemplo.)

Isso parece que `await` e `yield` seriam sempre permitidos como identificadores. O que está acontecendo? O blog inteiro é inútil?

### Semântica estática ao resgate

Acontece que **semântica estática** são necessárias para proibir `await` como identificador dentro de funções assíncronas.

Semântica estática descreve regras estáticas — ou seja, regras que são verificadas antes que o programa seja executado.

Neste caso, as [semânticas estáticas para `BindingIdentifier`](https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors) definem a seguinte regra dirigida por sintaxe:

> ```grammar
> BindingIdentifier[Yield, Await] : await
> ```
>
> É um erro de sintaxe se esta produção tiver um parâmetro <code><sub>[Await]</sub></code>.

Efetivamente, isso proíbe a produção `BindingIdentifier_Await : await`.

A especificação explica que o motivo de ter essa produção mas defini-la como um Erro de Sintaxe pela semântica estática é devido à interferência com a inserção automática de ponto e vírgula (ASI).

Lembre-se de que o ASI entra em ação quando não conseguimos analisar uma linha de código de acordo com as produções gramaticais. O ASI tenta adicionar pontos e vírgulas para satisfazer o requisito de que declarações e declarações devem terminar com um ponto e vírgula. (Descreveremos o ASI com mais detalhes em um episódio posterior.)

Considere o seguinte código (exemplo da especificação):

```js
async function poucas_virgulas() {
  let
  await 0;
}
```

Se a gramática não permitisse `await` como um identificador, o ASI entraria em ação e transformaria o código no seguinte código gramaticalmente correto, que também usa `let` como um identificador:

```js
async function poucas_virgulas() {
  let;
  await 0;
}
```

Esse tipo de interferência com o ASI foi considerado muito confuso, então a semântica estática foi usada para impedir o uso de `await` como um identificador.

### `StringValues` de identificadores não permitidos

Há também outra regra relacionada:

> ```grammar
> BindingIdentifier : Identifier
> ```
>
> É um Erro de Sintaxe se esta produção tiver um parâmetro <code><sub>[Await]</sub></code> e o `StringValue` de `Identifier` for `"await"`.

Isso pode ser confuso no início. [`Identifier`](https://tc39.es/ecma262/#prod-Identifier) é definido assim:

<!-- markdownlint-disable no-inline-html -->
```grammar
Identifier :
  IdentifierName mas não ReservedWord
```
<!-- markdownlint-enable no-inline-html -->

`await` é uma `ReservedWord`, então como um `Identifier` pode ser `await`?

Acontece que `Identifier` não pode ser `await`, mas pode ser algo cujo `StringValue` seja `"await"` — uma representação diferente da sequência de caracteres `await`.

[Semântica estática para nomes de identificadores](https://tc39.es/ecma262/#sec-identifier-names-static-semantics-stringvalue) define como o `StringValue` de um nome de identificador é calculado. Por exemplo, a sequência de escape Unicode para `a` é `\u0061`, então `\u0061wait` tem o `StringValue` `"await"`. `\u0061wait` não será reconhecido como uma palavra-chave pela gramática lexical, em vez disso será um `Identifier`. A semântica estática proíbe usá-lo como um nome de variável dentro de funções assíncronas.

Então, isso funciona:

```js
function antigo() {
  var \u0061wait;
}
```

E isso não funciona:

```js
async function moderno() {
  var \u0061wait; // Erro de sintaxe
}
```

## Resumo

Neste episódio, familiarizamo-nos com a gramática lexical, a gramática sintática e os atalhos usados para definir a gramática sintática. Como exemplo, analisamos a proibição do uso de `await` como um identificador dentro de funções assíncronas, mas permitindo-o dentro de funções não assíncronas.

Outros aspectos interessantes da gramática sintática, como a inserção automática de ponto e vírgula e as gramáticas de cobertura, serão abordados em um episódio posterior. Fique ligado!
