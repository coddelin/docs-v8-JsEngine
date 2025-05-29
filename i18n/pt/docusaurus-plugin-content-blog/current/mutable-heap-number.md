---
title: "Turboalimentando o V8 com números de heap mutáveis"
author: "[Victor Gomes](https://twitter.com/VictorBFG), o deslocador de bits"
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - benchmarks
  - internals
description: "Adicionando números de heap mutáveis ao contexto de script"
tweet: ""
---

No V8, estamos constantemente buscando melhorar o desempenho do JavaScript. Como parte desse esforço, recentemente revisamos o conjunto de benchmarks [JetStream2](https://browserbench.org/JetStream2.1/) para eliminar gargalos de desempenho. Este post detalha uma otimização específica que realizamos e que resultou em uma melhoria significativa de `2.5x` no benchmark `async-fs`, contribuindo para um aumento perceptível na pontuação geral. A otimização foi inspirada pelo benchmark, mas padrões como esses aparecem em [código do mundo real](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248).

<!--truncate-->
# O alvo `async-fs` e uma peculiar `Math.random`

O benchmark `async-fs`, como o nome sugere, é uma implementação de sistema de arquivos em JavaScript, focando em operações assíncronas. No entanto, existe um surpreendente gargalo de desempenho: a implementação de `Math.random`. Ele usa uma implementação personalizada e determinística de `Math.random` para resultados consistentes entre execuções. A implementação é:

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

A variável chave aqui é `seed`. Ela é atualizada em cada chamada para `Math.random`, gerando a sequência pseudo-aleatória. Crucialmente, aqui `seed` é armazenado em um `ScriptContext`.

Um `ScriptContext` serve como um local de armazenamento para valores acessíveis dentro de um determinado script. Internamente, esse contexto é representado como um array de valores marcados do V8. Na configuração padrão do V8 para sistemas de 64 bits, cada um desses valores marcados ocupa 32 bits. O bit menos significativo de cada valor atua como uma marca. Um `0` indica um _Inteiro Pequeno_ de 31 bits (`SMI`). O valor inteiro real é armazenado diretamente, deslocado para a esquerda por um bit. Um `1` indica um [ponteiro comprimido](https://v8.dev/blog/pointer-compression) para um objeto no heap, onde o valor do ponteiro comprimido é incrementado em um.

![Layout de `ScriptContext`: slots azuis são ponteiros para os metadados do contexto e para o objeto global (`NativeContext`). O slot amarelo indica um valor de ponto flutuante de precisão dupla não marcado.](/_img/mutable-heap-number/script-context.svg)

Essa marcação diferencia como os números são armazenados. `SMIs` residem diretamente no `ScriptContext`. Números maiores ou aqueles com partes decimais são armazenados indiretamente como objetos imutáveis `HeapNumber` no heap (um double de 64 bits), com o `ScriptContext` contendo um ponteiro comprimido para eles. Essa abordagem lida eficientemente com vários tipos numéricos enquanto otimiza para o caso comum de `SMI`.

# O gargalo

O perfil de `Math.random` revelou dois grandes problemas de desempenho:

- **Alocação de `HeapNumber`:** O slot dedicado à variável `seed` no contexto de script aponta para um padrão `HeapNumber` imutável. Cada vez que a função `Math.random` atualiza `seed`, um novo objeto `HeapNumber` precisa ser alocado no heap, resultando em significativa pressão de alocação e coleta de lixo.

- **Aritmética de ponto flutuante:** Embora os cálculos dentro de `Math.random` sejam fundamentalmente operações de inteiros (usando deslocamentos e adições bit a bit), o compilador não consegue tirar total vantagem disso. Como `seed` é armazenado como um `HeapNumber` genérico, o código gerado usa instruções mais lentas de ponto flutuante. O compilador não pode provar que `seed` sempre conterá um valor representável como um inteiro. Enquanto o compilador poderia potencialmente especular sobre intervalos de inteiros de 32 bits, o V8 foca principalmente em `SMIs`. Mesmo com a especulação sobre inteiros de 32 bits, uma conversão possivelmente custosa de ponto flutuante de 64 bits para inteiro de 32 bits, juntamente com uma verificação sem perdas, ainda seria necessária.

# A solução

Para resolver esses problemas, implementamos uma otimização em duas partes:

- **Rastreamento de tipo de slot / slots mutáveis de número do heap:** Estendemos o [rastreamento de valor constante em contexto de script](https://issues.chromium.org/u/2/issues/42203515) (variáveis `let` que foram inicializadas mas nunca modificadas) para incluir informações de tipo. Rastreamos se o valor do slot é constante, um `SMI`, um `HeapNumber` ou um valor genérico marcado. Também introduzimos o conceito de slots mutáveis de número do heap dentro dos contextos de script, semelhante aos [campos mutáveis de número do heap](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber) para `JSObjects`. Em vez de apontar para um `HeapNumber` imutável, o slot de contexto de script é o proprietário do `HeapNumber`, e seu endereço não deve vazar. Isso elimina a necessidade de alocar um novo `HeapNumber` para cada atualização em código otimizado. O próprio `HeapNumber` é modificado localmente.

- **Heap mutável `Int32`:** Aprimoramos os tipos de slots do contexto de script para rastrear se um valor numérico está dentro da faixa `Int32`. Se estiver, o `HeapNumber` mutável armazena o valor como um `Int32` bruto. Se necessário, a transição para um `double` traz o benefício adicional de não requerer a realocação do `HeapNumber`. No caso de `Math.random`, o compilador agora pode observar que `seed` está sendo consistentemente atualizado com operações de inteiros e marcar o slot como contendo um `Int32` mutável.

![Máquina de estados do tipo de slot. Uma seta verde indica uma transição disparada ao armazenar um valor `SMI`. Setas azuis representam transições ao armazenar um valor `Int32`, e setas vermelhas, um valor de ponto flutuante de dupla precisão. O estado `Other` atua como um estado de absorção, impedindo transições posteriores.](/_img/mutable-heap-number/transitions.svg)

É importante notar que essas otimizações introduzem uma dependência de código do tipo do valor armazenado no slot de contexto. O código otimizado gerado pelo compilador JIT depende de o slot conter um tipo específico (neste caso, um `Int32`). Se algum código escrever um valor no slot `seed` que altere seu tipo (por exemplo, escrevendo um número de ponto flutuante ou uma string), o código otimizado precisará ser desotimizado. Essa desotimização é necessária para garantir a correção. Portanto, a estabilidade do tipo armazenado no slot é crucial para manter o desempenho máximo. No caso de `Math.random`, a máscara de bits no algoritmo garante que a variável seed sempre mantenha um valor `Int32`.

# Os resultados

Essas alterações aceleram significativamente a peculiar função `Math.random`:

- **Sem alocações / atualizações rápidas no local:** O valor `seed` é atualizado diretamente dentro de seu slot mutável no contexto de script. Nenhum novo objeto é alocado durante a execução de `Math.random`.

- **Operações de inteiros:** O compilador, armado com o conhecimento de que o slot contém um `Int32`, pode gerar instruções altamente otimizadas de inteiros (shifts, somas, etc.). Isso evita a sobrecarga da aritmética de ponto flutuante.

![Resultados do benchmark `async-fs` em um Mac M1. Pontuações mais altas são melhores.](/_img/mutable-heap-number/result.png)

O efeito combinado dessas otimizações é um aumento notável de `~2.5x` na velocidade do benchmark `async-fs`. Isso, por sua vez, contribui para uma melhoria de `~1.6%` na pontuação geral do JetStream2. Isso demonstra que código aparentemente simples pode criar gargalos de desempenho inesperados, e que pequenas otimizações direcionadas podem ter um grande impacto não apenas para o benchmark.

