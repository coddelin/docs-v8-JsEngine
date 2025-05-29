---
title: &apos;Integração do WebAssembly com JavaScript BigInt&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: &apos;BigInts tornam fácil passar inteiros de 64 bits entre JavaScript e WebAssembly. Este post explica o que isso significa e por que é útil, incluindo simplificar as coisas para desenvolvedores, permitir que o código execute mais rapidamente e também acelerar os tempos de compilação.&apos;
tweet: &apos;1331966281571037186&apos;
---
A funcionalidade de [Integração JS-BigInt](https://github.com/WebAssembly/JS-BigInt-integration) torna fácil passar inteiros de 64 bits entre JavaScript e WebAssembly. Este post explica o que isso significa e por que é útil, incluindo simplificar as coisas para desenvolvedores, permitir que o código execute mais rapidamente e também acelerar os tempos de compilação.

<!--truncate-->
## Inteiros de 64 bits

Os números JavaScript são do tipo double, ou seja, valores de ponto flutuante de 64 bits. Um valor assim pode conter qualquer inteiro de 32 bits com precisão total, mas não todos os de 64 bits. O WebAssembly, por outro lado, tem suporte completo para inteiros de 64 bits, o tipo `i64`. O problema surge ao conectar os dois: Se uma função Wasm retorna um valor i64, por exemplo, a VM lança uma exceção ao chamá-la de JavaScript, algo como isto:

```
TypeError: Wasm function signature contains illegal type
```

Conforme o erro descreve, `i64` não é um tipo permitido em JavaScript.

Historicamente, a melhor solução para isso foi a “legalização” do Wasm. A legalização significa converter as importações e exportações do Wasm para usar tipos válidos para JavaScript. Na prática, isso faz duas coisas:

1. Substituir um parâmetro inteiro de 64 bits por dois de 32 bits, representando respectivamente os bits baixos e altos.
2. Substituir um retorno inteiro de 64 bits por outro de 32 bits representando os bits baixos e usar um valor de 32 bits ao lado para os bits altos.

Por exemplo, considere este módulo Wasm:

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

A legalização transformaria isso nisto:

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; valor real que o resto do código usará
    ;; código para combinar $x_low e $x_high em $x
    ..))
```

A legalização é feita do lado das ferramentas, antes de alcançar a VM que o executa. Por exemplo, a biblioteca de ferramentas [Binaryen](https://github.com/WebAssembly/binaryen) tem uma passagem chamada [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp) que realiza essa transformação, e é executada automaticamente no [Emscripten](https://emscripten.org/) quando necessário.

## Desvantagens da legalização

A legalização funciona bem o suficiente para muitas coisas, mas tem desvantagens, como o trabalho extra para combinar ou dividir as partes de 32 bits em valores de 64 bits. Embora seja raro que isso aconteça em um caminho crítico, quando acontece a desaceleração pode ser notável - veremos alguns números mais tarde.

Outro incômodo é que a legalização é perceptível pelos usuários, pois altera a interface entre JavaScript e Wasm. Aqui está um exemplo:

```c
// exemplo.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// exemplo.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS recebeu: 0x" + value.toString(16));
  }
});
```

Este é um pequeno programa C que chama uma [biblioteca JavaScript](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) (ou seja, definimos uma função extern C em C e a implementamos em JavaScript, como uma maneira simples e de baixo nível de chamar entre Wasm e JavaScript). Tudo o que este programa faz é enviar um `i64` para o JavaScript, onde tentamos imprimi-lo.

Podemos construir isso com

```
emcc exemplo.c --js-library exemplo.js -o out.js
```

Quando executamos, não obtemos o que esperávamos:

```
node out.js
JS recebeu: 0x12345678
```

Enviamos `0xABCD12345678` mas só recebemos `0x12345678` 😔. O que acontece aqui é que a legalização transforma aquele `i64` em dois `i32`s, e nosso código apenas recebeu os 32 bits baixos e ignorou um outro parâmetro que foi enviado. Para lidar com isso corretamente, precisaríamos fazer algo assim:

```javascript
  // O i64 é dividido em dois parâmetros de 32 bits, “baixo” e “alto”.
  send_i64_to_js: function(low, high) {
    console.log("JS recebeu: 0x" + high.toString(16) + low.toString(16));
  }
```

Executando isso agora, obtemos

```
JS recebeu: 0xabcd12345678
```

Como você pode ver, é possível viver com a legalização. Mas pode ser um pouco irritante!

## A solução: JavaScript BigInts

O JavaScript agora possui valores [BigInt](/features/bigint), que representam inteiros de tamanho arbitrário, permitindo representar inteiros de 64 bits adequadamente. É natural querer usar isso para representar `i64`s do Wasm. Isso é exatamente o que a funcionalidade de integração JS-BigInt faz!

O Emscripten suporta a integração de Wasm BigInt, o que podemos usar para compilar o exemplo original (sem nenhuma adaptação para legalização), apenas adicionando `-s WASM_BIGINT`:

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

Podemos então executá-lo (observe que atualmente precisamos passar para o Node.js uma flag para habilitar a integração BigInt):

```
node --experimental-wasm-bigint a.out.js
JS recebeu: 0xabcd12345678
```

Perfeito, exatamente o que queríamos!

E não só isso é mais simples, mas também mais rápido. Como mencionado anteriormente, na prática é raro que conversões de `i64` ocorram em um caminho crítico, mas quando ocorre a lentidão pode ser perceptível. Se transformarmos o exemplo acima em um teste de desempenho, executando muitas chamadas de `send_i64_to_js`, então a versão BigInt é 18% mais rápida.

Outro benefício da integração BigInt é que a ferramenta pode evitar a legalização. Se o Emscripten não precisar legalizar, ele pode não ter nenhum trabalho a fazer no Wasm gerado pelo LLVM, o que acelera os tempos de construção. Você pode obter essa aceleração se construir com `-s WASM_BIGINT` e não fornecer outras flags que exijam alterações. Por exemplo, `-O0 -s WASM_BIGINT` funciona (mas compilações otimizadas [executam o otimizador Binaryen](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times), o que é importante para o tamanho).

## Conclusão

A integração de WebAssembly BigInt foi implementada em [vários navegadores](https://webassembly.org/roadmap/), incluindo o Chrome 85 (lançado em 25/08/2020), então você já pode experimentá-lo hoje!
