---
title: "Lançamento do V8 v8.6"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), um fuzzer de teclado"
avatars: 
 - "ingvar-stepanyan"
date: 2020-09-21
tags: 
 - lançamento
description: "O lançamento do V8 v8.6 traz código respeitoso, melhorias de desempenho e mudanças normativas."
tweet: "1308062287731789825"
---
A cada seis semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é originada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6), que está em beta até seu lançamento em coordenação com o Chrome 86 Stable daqui a algumas semanas. O V8 v8.6 está cheio de novidades voltadas para os desenvolvedores. Este post oferece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Código respeitoso

A versão v8.6 torna a base de código do V8 [mais respeitosa](https://v8.dev/docs/respectful-code). A equipe juntou-se a um esforço amplo no Chromium para seguir os compromissos do Google com a equidade racial, substituindo alguns termos insensíveis no projeto. Este ainda é um esforço em andamento, e qualquer colaborador externo é bem-vindo a ajudar! Você pode ver a lista de tarefas disponíveis [aqui](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit).

## JavaScript

### JS-Fuzzer de código aberto

JS-Fuzzer é um fuzzer de JavaScript baseado em mutação originalmente criado por Oliver Chang. Ele tem sido fundamental para a [estabilidade](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) e [segurança](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) do V8 no passado e agora está [disponível como código aberto](https://chromium-review.googlesource.com/c/v8/v8/+/2320330).

O fuzzer muta casos de teste intermotor existentes usando transformações AST do [Babel](https://babeljs.io/) configuradas por [classes mutadoras](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/) extensíveis. Recentemente, também começamos a rodar uma instância do fuzzer em modo de teste diferencial para detectar [problemas de correção](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1) no JavaScript. Contribuições são bem-vindas! Consulte o [README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md) para mais informações.

### Melhoria no desempenho de `Number.prototype.toString`

Converter um número JavaScript em uma string pode ser uma operação surpreendentemente complexa no caso geral; temos que levar em conta a precisão de ponto flutuante, notação científica, NaNs, infinitos, arredondamento, e assim por diante. Nem sabemos o quão grande será a string resultante antes de calculá-la. Por causa disso, nossa implementação de `Number.prototype.toString` utilizaria uma função de runtime em C++.

Mas, muitas vezes, você simplesmente quer imprimir um número inteiro simples e pequeno (um “Smi”). Esta é uma operação muito mais simples, e os custos de chamar uma função de runtime em C++ não valem mais a pena. Assim, trabalhamos com nossos amigos da Microsoft para adicionar um caminho rápido para inteiros pequenos em `Number.prototype.toString`, utilizando Torque, para reduzir esses custos neste caso comum. Isso melhorou os microbenchmarks de impressão de números em ~75%.

### `Atomics.wake` removido

`Atomics.wake` foi renomeado para `Atomics.notify` para corresponder a uma alteração na especificação [na v7.3](https://v8.dev/blog/v8-release-73#atomics.notify). O alias depreciado `Atomics.wake` agora foi removido.

### Pequenas mudanças normativas

- Classes anônimas agora possuem uma propriedade `.name` cujo valor é a string vazia `''`. [Alteração na especificação](https://github.com/tc39/ecma262/pull/1490).
- As sequências de escape `\8` e `\9` agora são ilegais em literais de string de template no [modo permissivo](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode) e em todos os literais de string no [modo estrito](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode). [Alteração na especificação](https://github.com/tc39/ecma262/pull/2054).
- O objeto embutido `Reflect` agora possui uma propriedade `Symbol.toStringTag` cujo valor é `'Reflect'`. [Alteração na especificação](https://github.com/tc39/ecma262/pull/2057).

## WebAssembly

### SIMD no Liftoff

Liftoff é o compilador básico para WebAssembly e, a partir do V8 v8.5, está disponível em todas as plataformas. A [proposta de SIMD](https://v8.dev/features/simd) permite que o WebAssembly aproveite as instruções vetoriais de hardware amplamente disponíveis para acelerar cargas de trabalho intensivas em computação. Atualmente, está em uma [Origin Trial](https://v8.dev/blog/v8-release-84#simd-origin-trial), que permite aos desenvolvedores experimentarem um recurso antes de ser padronizado.

Até agora, SIMD foi implementado apenas no TurboFan, o compilador de nível superior do V8. Isso é necessário para obter o máximo desempenho das instruções SIMD. Módulos WebAssembly que utilizam instruções SIMD terão inicialização mais rápida e, frequentemente, desempenho de execução mais rápido do que seus equivalentes escalares compilados com TurboFan. Por exemplo, dado uma função que recebe um array de floats e limita seus valores a zero (escrita aqui em JavaScript para clareza):

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

Vamos comparar duas implementações diferentes dessa função, usando Liftoff e TurboFan:

1. Uma implementação escalar, com o loop desenrolado 4 vezes.
2. Uma implementação SIMD, usando a instrução `i32x4.max_s`.

Usando a implementação escalar do Liftoff como base, obtemos os seguintes resultados:

![Um gráfico mostrando que Liftoff SIMD é ~2.8× mais rápido do que Liftoff escalar, versus TurboFan SIMD sendo ~7.5× mais rápido](/_img/v8-release-86/simd.svg)

### Chamadas Wasm-para-JS mais rápidas

Se o WebAssembly chama uma função JavaScript importada, fazemos isso através de um chamado “wrapper Wasm-para-JS” (ou “wrapper de importação”). Esse wrapper [traduz os argumentos](https://webassembly.github.io/spec/js-api/index.html#tojsvalue) para objetos que o JavaScript entende e, quando a chamada ao JavaScript retorna, ele traduz de volta os valores de retorno [para o WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue).

Para garantir que o objeto `arguments` do JavaScript reflita exatamente os argumentos passados do WebAssembly, chamamos através de um chamado “trampolim adaptador de argumentos” se for detectada uma incompatibilidade no número de argumentos.

Em muitos casos, porém, isso não é necessário, porque a função chamada não usa o objeto `arguments`. No v8.6, implementamos um [patch](https://crrev.com/c/2317061) com nossos colaboradores da Microsoft que evita a chamada através do adaptador de argumentos nesses casos, tornando essas chamadas significativamente mais rápidas.

## API do V8

### Detectar tarefas de fundo pendentes com `Isolate::HasPendingBackgroundTasks`

A nova função de API `Isolate::HasPendingBackgroundTasks` permite que integradores verifiquem se há trabalho de fundo pendente que eventualmente postará novas tarefas de primeiro plano, como compilação de WebAssembly.

Essa API deve resolver o problema em que um integrador encerra o V8 mesmo quando ainda há compilação de WebAssembly pendente que eventualmente iniciará uma nova execução de script. Com `Isolate::HasPendingBackgroundTasks`, o integrador pode esperar por novas tarefas de primeiro plano em vez de encerrar o V8.

Use `git log branch-heads/8.5..branch-heads/8.6 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.6 -t branch-heads/8.6` para experimentar os novos recursos no V8 v8.6. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
