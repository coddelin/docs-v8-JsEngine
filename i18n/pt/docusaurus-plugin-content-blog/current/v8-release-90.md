---
title: "Lançamento do V8 v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), em linha contínua"
avatars:
 - "ingvar-stepanyan"
date: 2021-03-17
tags:
 - lançamento
description: "O lançamento do V8 v9.0 traz suporte para índices de correspondência RegExp e várias melhorias de desempenho."
tweet: "1372227274712494084"
---
A cada seis semanas, criamos uma nova ramificação do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco beta do Chrome. Hoje temos o prazer de anunciar nossa nova ramificação, [V8 versão 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0), que está em beta até seu lançamento em coordenação com o Chrome 90 Stable nas próximas semanas. O V8 v9.0 está repleto de várias novidades para desenvolvedores. Este post fornece uma prévia de alguns destaques em antecipação ao seu lançamento.

<!--truncate-->
## JavaScript

### Índices de correspondência RegExp

A partir da v9.0, os desenvolvedores podem optar por obter um array com as posições inicial e final dos grupos capturados nas correspondências de expressões regulares. Este array está disponível por meio da propriedade `.indices` nos objetos de correspondência quando a expressão regular possui a flag `/d`.

```javascript
const re = /(a)(b)/d;      // Observe a flag /d.
const m = re.exec('ab');
console.log(m.indices[0]); // O índice 0 é a correspondência completa.
// → [0, 2]
console.log(m.indices[1]); // O índice 1 é o 1º grupo capturado.
// → [0, 1]
console.log(m.indices[2]); // O índice 2 é o 2º grupo capturado.
// → [1, 2]
```

Por favor, consulte [nosso explicador](https://v8.dev/features/regexp-match-indices) para uma análise mais detalhada.

### Acesso mais rápido à propriedade `super`

O acesso às propriedades `super` (por exemplo, `super.x`) foi otimizado usando o sistema de cache inline do V8 e a geração de código otimizada no TurboFan. Com essas mudanças, o acesso às propriedades `super` agora está mais próximo do acesso regular a propriedades, como pode ser visto nos gráficos abaixo.

![Comparação do acesso às propriedades super com o acesso regular às propriedades, otimizado](/_img/fast-super/super-opt.svg)

Por favor, veja [o post dedicado no blog](https://v8.dev/blog/fast-super) para mais detalhes.

### Proibição de `for ( async of`

Uma [ambiguidade gramatical](https://github.com/tc39/ecma262/issues/2034) foi recentemente descoberta e [corrigida](https://chromium-review.googlesource.com/c/v8/v8/+/2683221) no V8 v9.0.

Agora a sequência de tokens `for ( async of` não é mais analisada.

## WebAssembly

### Chamadas JS-para-Wasm mais rápidas

O V8 usa representações diferentes para os parâmetros das funções WebAssembly e JavaScript. Por essa razão, quando o JavaScript chama uma função exportada do WebAssembly, a chamada passa por uma chamada *JS-to-Wasm wrapper*, responsável por adaptar os parâmetros do JavaScript para o WebAssembly, bem como adaptar os resultados na direção oposta.

Infelizmente, isso traz um custo de desempenho, o que significava que as chamadas de JavaScript para WebAssembly não eram tão rápidas quanto as chamadas de JavaScript para JavaScript. Para minimizar essa sobrecarga, o wrapper JS-to-Wasm agora pode ser inline no local da chamada, simplificando o código e removendo este frame extra.

Digamos que temos uma função WebAssembly para somar dois números de ponto flutuante duplos, como esta:

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

e chamamos isso do JavaScript para somar alguns vetores (representados como arrays tipados):

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// Aqueça.
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// Meça.
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

Neste microbenchmark simplificado, vemos as seguintes melhorias:

![Comparação de microbenchmarks](/_img/v8-release-90/js-to-wasm.svg)

O recurso ainda é experimental e pode ser ativado através da flag `--turbo-inline-js-wasm-calls`.

Para mais detalhes, veja o [documento de design](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit).

## API do V8

Por favor, utilize `git log branch-heads/8.9..branch-heads/9.0 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com uma cópia ativa do V8 podem usar `git checkout -b 9.0 -t branch-heads/9.0` para experimentar os novos recursos no V8 v9.0. Alternativamente você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
