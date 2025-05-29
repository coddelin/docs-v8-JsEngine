---
title: "Separadores Numéricos"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-05-28
tags: 
  - ECMAScript
  - ES2021
  - io19
description: "JavaScript agora suporta sublinhados como separadores em literais numéricos, aumentando a legibilidade e a manutenção do código fonte."
tweet: "1129073383931559936"
---
Literais numéricos grandes são difíceis para o olho humano interpretar rapidamente, especialmente quando há muitos dígitos repetidos:

```js
1000000000000
   1019436871.42
```

Para melhorar a legibilidade, [uma nova funcionalidade da linguagem JavaScript](https://github.com/tc39/proposal-numeric-separator) permite sublinhados como separadores em literais numéricos. Assim, o exemplo acima agora pode ser reescrito para agrupar os dígitos por milhar, por exemplo:

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

Agora é mais fácil perceber que o primeiro número é um trilhão, e o segundo número é da ordem de 1 bilhão.

Separadores numéricos ajudam a melhorar a legibilidade para todos os tipos de literais numéricos:

```js
// Um literal inteiro decimal com seus dígitos agrupados por milhar:
1_000_000_000_000
// Um literal decimal com seus dígitos agrupados por milhar:
1_000_000.220_720
// Um literal inteiro binário com seus bits agrupados por octeto:
0b01010110_00111000
// Um literal inteiro binário com seus bits agrupados por nibble:
0b0101_0110_0011_1000
// Um literal inteiro hexadecimal com seus dígitos agrupados por byte:
0x40_76_38_6A_73
// Um literal BigInt com seus dígitos agrupados por milhar:
4_642_473_943_484_686_707n
```

Eles até funcionam para literais inteiros octais (embora [eu não consiga pensar em um exemplo](https://github.com/tc39/proposal-numeric-separator/issues/44) onde os separadores sejam úteis para tais literais):

```js
// Um separador numérico em um literal inteiro octal: 🤷‍♀️
0o123_456
```

Observe que o JavaScript também tem uma sintaxe legada para literais octais sem o prefixo explícito `0o`. Por exemplo, `017 === 0o17`. Essa sintaxe não é suportada no modo estrito ou dentro de módulos, e não deve ser usada em código moderno. Consequentemente, separadores numéricos não são suportados para esses literais. Use literais no estilo `0o17` em vez disso.

## Suporte para separadores numéricos

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
