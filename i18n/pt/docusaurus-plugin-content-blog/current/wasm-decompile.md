---
title: &apos;O que há naquele `.wasm`? Introduzindo: `wasm-decompile`&apos;
author: &apos;Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))&apos;
avatars:
  - &apos;wouter-van-oortmerssen&apos;
date: 2020-04-27
tags:
  - WebAssembly
  - ferramentas
description: &apos;WABT ganha uma nova ferramenta de descompilação que pode facilitar a leitura do conteúdo dos módulos Wasm.&apos;
tweet: &apos;1254829913561014272&apos;
---
Temos um número crescente de compiladores e outras ferramentas que geram ou manipulam arquivos `.wasm`, e às vezes você pode querer dar uma olhada por dentro. Talvez você seja um desenvolvedor de tal ferramenta, ou, mais diretamente, um programador direcionado ao Wasm, e esteja se perguntando como é o código gerado, seja por motivo de desempenho ou outros.

<!--truncate-->
O problema é que o Wasm é bastante de baixo nível, muito parecido com código de montagem real. Em particular, ao contrário, por exemplo, da JVM, todas as estruturas de dados foram compiladas para operações de carregamento/armazenamento, em vez de classes e campos convenientemente nomeados. Compiladores como o LLVM podem realizar uma quantidade impressionante de transformações que fazem o código gerado parecer nada com o código original.

## Desmontar ou... descompilar?

Você poderia usar ferramentas como `wasm2wat` (parte do [WABT](https://github.com/WebAssembly/wabt) toolkit), para transformar um `.wasm` no formato de texto padrão do Wasm, `.wat`, que é uma representação muito fiel, mas não particularmente legível.

Por exemplo, uma função em C simples como um produto escalar:

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

Usamos `clang dot.c -c -target wasm32 -O2` seguido por `wasm2wat -f dot.o` para transformá-lo neste `.wat`:

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
        (f32.load offset=8
          (local.get 1))))))
```

Isso é um pedaço pequeno de código, mas já não é muito agradável de ler por muitos motivos. Além da falta de uma sintaxe baseada em expressões e da verbosidade geral, entender estruturas de dados como carregamentos de memória não é fácil. Agora imagine olhar para a saída de um programa grande, e as coisas se tornarão ininteligíveis rapidamente.

Em vez de `wasm2wat`, execute `wasm-decompile dot.o`, e você obtém:

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

Isso parece muito mais familiar. Além de uma sintaxe baseada em expressões que imita linguagens de programação com as quais você pode estar familiarizado, o descompilador analisa todos os carregamentos e armazenamentos em uma função e tenta inferir sua estrutura. Ele então anota cada variável usada como ponteiro com uma declaração "inline" de struct. Ele não cria declarações de struct nomeadas, pois não sabe necessariamente quais usos de 3 floats representam o mesmo conceito.

## Descompilar para quê?

`wasm-decompile` produz uma saída que tenta parecer uma "linguagem de programação muito genérica" enquanto ainda permanece próxima ao Wasm que representa.

Seu objetivo #1 é legibilidade: ajudar o leitor a entender o que há em um `.wasm` com o código mais fácil de seguir possível. Seu objetivo #2 é ainda representar o Wasm da maneira mais 1:1 possível, para não perder sua utilidade como um desmontador. Obviamente, esses dois objetivos nem sempre são conciliáveis.

Essa saída não é destinada a ser uma linguagem de programação real e atualmente não há como compilá-la de volta para Wasm.

### Carregamentos e armazenamentos

Conforme demonstrado acima, `wasm-decompile` analisa todos os carregamentos e armazenamentos de um ponteiro específico. Se eles formarem um conjunto contínuo de acessos, ele gerará uma dessas declarações "inline" de struct.

Se nem todos os "campos" forem acessados, não é possível dizer com certeza se isso é uma struct ou algum outro tipo de acesso à memória não relacionado. Nesse caso, ele recorre a tipos mais simples como `float_ptr` (se os tipos forem os mesmos) ou, no pior caso, exibirá um acesso de array como `o[2]:int`, que significa: `o` aponta para valores `int`, e estamos acessando o terceiro.

Esse último caso acontece mais frequentemente do que você imagina, já que variáveis locais do Wasm funcionam mais como registradores do que variáveis, então o código otimizado pode compartilhar o mesmo ponteiro para objetos não relacionados.

O descompilador tenta ser inteligente sobre indexação, e detecta padrões como `(base + (index << 2))[0]:int` que resultam de operações regulares de indexação de arrays em C como `base[index]`, onde `base` aponta para um tipo de 4 bytes. Isso é muito comum, já que o Wasm tem apenas deslocamentos constantes em carregamentos e armazenamentos. A saída do `wasm-decompile` os transforma de volta em `base[index]:int`.

Além disso, ele sabe quando endereços absolutos se referem à seção de dados.

### Fluxo de controle

O mais familiar é o constructo de if-then do Wasm, que traduz para uma sintaxe familiar `if (cond) { A } else { B }`, com a adição de que no Wasm ele pode realmente retornar um valor, então também pode representar a sintaxe ternária `cond ? A : B` disponível em algumas linguagens.

O restante do fluxo de controle do Wasm é baseado nos blocos `block` e `loop`, e nos saltos `br`, `br_if` e `br_table`. O decompilador permanece razoavelmente próximo a esses constructos, em vez de tentar inferir os constructos de while/for/switch dos quais eles podem ter se originado, já que isso geralmente funciona melhor com saída otimizada. Por exemplo, um loop típico na saída do `wasm-decompile` pode parecer com:

```c
loop A {
  // corpo do loop aqui.
  if (cond) continue A;
}
```

Aqui, `A` é um rótulo que permite o aninhamento de múltiplos desses loops. Ter um `if` e um `continue` para controlar o loop pode parecer um pouco estranho em comparação com um loop while, mas corresponde diretamente ao `br_if` do Wasm.

Blocos são semelhantes, mas em vez de ramificar para trás, eles ramificam para frente:

```c
block {
  if (cond) break;
  // corpo vai aqui.
}
```

Isso implementa de fato um if-then. Versões futuras do decompilador podem traduzir isso para if-then reais, quando possível.

O constructo de controle mais surpreendente do Wasm é o `br_table`, que implementa algo semelhante a um `switch`, exceto que usa blocos `block` aninhados, que tendem a ser difíceis de ler. O decompilador achata esses para torná-los um pouco mais fáceis de acompanhar, por exemplo:

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

Isso é semelhante a `switch` em `a`, com `D` sendo o caso padrão.

### Outros recursos divertidos

O decompilador:

- Pode extrair nomes de informações de depuração ou de linkagem, ou gerar nomes por si mesmo. Ao usar nomes existentes, ele tem código especial para simplificar símbolos originados do C++ com nomes embaralhados.
- Já suporta a proposta de multi-valores, o que torna a transformação de expressões e instruções um pouco mais difícil. Variáveis adicionais são usadas quando múltiplos valores são retornados.
- Ele pode até gerar nomes a partir do _conteúdo_ das seções de dados.
- Produz declarações organizadas para todos os tipos de seção Wasm, não apenas código. Por exemplo, ele tenta tornar as seções de dados legíveis, exibindo-as como texto quando possível.
- Suporta precedência de operadores (comum para a maioria das linguagens estilo C) para reduzir os `()` em expressões comuns.

### Limitações

Decompilar Wasm é fundamentalmente mais difícil do que, digamos, bytecode de JVM.

Este último é não otimizado, então relativamente fiel à estrutura do código original, e mesmo que os nomes possam estar ausentes, refere-se a classes únicas, em vez de apenas a locais de memória.

Em contraste, a maior parte da saída `.wasm` foi fortemente otimizada pelo LLVM e, assim, frequentemente perdeu a maior parte de sua estrutura original. O código de saída é muito diferente de algo que um programador escreveria. Isso torna um decompilador para Wasm um desafio maior para fazê-lo útil, mas isso não significa que não devemos tentar!

## Mais

A melhor maneira de ver mais é, obviamente, descompilar seu próprio projeto Wasm!

Além disso, um guia mais detalhado sobre `wasm-decompile` está [aqui](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md). Sua implementação está nos arquivos-fonte começando com `decompiler` [aqui](https://github.com/WebAssembly/wabt/tree/master/src) (sinta-se à vontade para contribuir com um PR para torná-lo melhor!). Alguns casos de teste que mostram mais exemplos de diferenças entre `.wat` e o decompilador estão [aqui](https://github.com/WebAssembly/wabt/tree/master/test/decompile).

