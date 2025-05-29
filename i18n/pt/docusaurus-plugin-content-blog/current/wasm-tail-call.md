---
title: &apos;Chamadas em cauda no WebAssembly&apos;
author: &apos;Thibaud Michaud, Thomas Lively&apos;
date: 2023-04-06
tags:
  - WebAssembly
description: &apos;Este documento explica a proposta de chamadas em cauda do WebAssembly e a demonstra com alguns exemplos.&apos;
tweet: &apos;1644077795059044353&apos;
---
Estamos implementando chamadas em cauda no WebAssembly no V8 v11.2! Neste post, fornecemos uma breve visão geral dessa proposta, demonstramos um caso de uso interessante para corrotinas em C++ com Emscripten e mostramos como o V8 lida com chamadas em cauda internamente.

## O que é Otimização de Chamadas em Cauda?

Uma chamada está em posição de cauda se for a última instrução executada antes de retornar da função atual. Compiladores podem otimizar tais chamadas descartando o quadro do chamador e substituindo a chamada por um salto.

Isso é especialmente útil para funções recursivas. Por exemplo, considere esta função em C que soma os elementos de uma lista encadeada:

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

Com uma chamada regular, isso consome espaço em pilha 𝒪(n): cada elemento da lista adiciona um novo quadro na pilha de chamadas. Com uma lista suficientemente longa, isso pode estourar rapidamente a pilha. Substituindo a chamada por um salto, a otimização de chamadas em cauda efetivamente transforma esta função recursiva em um laço que usa espaço em pilha 𝒪(1):

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

Essa otimização é particularmente importante para linguagens funcionais. Elas dependem fortemente de funções recursivas, e linguagens puramente funcionais como Haskell nem sequer oferecem estruturas de controle de laço. Qualquer tipo de iteração personalizada geralmente usa recursão de alguma forma. Sem a otimização de chamadas em cauda, isso rapidamente levaria a um estouro de pilha em qualquer programa não trivial.

### A proposta de chamadas em cauda do WebAssembly

Existem duas maneiras de chamar uma função no Wasm MVP: `call` e `call_indirect`. A proposta de chamadas em cauda do WebAssembly adiciona os equivalentes de chamadas em cauda: `return_call` e `return_call_indirect`. Isso significa que é responsabilidade da cadeia de ferramentas realizar a otimização de chamadas em cauda e emitir o tipo de chamada apropriado, o que proporciona mais controle sobre o desempenho e o uso de espaço na pilha.

Vamos observar uma função recursiva de Fibonacci. O bytecode Wasm está incluído aqui no formato de texto para completude, mas você pode encontrá-lo em C++ na próxima seção:

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

Em qualquer momento, existe apenas um quadro `fib_rec`, que se desfaz antes de realizar a próxima chamada recursiva. Quando atingimos o caso base, `fib_rec` retorna o resultado `a` diretamente para `fib`.

Uma consequência observável das chamadas em cauda é (além da redução do risco de estouro de pilha) que os chamadores em cauda não aparecem em rastreamentos de pilha. Tampouco aparecem na propriedade stack de uma exceção capturada, nem no rastreamento de pilha do DevTools. No momento em que uma exceção é lançada ou a execução pausa, os quadros dos chamadores em cauda já desapareceram e não há como o V8 recuperá-los.

## Usando chamadas em cauda com Emscripten

Linguagens funcionais muitas vezes dependem de chamadas em cauda, mas é possível usá-las como um programador de C ou C++ também. O Emscripten (e o Clang, que o Emscripten usa) suporta o atributo musttail, que informa ao compilador que uma chamada deve ser compilada como uma chamada em cauda. Por exemplo, considere esta implementação recursiva da função Fibonacci que calcula o n-ésimo número de Fibonacci mod 2^32 (porque os inteiros estouram para valores grandes de `n`):

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

Após compilar com `emcc test.c -o test.js`, executar este programa no Node.js gera um erro de estouro de pilha. Podemos corrigir isso adicionando `__attribute__((__musttail__))` ao retorno em `fib_rec` e adicionando `-mtail-call` aos argumentos de compilação. Agora os módulos Wasm produzidos contêm as novas instruções de chamadas em cauda, então precisamos passar `--experimental-wasm-return_call` para o Node.js, mas a pilha não transborda mais.

Aqui está um exemplo usando recursão mútua também:

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return is_even(n - 1);
}

bool is_even(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

Observe que ambos os exemplos são simples o suficiente para que, se compilarmos com `-O2`, o compilador possa pré-computar a resposta e evitar o esgotamento da pilha mesmo sem chamadas em cauda, mas isso não seria o caso com um código mais complexo. Em código do mundo real, o atributo musttail pode ser útil para escrever loops de interpretadores de alto desempenho, conforme descrito [neste post de blog](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html) por Josh Haberman.

Além do atributo `musttail`, o C++ depende de chamadas em cauda para outro recurso: corrotinas do C++20. A relação entre chamadas em cauda e corrotinas do C++20 é abordada em detalhes extremos [neste post de blog](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer) de Lewis Baker, mas para resumir, é possível usar corrotinas em um padrão que pode causar sutilmente um estouro de pilha, mesmo que o código-fonte não faça parecer que existe um problema. Para resolver esse problema, o comitê do C++ adicionou uma exigência de que os compiladores implementem a “transferência simétrica” para evitar o estouro de pilha, o que na prática significa usar chamadas em cauda nos bastidores.

Quando chamadas em cauda do WebAssembly são habilitadas, o Clang implementa a transferência simétrica conforme descrito naquele post de blog, mas quando as chamadas em cauda não estão habilitadas, o Clang compila silenciosamente o código sem a transferência simétrica, o que pode levar a estouros de pilha e é tecnicamente uma implementação incorreta do C++20!

Para ver a diferença na prática, use o Emscripten para compilar o último exemplo do post de blog vinculado acima e observe que ele só evita o estouro da pilha se as chamadas em cauda estiverem habilitadas. Observe que, devido a um bug recentemente corrigido, isso só funciona corretamente no Emscripten 3.1.35 ou posterior.

## Chamadas em cauda no V8

Como vimos anteriormente, não é responsabilidade do motor detectar chamadas em posição de cauda. Isso deve ser feito a montante pela cadeia de ferramentas. Assim, a única coisa que resta para o TurboFan (o compilador otimizador do V8) é emitir uma sequência apropriada de instruções com base no tipo de chamada e na assinatura da função de destino. Para nosso exemplo do fibonacci anterior, a pilha ficaria assim:

![Chamada em cauda simples no TurboFan](/_img/wasm-tail-calls/tail-calls.svg)

À esquerda, estamos dentro de `fib_rec` (verde), chamado por `fib` (azul) e prestes a chamar recursivamente `fib_rec` em cauda. Primeiro, desfazemos o quadro atual reiniciando o ponteiro de quadro e o ponteiro de pilha. O ponteiro de quadro apenas restaura seu valor anterior lendo-o do slot “Caller FP”. O ponteiro da pilha move-se para o topo do quadro pai, mais espaço suficiente para quaisquer parâmetros de pilha e valores de retorno de pilha potenciais do chamado (0 neste caso, tudo é passado por registradores). Os parâmetros são movidos para seus registradores esperados de acordo com a ligação de `fib_rec` (não mostrado no diagrama). E, finalmente, começamos a executar `fib_rec`, que começa criando um novo quadro.

`fib_rec` desfaz e refaz a si mesmo assim até que `n == 0`, ponto em que retorna `a` por registrador para `fib`.

Este é um caso simples onde todos os parâmetros e valores de retorno cabem nos registradores, e o chamado tem a mesma assinatura que o chamador. No caso geral, pode ser necessário fazer manipulações complexas na pilha:

- Ler parâmetros de saída do quadro antigo
- Mover os parâmetros para o novo quadro
- Ajustar o tamanho do quadro movendo o endereço de retorno para cima ou para baixo, dependendo do número de parâmetros de pilha no chamado

Todas essas leituras e escritas podem entrar em conflito umas com as outras, porque estamos reutilizando o mesmo espaço de pilha. Esta é uma diferença crucial em relação a uma chamada não em cauda, que simplesmente empurraria todos os parâmetros de pilha e o endereço de retorno para o topo da pilha.

![Chamada em cauda complexa no TurboFan](/_img/wasm-tail-calls/tail-calls-complex.svg)

O TurboFan lida com essas manipulações da pilha e dos registradores com o “gap resolver”, um componente que pega uma lista de movimentos que deveriam semanticamente ser executados em paralelo e gera a sequência apropriada de movimentos para resolver potenciais interferências entre as fontes e os destinos desses movimentos. Se os conflitos forem acíclicos, trata-se apenas de reordenar os movimentos para que todas as fontes sejam lidas antes de serem sobrescritas. Para conflitos cíclicos (por exemplo, se trocarmos dois parâmetros de pilha), isso pode envolver mover uma das fontes para um registrador temporário ou um slot de pilha temporário para quebrar o ciclo.

Chamadas finais também são suportadas no Liftoff, nosso compilador de linha de base. De fato, elas devem ser suportadas, ou o código de linha de base pode ficar sem espaço na pilha. No entanto, elas não são otimizadas neste nível: Liftoff empilha os parâmetros, endereço de retorno e ponteiro de quadro para completar o quadro como se fosse uma chamada regular, e então desloca tudo para baixo para descartar o quadro do chamador:

![Chamadas finais no Liftoff](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

Antes de saltar para a função alvo, nós também retiramos o FP do chamador para o registrador FP para restaurar seu valor anterior, e para permitir que a função alvo o empilhe novamente no prólogo.

Essa estratégia não exige que analisemos e resolvamos conflitos de movimento, o que torna a compilação mais rápida. O código gerado é mais lento, mas eventualmente [sobe de nível](/blog/wasm-dynamic-tiering) para TurboFan se a função for suficientemente utilizada.
