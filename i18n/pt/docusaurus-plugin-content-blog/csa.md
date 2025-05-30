---
title: "Domando a complexidade da arquitetura no V8 — o CodeStubAssembler"
author: "[Daniel Clifford](https://twitter.com/expatdanno), montador do CodeStubAssembler"
date: "2017-11-16 13:33:37"
tags: 
  - internals
description: "O V8 possui sua própria abstração sobre o código assembly: o CodeStubAssembler. O CSA permite ao V8 otimizar rapidamente e confiavelmente os recursos do JS em um nível baixo, tudo enquanto oferece suporte a várias plataformas."
tweet: "931184976481177600"
---
Neste post, gostaríamos de apresentar o CodeStubAssembler (CSA), um componente do V8 que tem sido uma ferramenta muito útil para alcançar alguns [grandes ganhos](/blog/optimizing-proxies) de [desempenho](https://twitter.com/v8js/status/918119002437750784) nas últimas várias versões do V8. O CSA também melhorou significativamente a capacidade da equipe do V8 de otimizar rapidamente os recursos do JavaScript em um nível baixo com um alto grau de confiabilidade, o que aumentou a velocidade de desenvolvimento da equipe.

<!--truncate-->
## Uma breve história dos builtins e do assembly escrito à mão no V8

Para entender o papel do CSA no V8, é importante compreender um pouco do contexto e da história que levaram ao seu desenvolvimento.

O V8 obtém desempenho do JavaScript usando uma combinação de técnicas. Para um código JavaScript que executa por muito tempo, o compilador otimizado [TurboFan](/docs/turbofan) do V8 faz um excelente trabalho acelerando toda a gama de funcionalidades do ES2015+ para obter desempenho máximo. No entanto, o V8 também precisa executar JavaScript de curta duração de forma eficiente para um bom desempenho básico. Isso é especialmente verdadeiro para as chamadas **funções incorporadas** nos objetos pré-definidos que estão disponíveis em todos os programas JavaScript, conforme definido pela [especificação ECMAScript](https://tc39.es/ecma262/).

Historicamente, muitas dessas funções incorporadas eram [auto-hospedadas](https://en.wikipedia.org/wiki/Self-hosting), ou seja, eram criadas por um desenvolvedor do V8 em JavaScript—embora em um dialeto interno especial do V8. Para alcançar um bom desempenho, essas funções incorporadas auto-hospedadas dependem dos mesmos mecanismos que o V8 usa para otimizar o JavaScript fornecido pelo usuário. Assim como o código fornecido pelo usuário, as funções incorporadas auto-hospedadas necessitam de uma fase de aquecimento em que o feedback de tipo é coletado e precisam ser compiladas pelo compilador otimizado.

Embora essa técnica forneça um bom desempenho incorporado em algumas situações, é possível fazer melhor. A exata semântica das funções pré-definidas em `Array.prototype` é [especificada em detalhes minuciosos](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) na especificação. Para casos especiais importantes e comuns, os implementadores do V8 sabem antecipadamente exatamente como essas funções incorporadas devem funcionar ao entender a especificação e utilizam esse conhecimento para criar versões personalizadas e ajustadas manualmente logo no início. Essas _funções incorporadas otimizadas_ lidam com casos comuns sem necessidade de aquecimento ou de invocar o compilador otimizado, já que, por construção, o desempenho básico já é ideal na primeira invocação.

Para extrair o melhor desempenho de funções JavaScript incorporadas escritas à mão (e de outros códigos de caminho rápido do V8, que também são um tanto confusamente chamados de builtins), os desenvolvedores do V8 tradicionalmente escreviam funções incorporadas otimizadas em linguagem assembly. Usando assembly, as funções incorporadas escritas à mão eram especialmente rápidas ao, entre outras coisas, evitar chamadas caras ao código C++ do V8 através de trampolins e ao aproveitar a [ABI](https://en.wikipedia.org/wiki/Application_binary_interface) baseado em registradores personalizado do V8 que ele usa internamente para chamar funções JavaScript.

Por causa das vantagens do assembly escrito à mão, o V8 acumulou literalmente dezenas de milhares de linhas de código assembly escrito à mão para funções incorporadas ao longo dos anos… _por plataforma_. Todas essas funções incorporadas em assembly escrito à mão eram excelentes para melhorar o desempenho, mas novos recursos de linguagem estão sempre sendo padronizados, e manter e estender esse assembly escrito à mão era trabalhoso e sujeito a erros.

## Surge o CodeStubAssembler

Os desenvolvedores do V8 lutaram por muitos anos com um dilema: é possível criar funções incorporadas que têm as vantagens do assembly escrito à mão sem também serem frágeis e difíceis de manter?

Com o advento do TurboFan, a resposta para esta pergunta finalmente é “sim”. O backend do TurboFan utiliza uma [representação intermediária](https://en.wikipedia.org/wiki/Intermediate_representation) (IR) multiplataforma para operações de máquina de baixo nível. Essa IR de máquina de baixo nível é enviada para um seletor de instruções, um alocador de registros, um agendador de instruções e um gerador de código que produzem um código muito bom em todas as plataformas. O backend também conhece muitos dos truques usados nas funções internas do V8 escritas em assembly manualmente — como usar e chamar uma ABI personalizada baseada em registrador, como suportar chamadas de cauda em nível de máquina e como evitar a construção de quadros de pilha em funções folha. Esse conhecimento torna o backend do TurboFan especialmente adequado para gerar código rápido que se integra bem com o restante do V8.

Essa combinação de funcionalidades tornou viável pela primeira vez uma alternativa robusta e sustentável às funções internas escritas em assembly manualmente. A equipe criou um novo componente do V8 — chamado de CodeStubAssembler ou CSA — que define uma linguagem de montagem portátil construída sobre o backend do TurboFan. O CSA adiciona uma API para gerar IR de máquina do TurboFan diretamente sem precisar escrever e interpretar o JavaScript ou aplicar as otimizações específicas de JavaScript do TurboFan. Embora esse caminho rápido para geração de código seja algo que apenas os desenvolvedores do V8 possam usar para acelerar internamente o motor V8, esse caminho eficiente para gerar código otimizado em assembly de maneira multiplataforma beneficia diretamente o código JavaScript de todos os desenvolvedores nas funções internas construídas com o CSA, incluindo os manipuladores de bytecode críticos para desempenho do interpretador do V8, [Ignition](/docs/ignition).

![Os pipelines de compilação do CSA e do JavaScript](/_img/csa/csa.svg)

A interface CSA inclui operações muito de baixo nível e familiares para qualquer pessoa que já tenha escrito código em assembly. Por exemplo, ela inclui funcionalidades como “carregue esse ponteiro de objeto de um endereço fornecido” e “multiplique esses dois números de 32 bits”. O CSA tem verificação de tipos no nível da IR para capturar muitos bugs de correção na compilação, em vez de no tempo de execução. Por exemplo, ele pode garantir que um desenvolvedor do V8 não use acidentalmente um ponteiro de objeto carregado da memória como entrada para uma multiplicação de 32 bits. Esse tipo de verificação de tipos simplesmente não é possível com stubs de assembly escritos manualmente.

## Um test-drive do CSA

Para ter uma ideia melhor do que o CSA oferece, vamos passar por um exemplo rápido. Adicionaremos uma nova função interna ao V8 que retorna o comprimento de uma string de um objeto, se ele for uma String. Se o objeto de entrada não for uma String, a função interna retornará `undefined`.

Primeiro, adicionamos uma linha ao macro `BUILTIN_LIST_BASE` no arquivo [`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h) do V8 que declara a nova função interna chamada `GetStringLength` e especifica que ela tem um único parâmetro de entrada identificado pela constante `kInputObject`:

```cpp
TFS(GetStringLength, kInputObject)
```

O macro `TFS` declara a função interna como uma função **T**urbo**F**an usando a ligação padrão do Code**S**tub, o que significa simplesmente que ela usa o CSA para gerar seu código e espera que os parâmetros sejam passados via registradores.

Podemos então definir o conteúdo da função interna em [`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc):

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // Busca o objeto de entrada usando a constante que definimos para
  // o primeiro parâmetro.
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // Verifica se a entrada é um Smi (uma representação especial
  // de pequenos números). Isso precisa ser feito antes da verificação IsString
  // abaixo, já que IsString pressupõe que seu argumento é um
  // ponteiro de objeto e não um Smi. Se o argumento for realmente um
  // Smi, vá para o rótulo |not_string|.
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // Verifica se o objeto de entrada é uma string. Caso contrário, vá para
  // o rótulo |not_string|.
  GotoIfNot(IsString(maybe_string), &not_string);

  // Carrega o comprimento da string (tendo acabado neste caminho de código
  // porque verificamos que era string acima) e o retorna
  // usando um "macro" do CSA chamado LoadStringLength.
  Return(LoadStringLength(maybe_string));

  // Define a localização do rótulo que é o destino da verificação
  // IsString falhou acima.
  BIND(&not_string);

  // O objeto de entrada não é uma string. Retorna a constante undefined
  // do JavaScript.
  Return(UndefinedConstant());
}
```

Note que, no exemplo acima, existem dois tipos de instruções usadas. Há instruções _primitivas_ do CSA que traduzem diretamente em uma ou duas instruções de assembly como `GotoIf` e `Return`. Existe um conjunto fixo de instruções primitivas do CSA predefinidas que correspondem aproximadamente às instruções de assembly mais comumente usadas encontradas em uma das arquiteturas de chip suportadas pelo V8. Outras instruções no exemplo são instruções _macro_, como `LoadStringLength`, `TaggedIsSmi` e `IsString`, que são funções convenientes para gerar uma ou mais instruções primitivas ou macro inline. As instruções macro são usadas para encapsular na prática os idiomas de implementação do V8, facilitando a reutilização. Elas podem ser arbitrariamente longas e novas instruções macro podem ser facilmente definidas pelos desenvolvedores do V8 sempre que necessário.

Após compilar o V8 com as alterações acima, podemos executar `mksnapshot`, a ferramenta que compila funções internas para prepará-las para o snapshot do V8, com a opção de linha de comando `--print-code`. Esta opção imprime o código de montagem gerado para cada função interna. Se usarmos `grep` para encontrar `GetStringLength` na saída, obtemos o seguinte resultado em x64 (o código de saída foi limpo um pouco para torná-lo mais legível):

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

Em plataformas ARM de 32 bits, o seguinte código é gerado por `mksnapshot`:

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

Mesmo que nossa nova função interna use uma convenção de chamada não padrão (pelo menos não C++), é possível escrever casos de teste para ela. O seguinte código pode ser adicionado a [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) para testar a função interna em todas as plataformas:

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // Teste o caso em que a entrada é uma string
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // Teste o caso em que a entrada não é uma string (por exemplo, indefinida)
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

Para mais detalhes sobre o uso do CSA para diferentes tipos de funções internas e para exemplos adicionais, veja [esta página wiki](/docs/csa-builtins).

## Um multiplicador de velocidade para desenvolvedores do V8

O CSA é mais do que apenas uma linguagem de montagem universal que visa múltiplas plataformas. Ele permite um ciclo de desenvolvimento muito mais rápido na implementação de novos recursos em comparação ao código escrito manualmente para cada arquitetura, como era feito antes. Ele faz isso fornecendo todos os benefícios do código de montagem escrito manualmente enquanto protege os desenvolvedores contra seus erros mais traiçoeiros:

- Com o CSA, os desenvolvedores podem escrever código de funções internas com um conjunto multiplataforma de primitivas de baixo nível que se traduzem diretamente em instruções de montagem. O seletor de instrução do CSA garante que este código seja otimizado em todas as plataformas que o V8 destina, sem exigir que os desenvolvedores do V8 sejam especialistas em cada uma das linguagens de montagem dessas plataformas.
- A interface do CSA tem tipos opcionais para garantir que os valores manipulados pela montagem gerada de baixo nível sejam do tipo que o autor do código espera.
- A alocação de registradores entre as instruções de montagem é feita pelo CSA automaticamente, em vez de explicitamente à mão, incluindo a construção de quadros de pilha e a troca de valores para a pilha, caso uma função interna use mais registradores do que os disponíveis ou faça chamadas. Isso elimina uma classe inteira de bugs sutis e difíceis de encontrar que afetavam funções internas de montagem escrita manualmente. Ao tornar o código gerado menos frágil, o CSA reduz drasticamente o tempo necessário para escrever funções internas de baixo nível corretas.
- O CSA compreende convenções de chamada de ABI—tanto padrão C++ quanto internas baseadas em registradores do V8—tornando possível a interoperabilidade fácil entre código gerado pelo CSA e outras partes do V8.
- Como o código do CSA é C++, é fácil encapsular padrões comuns de geração de código em macros que podem ser reutilizadas em várias funções internas.
- Como o V8 usa o CSA para gerar os manipuladores de bytecode para o Ignition, é muito fácil incorporar diretamente a funcionalidade das funções internas baseadas no CSA nos manipuladores para melhorar o desempenho do interpretador.
- O framework de testes do V8 suporta testar a funcionalidade do CSA e funções internas geradas pelo CSA a partir de C++ sem a necessidade de escrever adaptadores de montagem.

Tudo considerado, o CSA tem sido um divisor de águas para o desenvolvimento do V8. Ele melhorou significativamente a capacidade da equipe de otimizar o V8. Isso significa que somos capazes de otimizar mais rapidamente a linguagem JavaScript para os incorporadores do V8.
