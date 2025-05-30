---
title: "Lançamento do V8 v8.5"
author: "Zeynep Cankara, acompanhando alguns Mapas"
avatars: 
 - "zeynep-cankara"
date: 2020-07-21
tags: 
 - lançamento
description: "O lançamento do V8 v8.5 apresenta Promise.any, String#replaceAll, operadores de atribuição lógica, suporte multi-valor WebAssembly e BigInt, além de melhorias de desempenho."
tweet: 
---
A cada seis semanas, criamos uma nova ramificação do V8 como parte de nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nossa mais nova ramificação, [V8 versão 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5), que está em beta até seu lançamento em coordenação com a versão estável do Chrome 85 nas próximas semanas. O V8 v8.5 está cheio de diversas novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques na antecipação do lançamento.

<!--truncate-->
## JavaScript

### `Promise.any` e `AggregateError`

`Promise.any` é um combinador de promessas que resolve a promessa resultante assim que uma das promessas de entrada for cumprida.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Qualquer uma das promessas foi cumprida.
  console.log(first);
  // → por exemplo 'b'
} catch (error) {
  // Todas as promessas foram rejeitadas.
  console.assert(error instanceof AggregateError);
  // Registre os valores da rejeição:
  console.log(error.errors);
}
```

Se todas as promessas de entrada forem rejeitadas, a promessa resultante é rejeitada com um objeto `AggregateError` contendo uma propriedade `errors` que guarda uma lista de valores de rejeição.

Por favor, veja [nossa explicação](https://v8.dev/features/promise-combinators#promise.any) para mais detalhes.

### `String.prototype.replaceAll`

`String.prototype.replaceAll` fornece uma maneira fácil de substituir todas as ocorrências de um substring sem criar um `RegExp` global.

```js
const queryString = 'q=query+string+parameters';

// Funciona, mas requer escape dentro de expressões regulares.
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// Mais simples!
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Por favor, veja [nossa explicação](https://v8.dev/features/string-replaceall) para mais detalhes.

### Operadores de atribuição lógica

Os operadores de atribuição lógica são novos operadores de atribuição compostos que combinam as operações lógicas `&&`, `||` ou `??` com a atribuição.

```js
x &&= y;
// Aproximadamente equivalente a x && (x = y)
x ||= y;
// Aproximadamente equivalente a x || (x = y)
x ??= y;
// Aproximadamente equivalente a x ?? (x = y)
```

Note que, ao contrário dos operadores compostos matemáticos e bit a bit, os operadores de atribuição lógica apenas executam a atribuição condicionalmente.

Por favor, leia [nossa explicação](https://v8.dev/features/logical-assignment) para uma explicação mais detalhada.

## WebAssembly

### Liftoff ativado em todas as plataformas

Desde o V8 v6.9, [Liftoff](https://v8.dev/blog/liftoff) tem sido usado como o compilador básico para WebAssembly em plataformas Intel (e o Chrome 69 o habilitou em sistemas desktop). Como tínhamos preocupações sobre aumento de memória (devido à geração de mais código pelo compilador básico), mantivemos isso desativado para sistemas móveis até agora. Após algumas experimentações nos últimos meses, estamos confiantes de que o aumento de memória é insignificante na maioria dos casos, por isso finalmente habilitamos o Liftoff por padrão em todas as arquiteturas, trazendo maior velocidade de compilação, especialmente em dispositivos arm (32- e 64-bit). O Chrome 85 acompanha e envia o Liftoff.

### Suporte multi-valor habilitado

O suporte do WebAssembly para [blocos de código multi-valor e retornos de função](https://github.com/WebAssembly/multi-value) agora está disponível para uso geral. Isso reflete a recente fusão da proposta no padrão oficial do WebAssembly e é suportado por todos os níveis de compilação.

Por exemplo, agora esta função do WebAssembly é válida:

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

Se a função for exportada, também pode ser chamada a partir do JavaScript, e retorna uma matriz:

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

Por outro lado, se uma função JavaScript retornar uma matriz (ou qualquer iterador), ela pode ser importada e chamada como uma função de retorno múltiplo dentro do módulo do WebAssembly:

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

Mais importante ainda, ferramentas de desenvolvimento agora podem usar este recurso para gerar código mais compacto e rápido dentro de um módulo WebAssembly.

### Suporte para JS BigInts

O suporte para WebAssembly de [converter valores WebAssembly I64 de e para BigInts do JavaScript](https://github.com/WebAssembly/JS-BigInt-integration) foi implementado e está disponível para uso geral conforme a última mudança no padrão oficial.

Assim, as funções WebAssembly com parâmetros i64 e valores de retorno podem ser chamadas a partir de JavaScript sem perder precisão:

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

No JavaScript, apenas BigInts podem ser passados como parâmetros I64:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: os parâmetros não são do tipo BigInt
  });
```

## API do V8

Por favor, use `git log branch-heads/8.4..branch-heads/8.5 include/v8.h` para obter uma lista das alterações na API.

Os desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.5 -t branch-heads/8.5` para experimentar os novos recursos no V8 v8.5. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
