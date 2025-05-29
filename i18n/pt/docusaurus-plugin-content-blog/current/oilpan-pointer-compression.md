---
title: 'Compressão de ponteiros em Oilpan'
author: 'Anton Bikineev, e Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), analisadores de desmontagem em ação'
avatars:
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags:
  - internals
  - memória
  - cppgc
description: 'A compressão de ponteiros em Oilpan permite comprimir ponteiros C++ e reduzir o tamanho do heap em até 33%.'
tweet: '1597274125780893697'
---

> É absolutamente idiota ter ponteiros de 64 bits quando eu compilo um programa que utiliza menos de 4 gigabytes de RAM. Quando esses valores de ponteiros aparecem dentro de uma estrutura, eles não apenas desperdiçam metade da memória, mas também efetivamente descartam metade do cache.
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

Palavras mais verdadeiras quase nunca foram ditas. Também vemos fabricantes de CPUs não lançando efetivamente [CPUs de 64 bits](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors) e os OEMs de Android [optando por apenas 39 bits de espaço de endereço](https://www.kernel.org/doc/Documentation/arm64/memory.txt) para acelerar caminhadas na tabela de páginas no Kernel. O V8 executado no Chrome também [isola sites em processos separados](https://www.chromium.org/Home/chromium-security/site-isolation/), o que limita ainda mais os requisitos de espaço de endereço real necessário para uma única aba. Nada disso é completamente novo, razão pela qual lançamos [compressão de ponteiros no V8 em 2020](https://v8.dev/blog/pointer-compression) e vimos grandes melhorias na memória na web. Com a [biblioteca Oilpan](https://v8.dev/blog/oilpan-library) temos mais um bloco de construção da web sob controle. [Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md) é um coletor de lixo baseado em rastreamento para C++ usado, entre outras coisas, para hospedar o Document Object Model no Blink e, portanto, um alvo interessante para otimizar memória.

## Contexto

A compressão de ponteiros é um mecanismo para reduzir o tamanho dos ponteiros em plataformas de 64 bits. Os ponteiros em Oilpan estão encapsulados em um ponteiro inteligente chamado [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h). Em uma estrutura de heap não compactada, as referências `Member` apontam diretamente para objetos no heap, ou seja, 8 bytes de memória são usados por referência. Em tal cenário, o heap pode ser espalhado por todo o espaço de endereço, já que cada ponteiro contém todas as informações relevantes para referenciar um objeto.

![Layout do heap não compactado](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

Com uma estrutura de heap compactada, as referências `Member` são apenas deslocamentos dentro de uma jaula de heap, que é uma região contígua de memória. A combinação de um ponteiro base (base) que aponta para o início da jaula de heap e um membro forma um ponteiro completo, muito semelhante ao funcionamento do [endereçamento segmentado](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging). O tamanho de uma jaula de heap é limitado pelos bits disponíveis para o deslocamento. Por exemplo, uma jaula de heap de 4GB requer deslocamentos de 32 bits.

![Layout do heap compactado](/_img/oilpan-pointer-compression/compressed-layout.svg)

Convenientemente, os heaps Oilpan já estão contidos em uma jaula de heap de 4GB em plataformas de 64 bits, para permitir referenciar metadados de coleta de lixo apenas alinhando qualquer ponteiro de heap válido ao limite de 4GB mais próximo.

O Oilpan também oferece suporte a múltiplos heaps no mesmo processo para, por exemplo, suportar web workers com seus próprios heaps de C++ no Blink. O problema que surge nesta configuração é como mapear heaps para, possivelmente, muitas jaulas de heap. Como os heaps estão vinculados a threads nativas no Blink, a solução aqui é referenciar jaulas de heap por meio de um ponteiro base local do thread. Dependendo de como o V8 e seus incorporadores são compilados, o modelo de armazenamento local de thread (TLS) pode ser restrito para acelerar como a base é carregada da memória. No final, o modo TLS mais genérico é necessário para suportar Android, já que nesta plataforma o renderer (e, portanto, o V8) é carregado via `dlopen`. São essas restrições que tornam o uso de TLS inviável do ponto de vista de desempenho[^1]. Para fornecer o melhor desempenho, o Oilpan, semelhante ao V8, aloca todos os heaps em uma única jaula de heap ao usar compressão de ponteiros. Embora isso restrinja a memória geral disponível, acreditamos que isso seja atualmente aceitável, considerando que a compressão de ponteiros já busca reduzir a memória. Se uma única jaula de heap de 4GB provar ser muito restritiva, o esquema de compressão atual permite aumentar o tamanho da jaula de heap para 16GB sem sacrificar o desempenho.

## Implementação no Oilpan

### Requisitos

Até agora, falamos sobre um esquema de codificação trivial onde o ponteiro completo é formado pela adição de uma base a um deslocamento que é armazenado em um ponteiro Member. O esquema implementado, infelizmente, não é tão simples, já que o Oilpan requer que o Member possa ser atribuído a um dos seguintes:

1. Um ponteiro válido para um objeto no heap;
2. O `nullptr` do C++ (ou similar);
3. Um valor sentinela que deve ser conhecido em tempo de compilação. O valor sentinela pode, por exemplo, ser usado para sinalizar valores excluídos em tabelas de hash que também suportam `nullptr` como entradas.

A parte problemática em relação ao `nullptr` e ao sentinela é a falta de tipos explícitos para captá-los no lado do chamador:

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

Como não há um tipo explícito para armazenar um valor `nullptr` possivelmente comprimido, é necessária uma descompressão real para comparar com a constante.

Tendo esse uso em mente, procuramos um esquema que manipule transparentemente os casos 1.-3. Como a sequência de compressão e descompressão será integrada em todos os lugares onde o Member é usado, as seguintes propriedades também são desejáveis:

- Sequência de instruções rápida e compacta para minimizar falhas de cache de instruções.
- Sequência de instruções sem ramificações para evitar o uso excessivo de preditores de ramificação.

Como se espera que leituras superem significativamente escritas, permitimos um esquema assimétrico onde a descompressão rápida é preferida.

### Compressão e Descompressão

Para ser breve, esta descrição cobre apenas o esquema de compressão final utilizado. Consulte nosso [documento de design](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao) para mais informações sobre como chegamos lá e as alternativas consideradas.

A ideia principal para o esquema implementado atualmente é separar ponteiros regulares do heap de `nullptr` e sentinela, confiando no alinhamento da gaiola do heap. Essencialmente, a gaiola do heap é alocada com alinhamento, de modo que o bit menos significativo da metade superior seja sempre definido. Denotamos as metades superior e inferior (32 bits cada) como U<sub>31</sub>...U<sub>0</sub> e L<sub>31</sub>...L<sub>0</sub>, respectivamente.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | metade superior                          | metade inferior                          |
| ------------ | ---------------------------------------: | ----------------------------------------: |
| ponteiro heap| <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| sentinela    | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

A compressão gera um valor comprimido apenas deslocando à direita por um e truncando a metade superior do valor. Dessa forma, o bit de alinhamento (que agora se torna o bit mais significativo do valor comprimido) sinaliza um ponteiro válido do heap.

:::table-wrapper
| C++                                             | Assembly x64  |
| :---------------------------------------------- | :------------ |
| ```cpp                                          | ```asm        \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi  \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax       \
| \}                                               | ```           \
| ```                                             |               |
:::

O codificação para valores comprimidos é, portanto, como segue:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | valor comprimido                         |
| ------------ | ---------------------------------------: |
| ponteiro heap| <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`    | <tt>0...00</tt>                          |
| sentinela    | <tt>0...01</tt>                          |
<!-- markdownlint-enable no-inline-html -->
:::

Note que isso permite descobrir se um valor comprimido representa um ponteiro de heap, `nullptr` ou o valor sentinela, o que é importante para evitar descompressões inúteis em código do usuário (veja abaixo).

A ideia para descompressão, então, é confiar em um ponteiro base especialmente elaborado, no qual os 32 bits menos significativos são definidos como 1.

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | metade superior                          | metade inferior |
| ------------ | ---------------------------------------: | ---------------: |
| base         | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt>  |
<!-- markdownlint-enable no-inline-html -->
:::


A operação de descompressão primeiro estende o sinal do valor comprimido e, em seguida, desloca à esquerda para desfazer a operação de compressão para o bit de sinal. O valor intermediário resultante é codificado como segue

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | metade superior | metade inferior                           |
| ------------ | ---------------: | ----------------------------------------: |
| ponteiro heap| <tt>1...1</tt>  | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinel     | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

Finalmente, o ponteiro descompactado é apenas o resultado de uma operação AND bit a bit entre este valor intermediário e o ponteiro base.

:::table-wrapper
| C++                                                    | Assembly x64       |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

O esquema resultante lida com os casos 1.-3. de forma transparente por meio de um esquema assimétrico sem ramificação. A compressão usa 3 bytes, sem contar o movimento inicial do registrador, pois a chamada de qualquer forma seria embutida. A descompressão usa 13 bytes, contando o movimento inicial do registrador que estende o sinal.

## Detalhes selecionados

A seção anterior explicou o esquema de compressão utilizado. Um esquema compacto de compressão é necessário para alcançar um alto desempenho. O esquema de compressão descrito ainda resultou em regressões observáveis no Speedometer. Os parágrafos a seguir explicam alguns detalhes adicionais necessários para melhorar o desempenho do Oilpan a um nível aceitável.

### Otimização do carregamento da base da jaula

Tecnicamente, em termos de C++, o ponteiro base global não pode ser uma constante, porque ele é inicializado em tempo de execução após `main()`, sempre que o embutidor inicializa o Oilpan. Tornar essa variável global mutável inibiria a importante otimização de propagação constante, por exemplo, o compilador não poderia provar que uma chamada aleatória não modifica a base e teria de carregá-la duas vezes:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | Assembly x64                    |
| :------------------------- | :------------------------------ |
| ```cpp                     | ```asm                          \
| void foo(GCed*);           | baz(Member&lt;GCed>):              \
| void bar(GCed*);           |   movsxd rbx, edi               \
|                            |   add rbx, rbx                  \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr            \
|   foo(m.get());            |       [rip + base]              \
|   bar(m.get());            |   and rdi, rbx                  \
| }                          |   call foo(GCed*)               \
| ```                        |   and rbx, qword ptr            \
|                            |       [rip + base] # carga extra \
|                            |   mov rdi, rbx                  \
|                            |   jmp bar(GCed*)                \
|                            | ```                             |
<!-- markdownlint-enable no-inline-html -->
:::

Com alguns atributos adicionais, ensinamos o clang a tratar a base global como constante e, assim, de fato realizar apenas uma única carga em um contexto.

### Evitando a descompressão completamente

A sequência de instruções mais rápida é um nop! Com isso em mente, para muitas operações com ponteiros, compressões e descompressões redundantes podem ser facilmente evitadas. Trivialmente, não precisamos descompactar um Member para verificar se ele é nullptr. Não precisamos descompactar e compactar ao construir ou atribuir um Member a partir de outro Member. A comparação de ponteiros é preservada pela compressão, então podemos evitar transformações para eles também. A abstração Member nos serve bem como um gargalo aqui.

O hashing pode ser acelerado com ponteiros compactados. A descompressão para cálculo de hash é redundante, porque a base fixa não aumenta a entropia do hash. Em vez disso, uma função de hashing mais simples para inteiros de 32 bits pode ser usada. O Blink tem muitas tabelas de hash que usam Member como chave; o hashing de 32 bits resultou em coleções mais rápidas!

### Ajudando o clang onde ele falha em otimizar

Ao analisar o código gerado, encontramos outro lugar interessante onde o compilador não realizou otimizações suficientes:

:::table-wrapper
| C++                               | Assembly x64               |
| :-------------------------------- | :------------------------- |
| ```cpp                            | ```asm                     \
| extern const uint64_t base;       | Assign(unsigned int):      \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr       \
| void Assign(uint32_t ptr) \{       |       [rip + base]         \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # muito raro \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

O código gerado realiza o carregamento base no bloco básico principal, mesmo que a variável não seja usada nele e poderia ser facilmente movida para o bloco básico abaixo, onde a chamada para `SlowPath()` é feita e o ponteiro descompactado é realmente utilizado. O compilador decidiu de forma conservadora não reordenar o carregamento não atômico com o carregamento atômico relaxado, mesmo que isso fosse perfeitamente legal de acordo com as regras da linguagem. Movemos manualmente a descompressão abaixo da leitura atômica para tornar a atribuição com a barreira de gravação o mais eficiente possível.


### Melhorando o empacotamento de estruturas no Blink

É difícil estimar o efeito de reduzir pela metade o tamanho dos ponteiros do Oilpan. Na essência, isso deve melhorar a utilização de memória para estruturas de dados “empacotadas”, como contêineres desses ponteiros. As medições locais mostraram uma melhoria de cerca de 16% da memória do Oilpan. No entanto, a investigação mostrou que, para alguns tipos, não reduzimos seu tamanho real, mas apenas aumentamos o preenchimento interno entre os campos.

Para minimizar esse preenchimento, escrevemos um plugin do clang que identificava automaticamente as classes coletadas como lixo para as quais a reordenação dos campos reduziria o tamanho geral da classe. Como houve muitos desses casos no código do Blink, aplicamos a reordenação aos mais utilizados, veja o [documento de design](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA).

### Tentativa fracassada: limitando o tamanho da área do heap

Nem toda otimização funcionou bem. Em uma tentativa de otimizar ainda mais a compressão, limitamos a área do heap a 2GB. Garantimos que o bit mais significativo da metade inferior da base da área fosse 1, o que nos permitiu evitar o deslocamento completamente. A compressão se tornaria uma simples truncagem e a descompressão uma simples carga e uma operação bit a bit.

Considerando que a memória Oilpan no processador Blink consome em média menos de 10MB, assumimos que seria seguro prosseguir com o esquema mais rápido e restringir o tamanho da área. Infelizmente, após o envio da otimização, começamos a receber erros de falta de memória em algumas cargas de trabalho raras. Decidimos reverter essa otimização.

## Resultados e futuro

A compressão de ponteiros no Oilpan foi ativada por padrão no **Chrome 106**. Observamos grandes melhorias de memória em geral:


<!-- markdownlint-disable no-inline-html -->
| Memória Blink | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:&apos;green&apos;}}>-21% (-1.37MB)</span>** | **<span style={{color:&apos;green&apos;}}>-33% (-59MB)</span>** |
| Android      | **<span style={{color:&apos;green&apos;}}>-6% (-0.1MB)</span>**   | **<span style={{color:&apos;green&apos;}}>-8% (-3.9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


Os números relatados representam o percentil 50 e 99 para a memória Blink alocada com Oilpan em toda a frota[^2]. Os dados relatados mostram o delta entre as versões estáveis do Chrome 105 e 106. Os números absolutos em MB dão uma indicação sobre o limite inferior que os usuários podem esperar ver. As melhorias reais geralmente são um pouco maiores devido a efeitos indiretos no consumo geral de memória do Chrome. A maior melhoria relativa sugere que o empacotamento de dados é melhor nesses casos, indicando que mais memória é usada em coleções (por exemplo, vetores) que têm bom empacotamento. O melhor preenchimento de estruturas foi implementado no Chrome 108 e mostrou outra melhoria de 4% na memória Blink, em média.

Como o Oilpan é onipresente no Blink, o custo de desempenho pode ser estimado no [Speedometer2](https://browserbench.org/Speedometer2.1/). O [protótipo inicial](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) baseado em uma versão local por thread mostrou uma regressão de 15%. Com todas as otimizações mencionadas, não observamos uma regressão notável.

### Escaneamento conservador de pilha

No Oilpan, a pilha é escaneada de forma conservadora para encontrar ponteiros para o heap. Com ponteiros comprimidos, isso significa que precisamos tratar cada meio-palavra como um possível ponteiro. Além disso, durante a compressão, o compilador pode decidir armazenar um valor intermediário na pilha, o que significa que o scanner deve considerar todos os valores intermediários possíveis (no nosso esquema de compressão, o único valor intermediário possível é um valor truncado, mas não ainda deslocado). Escanear valores intermediários aumentou o número de falsos positivos (ou seja, meios-palavras que se parecem com ponteiros comprimidos), o que reduziu a melhoria de memória em aproximadamente 3% (a melhoria estimada seria de 24% caso contrário).

### Outra compressão

Já vimos grandes melhorias ao aplicar compressão ao V8 JavaScript e ao Oilpan no passado. Achamos que o paradigma pode ser aplicado a outros ponteiros inteligentes no Chrome (por exemplo, `base::scoped_refptr`) que já apontam para outras áreas do heap. Experimentos iniciais [mostraram](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit) resultados promissores.

Investigações também mostraram que uma grande parte da memória é realmente mantida via vtables. No mesmo espírito, nós [habilitamos](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing) o ABI de vtable relativo no Android64, que compacta tabelas virtuais, permitindo-nos economizar mais memória e melhorar o tempo de inicialização ao mesmo tempo.

[^1]: Leitores interessados podem consultar o [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19) do Blink para ver o resultado da compilação de acesso TLS em diferentes modos.
[^2]: Os números são obtidos através da estrutura de análise de métricas de usuário do Chrome.
