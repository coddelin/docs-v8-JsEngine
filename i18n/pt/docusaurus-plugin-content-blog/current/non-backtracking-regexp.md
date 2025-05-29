---
title: "Um mecanismo adicional de RegExp sem retrocesso"
author: "Martin Bidlingmaier"
date: 2021-01-11
tags: 
 - internos
 - RegExp
description: "O V8 agora possui um mecanismo de RegExp adicional que atua como um mecanismo de fallback e previne muitos casos de retrocessos catastróficos."
tweet: "1348635270762139650"
---
A partir da versão 8.8, o V8 inclui um novo mecanismo experimental de RegExp sem retrocesso (além do já existente [mecanismo Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)) que garante execução em tempo linear em relação ao tamanho da string de entrada. O mecanismo experimental está disponível por trás dos sinalizadores de funcionalidade mencionados abaixo.

<!--truncate-->
![Tempo de execução de `/(a*)*b/.exec('a'.repeat(n))` para n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

Veja como você pode configurar o novo mecanismo de RegExp:

- `--enable-experimental-regexp_engine-on-excessive-backtracks` habilita o fallback para o mecanismo sem retrocesso em casos de retrocessos excessivos.
- `--regexp-backtracks-before-fallback N` (padrão N = 50.000) especifica quantos retrocessos são considerados "excessivos", ou seja, quando o fallback é acionado.
- `--enable-experimental-regexp-engine` ativa o reconhecimento do sinalizador não padrão `l` (“linear”) para RegExps, como em, por exemplo, `/(a*)*b/l`. As RegExps construídas com este sinalizador são sempre executadas ansiosamente pelo novo mecanismo; o Irregexp não está envolvido de forma alguma. Se o novo mecanismo de RegExp não puder lidar com o padrão de uma RegExp `l`, então uma exceção será lançada na construção. Esperamos que em algum momento esse recurso possa ser utilizado para reforçar aplicações que executam RegExps em entradas não confiáveis. Por enquanto, permanece experimental porque o Irregexp é ordens de magnitude mais rápido que o novo mecanismo na maioria dos padrões comuns.

O mecanismo de fallback não se aplica a todos os padrões. Para que o mecanismo de fallback seja acionado, a RegExp deve:

- não conter retro-referências,
- não conter lookaheads ou lookbehinds,
- não conter repetições finitas grandes ou profundamente aninhadas, como em, por exemplo, `/a{200,500}/`, e
- não ter os sinalizadores `u` (Unicode) ou `i` (insensível a maiúsculas/minúsculas) definidos.

## Contexto: retrocesso catastrófico

A correspondência de RegExp no V8 é manejada pelo mecanismo Irregexp. O Irregexp compila JIT RegExps em código nativo especializado (ou [bytecode](/blog/regexp-tier-up)) e, portanto, é extremamente rápido para a maioria dos padrões. Para alguns padrões, no entanto, o tempo de execução do Irregexp pode explodir exponencialmente em relação ao tamanho da string de entrada. O exemplo acima, `/(a*)*b/.exec('a'.repeat(100))`, não termina durante nossa vida se executado pelo Irregexp.

Então, o que está acontecendo aqui? O Irregexp é um mecanismo de *retrocessos*. Quando confrontado com uma escolha de como uma correspondência pode continuar, o Irregexp explora a primeira alternativa em sua totalidade e, em seguida, faz retrocesso se necessário para explorar a segunda alternativa. Considere, por exemplo, corresponder o padrão `/abc|[az][by][0-9]/` contra a string de entrada `'ab3'`. Aqui, o Irregexp tenta corresponder `/abc/` primeiro e falha após o segundo caractere. Em seguida, ele retrocede por dois caracteres e corresponde com sucesso à segunda alternativa `/[az][by][0-9]/`. Em padrões com quantificadores como `/(abc)*xyz/`, o Irregexp precisa escolher, após uma correspondência do corpo, se corresponde novamente ao corpo ou se continua com o padrão restante.

Vamos tentar entender o que está acontecendo ao corresponder `/(a*)*b/` contra uma string de entrada menor, digamos `'aaa'`. Este padrão contém quantificadores aninhados, portanto estamos pedindo ao Irregexp para corresponder a uma *sequência de sequências* de `'a'` e depois corresponder `'b'`. Claramente, não há correspondência porque a string de entrada não contém `'b'`. No entanto, `/(a*)*/` corresponde, e o faz de formas exponencialmente numerosas:

```js
'aaa'           'aa', 'a'           'aa', ''
'a', 'aa'       'a', 'a', 'a'       'a', 'a', ''
…
```

A priori, o Irregexp não pode descartar que a falha em corresponder ao final `/b/` se deve a escolher uma maneira errada de corresponder `/(a*)*/`, de modo que ele precisa tentar todas as variantes. Esse problema é conhecido como retrocesso “exponencial” ou “catastrófico”.

## RegExps como autômatos e bytecode

Para entender um algoritmo alternativo que é imune ao retrocesso catastrófico, precisamos fazer um pequeno desvio por [autômatos](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton). Toda expressão regular é equivalente a um autômato. Por exemplo, a RegExp `/(a*)*b/` acima corresponde ao seguinte autômato:

![Autômato correspondente a `/(a*)*b/`](/_img/non-backtracking-regexp/example-automaton.svg)

Note que o autômato não é unicamente determinado pelo padrão; o que você vê acima é o autômato que você obterá por um processo de tradução mecânica, e é o que é usado dentro do novo mecanismo de RegExp do V8 para `/(a*)*/`.
As arestas não rotuladas são transições épsilon: elas não consomem entrada. As transições épsilon são necessárias para manter o tamanho do autômato aproximadamente ao tamanho do padrão. Eliminar ingenuamente as transições épsilon pode resultar em um aumento quadrático no número de transições.
As transições épsilon também permitem construir o autômato correspondente a uma RegExp a partir dos seguintes quatro tipos básicos de estados:

![Instruções de bytecode de RegExp](/_img/non-backtracking-regexp/state-types.svg)

Aqui classificamos apenas as transições *saindo* do estado, enquanto as transições que entram no estado ainda podem ser arbitrárias. Autômatos construídos apenas a partir desses tipos de estados podem ser representados como *programas de bytecode*, com cada estado correspondendo a uma instrução. Por exemplo, um estado com duas transições épsilon é representado como uma instrução `FORK`.

## O algoritmo de retrocesso

Vamos rever o algoritmo de retrocesso no qual a Irregexp é baseada e descrevê-lo em termos de autômatos. Suponha que temos um array de bytecode `code` correspondente ao padrão e queremos `testar` se uma `entrada` corresponde ao padrão. Vamos assumir que `code` se parece com isto:

```js
const code = [
  {opcode: 'FORK', forkPc: 4},
  {opcode: 'CONSUME', char: '1'},
  {opcode: 'CONSUME', char: '2'},
  {opcode: 'JMP', jmpPc: 6},
  {opcode: 'CONSUME', char: 'a'},
  {opcode: 'CONSUME', char: 'b'},
  {opcode: 'ACCEPT'}
];
```

Este bytecode corresponde ao padrão (sticky) `/12|ab/y`. O campo `forkPc` da instrução `FORK` é o índice (contador de programa) do estado/instrução alternativa em que podemos continuar, e da mesma forma para `jmpPc`. Os índices são baseados em zero. O algoritmo de retrocesso pode agora ser implementado em JavaScript da seguinte forma.

```js
let ip = 0; // Posição de entrada.
let pc = 0; // Contador de programa: índice da próxima instrução.
const stack = []; // Pilha de retrocesso.
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case 'CONSUME':
      if (ip < input.length && input[ip] === inst.char) {
        // Entrada corresponde ao que esperamos: Continuar.
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // Caractere de entrada errado, mas podemos retroceder.
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // Caractere errado, não pode retroceder.
        return false;
      }
      break;
    case 'FORK':
      // Salvar alternativa para retroceder mais tarde.
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case 'JMP':
      pc = inst.jmpPc;
      break;
    case 'ACCEPT':
      return true;
  }
}
```

Esta implementação entra em loop indefinidamente se o programa de bytecode contiver loops que não consomem nenhum caractere, ou seja, se o autômato contiver um loop consistindo apenas de transições épsilon. Este problema pode ser resolvido com lookahead de apenas um caractere. A Irregexp é muito mais sofisticada do que esta implementação simples, mas, em última análise, baseada no mesmo algoritmo.

## O algoritmo sem retrocesso

O algoritmo de retrocesso corresponde a uma travessia *em profundidade* do autômato: sempre exploramos a primeira alternativa de uma instrução `FORK` em sua totalidade e retrocedemos à segunda alternativa, se necessário. A alternativa a este, o algoritmo sem retrocesso, é, assim, previsivelmente baseado em uma travessia *em largura* do autômato. Aqui consideramos todas as alternativas simultaneamente, sincronizadas em relação à posição atual na string de entrada. Assim, mantemos uma lista de estados atuais e, em seguida, avançamos todos os estados ao tomar transições correspondentes a cada caractere de entrada. Crucialmente, removemos duplicatas da lista de estados atuais.

Uma implementação simples em JavaScript se parece com isto:

```js
// Posição de entrada.
let ip = 0;
// Lista de valores atuais de pc, ou `'ACCEPT'` se encontrarmos uma correspondência. Começamos em
// pc 0 e seguimos transições épsilon.
let pcs = followEpsilons([0]);

while (true) {
  // Terminado se encontrarmos uma correspondência…
  if (pcs === 'ACCEPT') return true;
  // Ou se esgotarmos a string de entrada.
  if (ip >= input.length) return false;

  // Continuar apenas com os pcs que CONSUMEM o caractere correto.
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // Avançar os pcs restantes para a próxima instrução.
  pcs = pcs.map(pc => pc + 1);
  // Seguir as transições épsilon.
  pcs = followEpsilons(pcs);

  ++ip;
}
```

Aqui `followEpsilons` é uma função que recebe uma lista de contadores de programa e calcula a lista de contadores de programa nas instruções de `CONSUME` que podem ser alcançadas através de transições épsilon (ou seja, executando apenas `FORK` e `JMP`). A lista retornada não deve conter duplicatas. Se uma instrução `ACCEPT` puder ser alcançada, a função retorna `'ACCEPT'`. Pode ser implementado assim:

```js
function followEpsilons(pcs) {
  // Conjunto de pcs que já vimos até agora.
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // Podemos ignorar pc se já o vimos antes.
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case 'CONSUME':
        result.push(pc);
        break;
      case 'FORK':
        pcs.push(pc + 1, inst.forkPc);
        break;
      case 'JMP':
        pcs.push(inst.jmpPc);
        break;
      case 'ACCEPT':
        return 'ACCEPT';
    }
  }

  return result;
}
```

Graças à eliminação de duplicados através do conjunto `visitedPcs`, sabemos que cada contador de programa é examinado apenas uma vez em `followEpsilons`. Isso garante que a lista `result` não contém duplicados e que o tempo de execução de `followEpsilons` é limitado pelo tamanho do array `code`, ou seja, o tamanho do padrão. `followEpsilons` é chamado no máximo `input.length` vezes, então o tempo total de execução da correspondência de RegExp é limitado por `𝒪(pattern.length * input.length)`.

O algoritmo sem retrocesso pode ser estendido para suportar a maioria dos recursos das expressões regulares do JavaScript, por exemplo, limites de palavras ou o cálculo de limites de (sub)correspondência. Infelizmente, referências retroativas, lookahead e lookbehind não podem ser suportados sem alterações significativas que alterem a complexidade assintótica no pior caso.

O novo mecanismo de RegExp do V8 é baseado neste algoritmo e sua implementação nas bibliotecas [re2](https://github.com/google/re2) e [Rust regex](https://github.com/rust-lang/regex). O algoritmo é discutido com muito mais profundidade do que aqui em uma excelente [série de postagens de blog](https://swtch.com/~rsc/regexp/) de Russ Cox, que também é o autor original da biblioteca re2.
