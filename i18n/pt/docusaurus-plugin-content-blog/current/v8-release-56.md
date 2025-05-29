---
title: 'Lançamento do V8 v5.6'
author: 'a equipe do V8'
date: 2016-12-02 13:33:37
tags:
  - lançamento
description: 'O V8 v5.6 vem com um novo pipeline de compiladores, melhorias de desempenho e maior suporte para os recursos da linguagem ECMAScript.'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do master do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6), que estará em beta até ser lançado em coordenação com o Chrome 56 Stable nas próximas semanas. O V8 5.6 está repleto de novidades voltadas para desenvolvedores, então gostaríamos de dar a você um preview de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Pipeline Ignition e TurboFan para ES.next (e mais) lançado

A partir do 5.6, o V8 pode otimizar toda a linguagem JavaScript. Além disso, muitos recursos da linguagem são processados por um novo pipeline de otimização no V8. Este pipeline usa o [interpretador Ignition](/blog/ignition-interpreter) do V8 como base e otimiza métodos executados frequentemente com o mais potente [compilador de otimização TurboFan](/docs/turbofan) do V8. O novo pipeline é ativado para novos recursos da linguagem (por exemplo, muitos dos novos recursos das especificações ES2015 e ES2016) ou sempre que o Crankshaft ([o “clássico” compilador de otimização do V8](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)) não consegue otimizar um método (por exemplo, try-catch, with).

Por que estamos apenas direcionando alguns recursos da linguagem JavaScript pelo novo pipeline? O novo pipeline é mais adequado para otimizar todo o espectro da linguagem JS (passado e presente). É uma base de código mais saudável, moderna e foi projetada especificamente para casos de uso do mundo real, incluindo a execução do V8 em dispositivos com pouca memória.

Começamos a usar o Ignition/TurboFan com os recursos mais recentes da ES.next que adicionamos ao V8 (ES.next = recursos JavaScript especificados no ES2015 e posterior) e iremos direcionar mais recursos para ele à medida que continuamos melhorando seu desempenho. A médio prazo, a equipe do V8 está visando alternar toda a execução de JavaScript no V8 para o novo pipeline. No entanto, enquanto ainda houver casos de uso do mundo real em que o Crankshaft execute JavaScript mais rápido do que o novo pipeline Ignition/TurboFan, a curto prazo, daremos suporte a ambos os pipelines para garantir que o código JavaScript em execução no V8 seja o mais rápido possível em todas as situações.

Então, por que o novo pipeline usa tanto o novo interpretador Ignition quanto o novo compilador de otimização TurboFan? Executar JavaScript de forma rápida e eficiente requer ter vários mecanismos, ou níveis, sob o capô de uma máquina virtual JavaScript para realizar o trabalho de baixa complexidade da execução. Por exemplo, é útil ter um primeiro nível que inicia a execução do código rapidamente e, em seguida, um segundo nível de otimização que gasta mais tempo compilando funções quentes para maximizar o desempenho em código de execução prolongada.

O Ignition e o TurboFan são os dois novos níveis de execução do V8 que são mais eficazes quando usados juntos. Devido a considerações de eficiência, simplicidade e tamanho, o TurboFan é projetado para otimizar métodos JavaScript a partir do [bytecode](https://en.wikipedia.org/wiki/Bytecode) produzido pelo interpretador Ignition do V8. Ao projetar ambos os componentes para trabalhar em estreita colaboração, há otimizações que podem ser feitas em ambos devido à presença um do outro. Como resultado, a partir do 5.6, todas as funções que serão otimizadas pelo TurboFan são primeiramente executadas pelo interpretador Ignition. Utilizar este pipeline unificado Ignition/TurboFan permite a otimização de recursos que não eram otimizáveis no passado, pois agora podem se beneficiar das passagens de otimização do TurboFan. Por exemplo, ao direcionar [Geradores](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) através do Ignition e do TurboFan, o desempenho em tempo de execução dos Geradores quase triplicou.

Para mais informações sobre a jornada do V8 para adotar o Ignition e o TurboFan, por favor, dê uma olhada na [postagem dedicada do blog de Benedikt](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/).

## Melhorias de desempenho

O V8 v5.6 oferece uma série de melhorias importantes no consumo de memória e no desempenho.

### Queda de desempenho causada por memória

[Filtragem concorrente do conjunto de lembranças](https://bugs.chromium.org/p/chromium/issues/detail?id=648568) foi introduzida: Um passo mais próximo do [Orinoco](/blog/orinoco).

### Desempenho muito melhorado do ES2015

Os desenvolvedores geralmente começam a usar novos recursos da linguagem com a ajuda de transpilers por causa de dois desafios: compatibilidade retroativa e preocupações com desempenho.

O objetivo do V8 é reduzir a diferença de desempenho entre transpiladores e o desempenho "nativo" ES.next do V8, a fim de eliminar esse último desafio. Conseguimos grandes progressos em trazer o desempenho de novos recursos de linguagem para um nível equivalente aos seus equivalentes transpilados para ES5. Nesta versão você encontrará que o desempenho dos recursos ES2015 é significativamente mais rápido do que em versões anteriores do V8 e, em alguns casos, o desempenho dos recursos ES2015 está se aproximando do de seus equivalentes transpilados para ES5.

Particularmente o operador [spread](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Operators/Spread_operator) agora deve estar pronto para ser usado nativamente. Em vez de escrever...

```js
// Como Math.max, mas retorna 0 em vez de -∞ para nenhum argumento.
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

...você agora pode escrever...

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

...e obter resultados de desempenho similares. Em particular, o V8 v5.6 inclui melhorias de velocidade para os seguintes micro-benchmarks:

- [destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuring-array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuring-string](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

Veja o gráfico abaixo para uma comparação entre V8 v5.4 e v5.6.

![Comparando o desempenho dos recursos ES2015 no V8 v5.4 e v5.6 com [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

Isso é apenas o começo; há muito mais por vir em lançamentos futuros!

## Recursos da linguagem

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) e [`String.prototype.padEnd`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) são as adições mais recentes do estágio 4 ao ECMAScript. Essas funções de biblioteca são oficialmente lançadas no v5.6.

:::note
**Nota:** Não implementado novamente.
:::

## Prévia do WebAssembly no navegador

O Chromium 56 (que inclui o V8 v5.6) irá lançar a prévia do WebAssembly no navegador. Por favor, consulte [o post dedicado no blog](/blog/webassembly-browser-preview) para mais informações.

## API do V8

Por favor, confira nosso [resumo das mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é regularmente atualizado algumas semanas após cada grande lançamento.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.6 -t branch-heads/5.6` para experimentar os novos recursos no V8 v5.6. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos você mesmo em breve.
