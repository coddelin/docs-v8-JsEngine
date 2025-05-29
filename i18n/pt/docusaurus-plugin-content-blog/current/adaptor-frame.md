---
title: 'Chamadas JavaScript mais rápidas'
author: '[Victor Gomes](https://twitter.com/VictorBFG), o destruidor de quadros'
avatars:
  - 'victor-gomes'
date: 2021-02-15
tags:
  - internals
description: 'Chamadas JavaScript mais rápidas removendo o adaptador de argumentos'
tweet: '1361337569057865735'
---

JavaScript permite chamar uma função com um número diferente de argumentos do que o número esperado de parâmetros, ou seja, pode-se passar menos ou mais argumentos do que os parâmetros formais declarados. O primeiro caso é chamado de subaplicação e o segundo de sobreaplicação.

<!--truncate-->
No caso de subaplicação, os parâmetros restantes são atribuídos ao valor undefined. No caso de sobreaplicação, os argumentos restantes podem ser acessados usando o parâmetro rest e a propriedade `arguments`, ou eles são simplesmente supérfluos e podem ser ignorados. Muitos frameworks da Web/Node.js atualmente usam esse recurso do JS para aceitar parâmetros opcionais e criar uma API mais flexível.

Até recentemente, o V8 tinha uma maquinaria especial para lidar com a incompatibilidade de tamanho dos argumentos: o adaptador de argumentos. Infelizmente, a adaptação de argumentos tem um custo de desempenho, mas é comumente necessária em frameworks modernos de front-end e middleware. Acontece que, com um truque engenhoso, podemos remover esse quadro extra, simplificar a base de código V8 e eliminar quase toda a sobrecarga.

Podemos calcular o impacto no desempenho de remover o adaptador de argumentos por meio de um microbenchmark.

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![Impacto no desempenho ao remover o adaptador de argumentos, medido através de um microbenchmark.](/_img/v8-release-89/perf.svg)

O gráfico mostra que não há mais sobrecarga ao executar no [modo sem JIT](https://v8.dev/blog/jitless) (Ignition) com uma melhoria de desempenho de 11,2%. Ao usar o [TurboFan](https://v8.dev/docs/turbofan), conseguimos um aumento de velocidade de até 40%.

Esse microbenchmark foi naturalmente projetado para maximizar o impacto do adaptador de argumentos. No entanto, observamos uma melhora considerável em muitos benchmarks, como no [nosso benchmark interno de JSTests/Array](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json) (7%) e no [Octane2](https://github.com/chromium/octane) (4,6% em Richards e 6,1% em EarleyBoyer).

## TL;DR: Reverter os argumentos

O objetivo principal deste projeto foi remover o adaptador de argumentos, que oferece uma interface consistente ao destinatário ao acessar seus argumentos na pilha. Para fazer isso, precisávamos reverter os argumentos na pilha e adicionar um novo slot no quadro do destinatário contendo a contagem real dos argumentos. A figura abaixo mostra o exemplo de um quadro típico antes e depois da mudança.

![Um quadro típico de pilha JavaScript antes e depois de remover o adaptador de argumentos.](/_img/adaptor-frame/frame-diff.svg)

## Tornando as chamadas JavaScript mais rápidas

Para apreciar o que fizemos para tornar as chamadas mais rápidas, vejamos como o V8 executa uma chamada e como o adaptador de argumentos funciona.

O que acontece dentro do V8 quando invocamos uma chamada de função em JS? Suponhamos o seguinte script JS:

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![Fluxo de execução dentro do V8 durante uma chamada de função.](/_img/adaptor-frame/flow.svg)

## Ignition

O V8 é uma VM de múltiplos estágios. Seu primeiro estágio é chamado de [Ignition](https://v8.dev/docs/ignition), é uma máquina de pilha de bytecode com um registrador acumulador. O V8 começa compilando o código para [bytecodes Ignition](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775). A chamada acima é compilada para o seguinte:

```
0d              LdaUndefined              ;; Carrega undefined no acumulador
26 f9           Star r2                   ;; Armazena no registrador r2
13 01 00        LdaGlobal [1]             ;; Carrega global apontado pela constante 1 (add42)
26 fa           Star r1                   ;; Armazena no registrador r1
0c 03           LdaSmi [3]                ;; Carrega o pequeno inteiro 3 no acumulador
26 f8           Star r3                   ;; Armazena no registrador r3
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; Invoca a chamada
```

O primeiro argumento de uma chamada é geralmente referido como o receptor. O receptor é o objeto `this` dentro de um JSFunction, e todas as chamadas de função JS devem ter um. O manipulador de bytecode de `CallNoFeedback` precisa chamar o objeto `r1` com os argumentos na lista de registradores `r2-r3`.

Antes de mergulharmos no manipulador de bytecode, observe como os registradores são codificados no bytecode. Eles são inteiros negativos de um único byte: `r1` é codificado como `fa`, `r2` como `f9` e `r3` como `f8`. Podemos nos referir a qualquer registrador ri como `fb - i`, na verdade, como veremos, a codificação correta é `- 2 - kFixedFrameHeaderSize - i`. Listas de registradores são codificadas usando o primeiro registrador e o tamanho da lista, então `r2-r3` é `f9 02`.

Há muitos manipuladores de chamada de bytecode no Ignition. Você pode ver uma lista deles [aqui](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184). Eles variam ligeiramente entre si. Há bytecodes otimizados para chamadas com um receptor `undefined`, para chamadas de propriedade, para chamadas com um número fixo de parâmetros ou para chamadas genéricas. Aqui analisamos `CallNoFeedback`, que é uma chamada genérica na qual não acumulamos feedback da execução.

O manipulador deste bytecode é bastante simples. Ele é escrito em [`CodeStubAssembler`](https://v8.dev/docs/csa-builtins), você pode verificá-lo [aqui](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467). Basicamente, ele faz uma chamada em sequência para um built-in dependente da arquitetura [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277).

O built-in essencialmente remove o endereço de retorno para um registrador temporário, empilha todos os argumentos (incluindo o receptor) e empilha de volta o endereço de retorno. Neste ponto, não sabemos se o destino da chamada é um objeto invocável nem quantos argumentos o destino espera, ou seja, sua contagem de parâmetros formais.

![Estado do frame após a execução do built-in `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/normal-push.svg)

Eventualmente, a execução faz uma chamada em sequência para o built-in [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256). Lá, ele verifica se o destino é uma função propriamente dita, um construtor ou qualquer objeto invocável. Ele também lê a estrutura `shared function info` para obter sua contagem de parâmetros formais.

Se o destino da chamada for um objeto de função, ele faz uma chamada em sequência para o built-in [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038), onde várias verificações acontecem, incluindo se temos um objeto `undefined` como receptor. Se tivermos um objeto `undefined` ou `null` como receptor, devemos ajustá-lo para referenciar o objeto proxy global, de acordo com a [especificação ECMA](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis).

A execução então faz uma chamada em sequência para o built-in [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781), que, na ausência de incompatibilidade de argumentos, chamará qualquer coisa que estiver apontada pelo campo `Code` no objeto chamado. Isso pode ser uma função otimizada ou o built-in [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037).

Se presumirmos que estamos chamando uma função que ainda não foi otimizada, o trampolim Ignition configurará um `IntepreterFrame`. Você pode ver um resumo dos tipos de frame no V8 [aqui](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14).

Sem entrar em muitos detalhes sobre o que acontece a seguir, podemos ver um instantâneo do frame do interpretador durante a execução do destino chamado.

![O `InterpreterFrame` para a chamada `add42(3)`.](/_img/adaptor-frame/normal-frame.svg)

Vemos que temos um número fixo de slots no frame: o endereço de retorno, o ponteiro de frame anterior, o contexto, o objeto de função atual que estamos executando, o array de bytecode dessa função e o deslocamento do bytecode atual que estamos executando. Finalmente, temos uma lista de registradores dedicados a essa função (você pode pensar neles como variáveis locais da função). A função `add42` na verdade não tem registradores, mas o chamador tem um frame semelhante com 3 registradores.

Como esperado, `add42` é uma função simples:

```
25 02             Ldar a0          ;; Carrega o primeiro argumento para o acumulador
40 2a 00          AddSmi [42]      ;; Adiciona 42 a ele
ab                Return           ;; Retorna o acumulador
```

Observe como codificamos o argumento no bytecode `Ldar` _(Load Accumulator Register)_: argumento `1` (`a0`) é codificado com o número `02`. Na verdade, a codificação de qualquer argumento é simplesmente `[ai] = 2 + parameter_count - i - 1` e o receptor `[this] = 2 + parameter_count`, ou neste exemplo `[this] = 3`. Aqui a contagem de parâmetros não inclui o receptor.

Agora podemos entender por que codificamos registradores e argumentos dessa maneira. Eles simplesmente denotam um deslocamento a partir do ponteiro de quadro. Podemos então tratar o carregamento e armazenamento de argumentos/registradores da mesma forma. O deslocamento do último argumento a partir do ponteiro de quadro é `2` (ponteiro de quadro anterior e o endereço de retorno). Isso explica o `2` na codificação. A parte fixa do quadro do interpretador é `6` slots (`4` a partir do ponteiro de quadro), então o registrador zero está localizado no deslocamento `-5`, ou seja, `fb`, registrador `1` em `fa`. Inteligente, não é?

Note, no entanto, que para ter acesso aos argumentos, a função deve saber quantos argumentos estão na pilha! O índice `2` aponta para o último argumento, independentemente de quantos argumentos existem!

O manipulador de bytecode de `Return` terminará chamando o built-in `LeaveInterpreterFrame`. Este built-in essencialmente lê o objeto da função para obter a contagem de parâmetros do quadro, remove o quadro atual, recupera o ponteiro de quadro, salva o endereço de retorno em um registrador temporário, remove os argumentos de acordo com a contagem de parâmetros e salta para o endereço nos registradores temporários.

Todo esse fluxo é ótimo! Mas o que acontece quando chamamos uma função com menos ou mais argumentos do que sua contagem de parâmetros? O inteligente acesso a argumentos/registradores falhará, e como limpamos os argumentos no final da chamada?

## Quadro adaptador de argumentos

Vamos agora chamar `add42` com menos e mais argumentos:

```js
add42();
add42(1, 2, 3);
```

Os desenvolvedores de JS entre nós saberão que, no primeiro caso, `x` será atribuído como `undefined` e a função retornará `undefined + 42 = NaN`. No segundo caso, `x` será atribuído como `1` e a função retornará `43`, os argumentos restantes serão ignorados. Observe que o chamador não sabe se isso acontecerá. Mesmo que o chamador verifique a contagem de parâmetros, o chamado pode usar o parâmetro rest ou o objeto arguments para acessar todos os outros argumentos. Na verdade, o objeto arguments pode até ser acessado fora de `add42` no modo desleixado.

Se seguirmos os mesmos passos de antes, primeiro chamaremos o built-in `InterpreterPushArgsThenCall`. Ele empurrará os argumentos para a pilha assim:

![Estado dos quadros após a execução do built-in `InterpreterPushArgsThenCall`](/_img/adaptor-frame/adaptor-push.svg)

Continuando o mesmo procedimento de antes, verificamos se o chamado é um objeto de função, obtemos sua contagem de parâmetros e corrigimos o receptor para o proxy global. Eventualmente, chegamos a `InvokeFunctionCode`.

Aqui, em vez de saltar para o `Code` no objeto chamado, verificamos se há uma incompatibilidade entre o tamanho do argumento e a contagem de parâmetros e saltamos para `ArgumentsAdaptorTrampoline`.

Neste built-in, construímos um quadro extra, o infame quadro adaptador de argumentos. Em vez de explicar o que acontece dentro do built-in, apresentarei apenas o estado do quadro antes do built-in chamar o `Code` do chamado. Observe que este é um `x64 call` apropriado (não um `jmp`) e, após a execução do chamado, retornaremos ao `ArgumentsAdaptorTrampoline`. Isso é um contraste com `InvokeFunctionCode`, que faz tailcall.

![Quadros de pilha com adaptação de argumentos.](/_img/adaptor-frame/adaptor-frames.svg)

Você pode ver que criamos outro quadro que copia todos os argumentos necessários para ter precisamente a contagem de parâmetros de argumentos no topo do quadro do chamado. Isso cria uma interface para a função chamada, de modo que esta não precise saber o número de argumentos. A função chamada sempre poderá acessar seus parâmetros com o mesmo cálculo de antes, ou seja, `[ai] = 2 + parameter_count - i - 1`.

O V8 possui built-ins especiais que entendem o quadro adaptador sempre que precisam acessar os argumentos restantes por meio do parâmetro rest ou do objeto arguments. Eles sempre precisarão verificar o tipo de quadro adaptador no topo do quadro do chamado e, então, agir de acordo.

Como você pode ver, resolvemos o problema de acesso a argumentos/registradores, mas criamos muita complexidade. Todo built-in que precisa acessar todos os argumentos precisará entender e verificar a existência do quadro adaptador. Não só isso, precisamos ter cuidado para não acessar dados obsoletos e antigos. Considere as seguintes alterações em `add42`:

```js
function add42(x) {
  x += 42;
  return x;
}
```

O array de bytecode agora é:

```
25 02             Ldar a0       ;; Carregar o primeiro argumento para o acumulador
40 2a 00          AddSmi [42]   ;; Adicionar 42 a ele
26 02             Star a0       ;; Armazenar o acumulador no slot do primeiro argumento
ab                Return        ;; Retornar o acumulador
```

Como você pode ver, agora modificamos `a0`. Portanto, no caso de uma chamada `add42(1, 2, 3)`, o slot no quadro adaptador de argumentos será modificado, mas o quadro do chamador ainda conterá o número `1`. Precisamos ter cuidado para que o objeto arguments acesse o valor modificado em vez do antigo.

Retornar da função é simples, embora lento. Lembra o que `LeaveInterpreterFrame` faz? Basicamente remove o quadro do chamado e os argumentos até o número da contagem de parâmetros. Então, quando retornamos ao stub do quadro adaptador de argumentos, a pilha fica assim:

![Estado dos quadros após a execução do chamado `add42`](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

Só precisamos eliminar o número de argumentos, remover o quadro adaptador, eliminar todos os argumentos de acordo com a contagem real de argumentos e retornar à execução do chamador.

Resumindo: a máquina adaptadora de argumentos não é apenas complexa, mas custosa.

## Removendo o quadro adaptador de argumentos

Podemos fazer melhor? Podemos remover o quadro adaptador? Acontece que sim, podemos.

Vamos revisar nossos requisitos:

1. Precisamos ser capazes de acessar os argumentos e registradores perfeitamente como antes. Nenhuma verificação pode ser feita ao acessá-los. Isso seria muito caro.
2. Precisamos ser capazes de construir o parâmetro rest e o objeto arguments a partir da pilha.
3. Precisamos ser capazes de limpar facilmente um número desconhecido de argumentos ao retornar de uma chamada.
4. E, claro, queremos fazer isso sem um quadro extra!

Se queremos eliminar o quadro extra, então precisamos decidir onde colocar os argumentos: ou no quadro do chamado ou no quadro do chamador.

### Argumentos no quadro do chamado

Suponha que colocamos os argumentos no quadro do chamado. Isso parece ser uma boa ideia na verdade, já que sempre que removemos o quadro, também removemos todos os argumentos de uma vez!

Os argumentos precisariam estar localizados em algum lugar entre o ponteiro salvo do quadro e o final do quadro. Isso implica que o tamanho do quadro não será conhecido estaticamente. Acessar um argumento ainda será fácil, pois é um deslocamento simples a partir do ponteiro do quadro. Mas acessar um registrador agora é muito mais complicado, já que varia de acordo com o número de argumentos.

O ponteiro da pilha sempre aponta para o último registrador, então poderíamos usá-lo para acessar os registradores sem saber a contagem de argumentos. Essa abordagem pode realmente funcionar, mas tem uma grande desvantagem. Isso implicaria duplicar todos os bytecodes que podem acessar registradores e argumentos. Precisaríamos de um `LdaArgument` e um `LdaRegister` em vez de simplesmente `Ldar`. Claro, também poderíamos verificar se estamos acessando um argumento ou um registrador (deslocamentos positivos ou negativos), mas isso exigiria uma verificação em cada acesso a argumento e registrador. Claramente muito caro!

### Argumentos no quadro do chamador

Ok... e se ficarmos com os argumentos no quadro do chamador?

Lembre-se de como calcular o deslocamento do argumento `i` em um quadro: `[ai] = 2 + parameter_count - i - 1`. Se tivermos todos os argumentos (não apenas os parâmetros), o deslocamento será `[ai] = 2 + argument_count - i - 1`. Ou seja, para cada acesso a argumento, precisaríamos carregar a contagem real de argumentos.

Mas o que acontece se invertermos os argumentos? Agora o deslocamento pode ser calculado simplesmente como `[ai] = 2 + i`. Não precisamos saber quantos argumentos estão na pilha, mas se pudermos garantir que sempre teremos pelo menos a contagem de parâmetros na pilha, então sempre podemos usar este esquema para calcular o deslocamento.

Em outras palavras, o número de argumentos empurrados na pilha será sempre o máximo entre o número de argumentos e a contagem de parâmetros formais, e será preenchido com objetos undefined, se necessário.

Isso tem mais uma vantagem! O receptor sempre estará localizado no mesmo deslocamento para qualquer função JS, logo acima do endereço de retorno: `[this] = 2`.

Esta é uma solução limpa para nosso requisito número `1` e número `4`. E quanto aos outros dois requisitos? Como podemos construir o parâmetro rest e o objeto arguments? E como limpar os argumentos na pilha ao retornar para o chamador? Para isso, só estamos faltando a contagem de argumentos. Precisaremos salvá-la em algum lugar. A escolha aqui é um pouco arbitrária, desde que seja fácil acessar essa informação. Duas escolhas básicas são: empurrá-la logo após o receptor no quadro do chamador ou como parte do quadro do chamado na parte fixa do cabeçalho. Implementamos a última opção, já que ela une a parte fixa do cabeçalho dos quadros do Interpretador e Otimizados.

Se executarmos nosso exemplo no V8 v8.9, veremos a seguinte pilha após `InterpreterArgsThenPush` (note que os argumentos agora estão invertidos):

![Estado dos quadros após a execução do built-in `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/no-adaptor-push.svg)

Toda a execução segue um caminho semelhante até chegarmos ao InvokeFunctionCode. Aqui ajustamos os argumentos em caso de subaplicação, empurrando tantos objetos undefined quanto forem necessários. Note que não mudamos nada em caso de superaplicação. Por fim, passamos o número de argumentos para o `Code` do chamado através de um registrador. No caso de `x64`, usamos o registrador `rax`.

Se o chamado ainda não foi otimizado, chegamos ao `InterpreterEntryTrampoline`, que constrói o seguinte quadro de pilha.

![Quadros de pilha sem adaptadores de argumentos.](/_img/adaptor-frame/no-adaptor-frames.svg)

O quadro do chamado tem um slot extra contendo o número de argumentos que pode ser usado para construir o parâmetro rest ou o objeto arguments e para limpar os argumentos na pilha antes de retornar para o chamador.

Para retornar, modificamos `LeaveInterpreterFrame` para ler a contagem de argumentos na pilha e remover o número máximo entre a contagem de argumentos e a contagem de parâmetros formais.

## TurboFan

E quanto ao código otimizado? Vamos modificar ligeiramente o nosso script inicial para forçar o V8 a compilá-lo com TurboFan:

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

Aqui usamos intrínsecos do V8 para forçar o V8 a otimizar a chamada, caso contrário, o V8 só otimizaria nossa pequena função se ela se tornasse popular (usada com muita frequência). Chamamos a função uma vez antes da otimização para coletar algumas informações de tipo que podem ser usadas para orientar a compilação. Leia mais sobre TurboFan [aqui](https://v8.dev/docs/turbofan).

Mostrarei aqui apenas a parte do código gerado que é relevante para nós.

```nasm
movq rdi,0x1a8e082126ad    ;; Carregar o objeto de função <JSFunction add42>
push 0x6                   ;; Colocar SMI 3 como argumento
movq rcx,0x1a8e082030d1    ;; <Objeto Global>
push rcx                   ;; Colocar o receptor (o objeto proxy global)
movl rax,0x1               ;; Salvar a contagem de argumentos em rax
movl rcx,[rdi+0x17]        ;; Carregar o campo {Code} do objeto de função em rcx
call rcx                   ;; Finalmente, chamar o objeto de código!
```

Embora escrito em assembler, este trecho de código não deve ser difícil de ler se você seguir meus comentários. Essencialmente, ao compilar a chamada, TF precisa fazer todo o trabalho que foi feito em `InterpreterPushArgsThenCall`, `Call`, `CallFunction` e os built-ins `InvokeFunctionCall`. Felizmente, ele tem mais informações estáticas para fazer isso e emitir menos instruções computacionais.

### TurboFan com o quadro adaptador de argumentos

Agora, vamos ver o caso de uma discrepância entre o número de argumentos e a contagem de parâmetros formais. Considere a chamada `add42(1, 2, 3)`. Isso é compilado como:

```nasm
movq rdi,0x4250820fff1    ;; Carregar o objeto de função <JSFunction add42>
;; Colocar receptor e argumentos SMIs 1, 2 e 3
movq rcx,0x42508080dd5    ;; <Objeto Global>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; Salvar a contagem de argumentos em rax
movl rbx,0x1              ;; Salvar a contagem de parâmetros formais em rbx
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; Chamar o ArgumentsAdaptorTrampoline
```

Como você pode ver, não é difícil adicionar suporte ao TF para discrepâncias entre a contagem de argumentos e parâmetros. Basta chamar o trampoline adaptador de argumentos!

Isso, no entanto, é caro. Para cada chamada otimizada, agora precisamos entrar no trampoline adaptador de argumentos e ajustar o quadro como no código não otimizado. Isso explica por que o ganho de desempenho ao remover o quadro adaptador no código otimizado é muito maior do que no Ignition.

O código gerado, no entanto, é muito simples. E retornar dele é extremamente fácil (epílogo):

```nasm
movq rsp,rbp   ;; Limpar o quadro do chamado
pop rbp
ret 0x8        ;; Remove um único argumento (o receptor)
```

Removemos nosso quadro e emitimos uma instrução de retorno de acordo com a contagem de parâmetros. Se houver uma discrepância entre o número de argumentos e a contagem de parâmetros, o trampoline do quadro adaptador lidará com isso.

### TurboFan sem o quadro adaptador de argumentos

O código gerado é essencialmente o mesmo que em uma chamada com o número correspondente de argumentos. Considere a chamada `add42(1, 2, 3)`. Isso gera:

```nasm
movq rdi,0x35ac082126ad    ;; Carregar o objeto de função <JSFunction add42>
;; Colocar receptor e argumentos 1, 2 e 3 (invertidos)
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <Objeto Global>
push rcx
movl rax,0x3               ;; Salvar a contagem de argumentos em rax
movl rcx,[rdi+0x17]        ;; Carregar o campo {Code} do objeto de função em rcx
call rcx                   ;; Finalmente, chamar o objeto de código!
```

E quanto ao epílogo da função? Não estamos mais voltando ao trampoline de quadro adaptador de argumentos, então o epílogo é de fato um pouco mais complexo do que antes.

```nasm
movq rcx,[rbp-0x18]        ;; Carregar a contagem de argumentos (do quadro do chamado) para rcx
movq rsp,rbp               ;; Remover o quadro do chamado
pop rbp
cmpq rcx,0x0               ;; Comparar contagem de argumentos com contagem de parâmetros formais
jg 0x35ac000840c6  <+0x86>
;; Se a contagem de argumentos for menor (ou igual) à contagem de parâmetros formais:
ret 0x8                    ;; Retornar como de costume (a contagem de parâmetros é conhecida estática)
;; Se houver mais argumentos na pilha do que parâmetros formais:
pop r10                    ;; Salvar o endereço de retorno
leaq rsp,[rsp+rcx*8+0x8]   ;; Remover todos os argumentos de acordo com rcx
push r10                   ;; Recuperar o endereço de retorno
retl
```

# Conclusão
