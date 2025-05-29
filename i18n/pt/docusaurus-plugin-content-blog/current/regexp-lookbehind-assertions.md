---
title: 'Afirmativas lookbehind do RegExp'
author: 'Yang Guo, Engenheiro de Expressões Regulares'
avatars:
  - 'yang-guo'
date: 2016-02-26 13:33:37
tags:
  - ECMAScript
  - RegExp
description: 'Expressões regulares em JavaScript estão ganhando nova funcionalidade: afirmações lookbehind.'
---
Introduzidas com a terceira edição da especificação ECMA-262, expressões regulares fazem parte do JavaScript desde 1999. Em termos de funcionalidade e expressividade, a implementação de expressões regulares no JavaScript espelha, aproximadamente, a de outras linguagens de programação.

<!--truncate-->
Uma funcionalidade do RegExp no JavaScript que muitas vezes passa despercebida, mas pode ser bastante útil, é o uso de afirmações lookahead. Por exemplo, para corresponder a uma sequência de dígitos seguida por um sinal de porcentagem, podemos usar `/\d+(?=%)/`. O sinal de porcentagem em si não faz parte do resultado da correspondência. A negação disso, `/\d+(?!%)/`, corresponderia a uma sequência de dígitos não seguida por um sinal de porcentagem:

```js
/\d+(?=%)/.exec('100% dos presidentes dos EUA foram homens'); // ['100']
/\d+(?!%)/.exec('é isso, todos os 44 deles');                  // ['44']
```

O oposto do lookahead, afirmações lookbehind, estava ausente no JavaScript, mas está disponível em outras implementações de expressões regulares, como no framework .NET. Em vez de ler à frente, o mecanismo de expressões regulares lê para trás para encontrar a correspondência dentro da afirmação. Uma sequência de dígitos após um símbolo de dólar pode ser correspondida por `/(?<=\$)\d+/`, onde o símbolo de dólar não faria parte do resultado da correspondência. A negação disso, `/(?<!\$)\d+/`, corresponde a uma sequência de dígitos que não segue um símbolo de dólar.

```js
/(?<=\$)\d+/.exec('Benjamin Franklin está na nota de $100'); // ['100']
/(?<!\$)\d+/.exec('vale cerca de €90');                      // ['90']
```

Geralmente, existem duas maneiras de implementar afirmações lookbehind. O Perl, por exemplo, exige que padrões lookbehind tenham um comprimento fixo. Isso significa que quantificadores como `*` ou `+` não são permitidos. Dessa forma, o mecanismo de expressões regulares pode retroceder por esse comprimento fixo e corresponder ao lookbehind exatamente da mesma forma que corresponderia a um lookahead, a partir da posição retrocedida.

O mecanismo de expressões regulares do framework .NET adota uma abordagem diferente. Em vez de precisar saber quantos caracteres o padrão lookbehind irá corresponder, ele simplesmente corresponde ao padrão lookbehind para trás, enquanto lê os caracteres contra a direção normal de leitura. Isso significa que o padrão lookbehind pode aproveitar toda a sintaxe de expressões regulares e corresponder a padrões de comprimento arbitrário.

Claramente, a segunda opção é mais poderosa do que a primeira. É por isso que a equipe do V8, e os campeões do TC39 para esse recurso, concordaram que o JavaScript deveria adotar a versão mais expressiva, mesmo que sua implementação seja um pouco mais complexa.

Como as afirmações lookbehind correspondem para trás, há alguns comportamentos sutis que, de outra forma, seriam considerados surpreendentes. Por exemplo, um grupo de captura com um quantificador captura a última correspondência. Normalmente, isso é a correspondência mais à direita. Mas dentro de uma afirmação lookbehind, correspondemos da direita para a esquerda, portanto, a correspondência mais à esquerda é capturada:

```js
/h(?=(\w)+)/.exec('hodor');  // ['h', 'r']
/(?<=(\w)+)r/.exec('hodor'); // ['r', 'h']
```

Um grupo de captura pode ser referenciado via referência a ele após ter sido capturado. Normalmente, a referência deve estar à direita do grupo de captura. Caso contrário, corresponderia à string vazia, já que nada foi capturado ainda. No entanto, dentro de uma afirmação lookbehind, a direção da correspondência é invertida:

```js
/(?<=(o)d\1)r/.exec('hodor'); // null
/(?<=\1d(o))r/.exec('hodor'); // ['r', 'o']
```

Afirmações lookbehind estão atualmente em uma [estágio muito inicial](https://github.com/tc39/proposal-regexp-lookbehind) no processo de especificação TC39. No entanto, por serem uma extensão tão óbvia à sintaxe do RegExp, decidimos priorizar sua implementação. Você já pode experimentar afirmações lookbehind executando a versão 4.9 ou posterior do V8 com `--harmony`, ou habilitando recursos experimentais de JavaScript (use `about:flags`) no Chrome a partir da versão 49.
