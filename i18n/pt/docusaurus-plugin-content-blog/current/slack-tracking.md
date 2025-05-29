---
title: 'Rastreamento de slack no V8'
author: 'Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), renomado mestre do *slack*'
description: 'Um olhar detalhado sobre o mecanismo de rastreamento de slack no V8.'
avatars:
 - 'michael-stanton'
date: 2020-09-24 14:00:00
tags:
 - internals
---
O rastreamento de slack é uma forma de dar aos novos objetos um tamanho inicial que é **maior do que eles podem realmente usar**, para que possam ter novas propriedades adicionadas rapidamente. E então, após algum período de tempo, **magicamente devolver esse espaço não utilizado ao sistema**. Legal, né?

<!--truncate-->
É especialmente útil porque JavaScript não tem classes estáticas. O sistema nunca pode ver "à primeira vista" quantas propriedades você possui. O mecanismo experimenta uma por uma. Então, quando você lê:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

Você pode pensar que o mecanismo tem tudo o que precisa para funcionar bem — afinal, você informou que o objeto tem duas propriedades. No entanto, V8 realmente não faz ideia do que virá a seguir. Este objeto `m1` pode ser passado para outra função que adiciona mais 10 propriedades a ele. O rastreamento de slack surge dessa necessidade de ser responsivo ao que virá a seguir em um ambiente sem compilação estática para inferir a estrutura geral. É como muitos outros mecanismos no V8, cuja base são apenas coisas que você pode dizer geralmente sobre a execução, como:

- A maioria dos objetos morre em breve, poucos vivem por muito tempo — a "hipótese geracional" da coleta de lixo.
- O programa realmente tem uma estrutura organizacional — construímos [formas ou "classes ocultas"](https://mathiasbynens.be/notes/shapes-ics) (chamamos essas de **mapas** no V8) nos objetos que vemos o programador usar porque acreditamos que serão úteis. *Aliás, [Propriedades Rápidas no V8](/blog/fast-properties) é uma ótima publicação com detalhes interessantes sobre mapas e acesso a propriedades.*
- Os programas têm um estado de inicialização, quando tudo é novo e é difícil dizer o que é importante. Mais tarde, as classes e funções importantes podem ser identificadas por meio de seu uso constante — nosso regime de feedback e pipeline de compilador crescem a partir dessa ideia.

Por fim, e mais importante, o ambiente de execução deve ser muito rápido, caso contrário estamos apenas filosofando.

Agora, V8 poderia simplesmente armazenar propriedades em um armazenamento de suporte anexado ao objeto principal. Diferentemente de propriedades que vivem diretamente no objeto, esse armazenamento de suporte pode crescer indefinidamente por meio de cópia e substituição do ponteiro. No entanto, o acesso mais rápido a uma propriedade ocorre evitando essa indireção e olhando para um deslocamento fixo a partir do início do objeto. Abaixo, mostro o layout de um objeto JavaScript simples no heap V8 com duas propriedades no objeto. As primeiras três palavras são padrão em cada objeto (um ponteiro para o mapa, para o armazenamento de suporte de propriedades e para o armazenamento de suporte de elementos). Você pode ver que o objeto não pode "crescer" porque está bem próximo do próximo objeto no heap:

![](/_img/slack-tracking/property-layout.svg)

:::note
**Nota:** Eu omiti os detalhes do armazenamento de suporte de propriedades porque a única coisa importante sobre ele no momento é que ele pode ser substituído a qualquer momento por um maior. No entanto, também é um objeto no heap V8 e tem um ponteiro de mapa como todos os objetos que residem lá.
:::

De qualquer forma, por causa da performance proporcionada pelas propriedades no objeto, o V8 está disposto a lhe dar espaço extra em cada objeto, e **rastreamento de slack** é a maneira como isso é feito. Eventualmente, você vai se estabilizar, parar de adicionar novas propriedades e começar a minerar bitcoin ou algo assim.

Quanto "tempo" o V8 lhe dá? Inteligentemente, ele considera o número de vezes que você construiu um objeto específico. De fato, há um contador no mapa, e ele é inicializado com um dos números mágicos mais místicos do sistema: **sete**.

Outra pergunta: como o V8 sabe quanto espaço extra no corpo do objeto fornecer? Na verdade, ele recebe uma dica do processo de compilação, que oferece um número estimado de propriedades para começar. Esse cálculo inclui o número de propriedades do objeto protótipo, subindo na cadeia de protótipos recursivamente. Por fim, para garantir, ele adiciona **oito** a mais (outro número mágico!). Você pode ver isso em `JSFunction::CalculateExpectedNofProperties()`:

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);
}
    // O super construtor deve ser compilado para o número de propriedades esperadas
    // estar disponível.
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // Verifique se a estimativa é razoável.
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // Caso ocorra um erro de compilação, continue iterando para verificar se há
      // uma função interna na cadeia de protótipos que exige
      // determinado número de propriedades no objeto.
      continue;
    }
  }
  // O rastreamento de margem interno recuperará o espaço interno redundante
  // mais tarde, então podemos ajustar generosamente a estimativa,
  // o que significa que superestimamos em pelo menos 8 campos inicialmente.
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

Vamos dar uma olhada em nosso objeto `m1` de antes:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak('Matterhorn', 4478);
```

De acordo com o cálculo em `JSFunction::CalculateExpectedNofProperties` e nossa função `Peak()`, devemos ter 2 propriedades internas no objeto, e graças ao rastreamento de margem, mais 8 extras. Podemos imprimir `m1` com `%DebugPrint()` (_essa função útil expõe a estrutura do mapa. Você pode usá-la executando `d8` com o sinalizador `--allow-natives-syntax`_):

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

Observe que o tamanho da instância do objeto é 52. O layout de objetos no V8 é assim:

| palavra | o que                                              |
| ------ | -------------------------------------------------- |
| 0      | o mapa                                             |
| 1      | ponteiro para o array de propriedades              |
| 2      | ponteiro para o array de elementos                 |
| 3      | campo interno 1 (ponteiro para string `"Matterhorn"`) |
| 4      | campo interno 2 (valor inteiro `4478`)             |
| 5      | campo interno não usado 3                          |
| …      | …                                                  |
| 12     | campo interno não usado 10                         |

O tamanho do ponteiro é 4 neste binário de 32 bits, então temos essas 3 primeiras palavras que todo objeto JavaScript normal tem, e depois 10 palavras extras no objeto. É indicado acima, útilmente, que há 8 "campos de propriedade não utilizados". Portanto, estamos experimentando o rastreamento de margem. Nossos objetos estão inflados, consumindo avidamente preciosos bytes!

Como podemos reduzir isso? Usamos o campo de contador de construção no mapa. Alcançamos zero e decidimos que terminamos com o rastreamento de margem. No entanto, se você construir mais objetos, não verá o contador acima diminuir. Por quê?

Bem, isso ocorre porque o mapa exibido acima não é "o" mapa do objeto `Peak`. É apenas um mapa folha em uma cadeia de mapas descendente do **mapa inicial** que o objeto `Peak` recebe antes de executar o código do construtor.

Como encontrar o mapa inicial? Felizmente, a função `Peak()` tem um ponteiro para ele. É o contador de construção no mapa inicial que usamos para controlar o rastreamento de margem:

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - protótipo de função: 0x37449c89 <Object map = 0x2a287335>
 - mapa inicial: 0x46f07295 <Map(HOLEY_ELEMENTS)>   // Aqui está o mapa inicial.
 - informação compartilhada: 0x31c12495 <SharedFunctionInfo Peak>
 - nome: 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr permite você imprimir o mapa inicial.
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Map]
 - tipo: JS_OBJECT_TYPE
 - tamanho da instância: 52
 - propriedades inobject: 10
 - tipo de elementos: HOLEY_ELEMENTS
 - campos de propriedade não utilizados: 10
 - comprimento enum: inválido
 - ponteiro de retorno: 0x28c02329 <undefined>
 - célula de validade de protótipo: 0x47f0232d <Cell value= 1>
 - descritores de instância (próprio) #0: 0x28c02135 <DescriptorArray[0]>
 - transições #1: 0x46f0735d <Map(HOLEY_ELEMENTS)>
     0x28c046f9: [String] in ReadOnlySpace: #name:
         (transição para (const data field, attrs: [WEC]) @ Any) ->
             0x46f0735d <Map(HOLEY_ELEMENTS)>
 - protótipo: 0x5cc09c7d <Object map = 0x46f07335>
 - construtor: 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - código dependente: 0x28c0212d <Outro objeto de heap (WEAK_FIXED_ARRAY_TYPE)>
 - contador de construção: 5
```

Viu como o contador de construção foi decrementado para 5? Se você quiser encontrar o mapa inicial a partir do mapa de duas propriedades que mostramos acima, pode seguir seu ponteiro de retorno com a ajuda de `%DebugPrintPtr()` até chegar em um mapa com `undefined` no slot de ponteiro de retorno. Esse será o mapa acima.

Agora, uma árvore de mapas cresce a partir do mapa inicial, com um ramo para cada propriedade adicionada a partir daquele ponto. Chamamos esses ramos de _transições_. Na impressão do mapa inicial acima, você vê a transição para o próximo mapa com o rótulo “name”? A árvore completa de mapas até agora parece assim:

![(X, Y, Z) significa (tamanho da instância, número de propriedades in-object, número de propriedades não utilizadas).](/_img/slack-tracking/root-map-1.svg)

Essas transições baseadas em nomes de propriedades são como o [“toupeira cega”](https://www.google.com/search?q=blind+mole&tbm=isch)" do JavaScript constrói seus mapas por trás de você. Esse mapa inicial também é armazenado na função `Peak`, então, quando é usado como construtor, esse mapa pode ser usado para configurar o objeto `this`.

```js
const m1 = new Peak('Matterhorn', 4478);
const m2 = new Peak('Mont Blanc', 4810);
const m3 = new Peak('Zinalrothorn', 4221);
const m4 = new Peak('Wendelstein', 1838);
const m5 = new Peak('Zugspitze', 2962);
const m6 = new Peak('Watzmann', 2713);
const m7 = new Peak('Eiger', 3970);
```

A coisa legal aqui é que depois de criar `m7`, executar `%DebugPrint(m1)` novamente produz um novo resultado incrível:

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - mapa: 0x4b387385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - protótipo: 0x5cd086cd <Object map = 0x4b387335>
 - elementos: 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - propriedades: 0x586421a1 <FixedArray[0]> {
    0x586446f9: [String] in ReadOnlySpace: #name:
        0x51112439 <String[10]: #Matterhorn> (campo de dados constante 0)
    0x51112415: [String] in OldSpace: #height:
        4478 (campo de dados constante 1)
 }
0x4b387385: [Map]
 - tipo: JS_OBJECT_TYPE
 - tamanho da instância: 20
 - propriedades inobject: 2
 - tipo de elementos: HOLEY_ELEMENTS
 - campos de propriedade não utilizados: 0
 - comprimento enum: inválido
 - mapa estável
 - ponteiro de retorno: 0x4b38735d <Map(HOLEY_ELEMENTS)>
 - célula de validade de protótipo: 0x511128dd <Cell value= 0>
 - descritores de instância (próprio) #2: 0x5cd087e5 <DescriptorArray[2]>
 - protótipo: 0x5cd086cd <Object map = 0x4b387335>
 - construtor: 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - código dependente: 0x5864212d <Outro objeto de heap (WEAK_FIXED_ARRAY_TYPE)>
 - contador de construção: 0
```

Nosso tamanho de instância agora é 20, o que equivale a 5 palavras:

| palavra | o que                           |
| ---- | ------------------------------- |
| 0    | o mapa                          |
| 1    | ponteiro para o array de propriedades |
| 2    | ponteiro para o array de elementos |
| 3    | nome                           |
| 4    | altura                         |

Você pode se perguntar como isso aconteceu. Afinal, se esse objeto está disposto na memória e tinha 10 propriedades, como o sistema tolera essas 8 palavras sobrando sem proprietário? É verdade que nunca as preenchemos com nada interessante — talvez isso possa nos ajudar.

Se você se pergunta por que estou preocupado em deixar essas palavras sobrando, há algum contexto que você precisa saber sobre o coletor de lixo. Os objetos são dispostos um após o outro, e o coletor de lixo do V8 rastreia as coisas nessa memória percorrendo-a repetidamente. Começando pela primeira palavra na memória, espera-se encontrar um ponteiro para um mapa. Ele lê o tamanho da instância a partir do mapa e então sabe quão longe avançar até o próximo objeto válido. Para algumas classes, ele precisa calcular um comprimento adicionalmente, mas é só isso.

![](/_img/slack-tracking/gc-heap-1.svg)

No diagrama acima, as caixas vermelhas são os **maps** e as caixas brancas são as palavras que preenchem o tamanho da instância do objeto. O coletor de lixo pode "percorrer" o heap pulando de map para map.

Então, o que acontece se o map de repente mudar seu tamanho de instância? Agora, quando o GC (coletor de lixo) percorrer o heap, ele se encontrará olhando para uma palavra que não viu antes. No caso da nossa classe `Peak`, mudamos de ocupar 13 palavras para apenas 5 (eu colori as palavras "propriedade não utilizada" de amarelo):

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

Podemos lidar com isso se inicializarmos de forma inteligente essas propriedades não utilizadas com um **map preenchido de tamanho de instância 4**. Desta forma, o GC vai percorrê-las com leveza assim que forem expostas à travessia.

![](/_img/slack-tracking/gc-heap-4.svg)

Isso é expresso no código em `Factory::InitializeJSObjectBody()`:

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <linhas removidas>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <linhas removidas>
}
```

E assim, isso é o rastreamento de slack em ação. Para cada classe que você criar, pode esperar que ela ocupe mais memória por um tempo, mas na 7ª instanciação "consideramos resolvido" e expomos o espaço restante para o GC ver. Esses objetos de uma palavra não têm donos — ou seja, ninguém aponta para eles — então, quando ocorre uma coleta, eles são liberados e os objetos vivos podem ser compactados para economizar espaço.

O diagrama abaixo reflete que o rastreamento de slack está **finalizado** para este map inicial. Observe que o tamanho da instância agora é 20 (5 palavras: o map, os arrays de propriedades e elementos, e mais 2 slots). O rastreamento de slack respeita toda a cadeia desde o map inicial. Ou seja, se um descendente do map inicial acabar usando todas as 10 propriedades extras iniciais, então o map inicial as mantém, marcando-as como não utilizadas:

![(X, Y, Z) significa (tamanho da instância, número de propriedades dentro do objeto, número de propriedades não utilizadas).](/_img/slack-tracking/root-map-2.svg)

Agora que o rastreamento de slack está finalizado, o que acontece se adicionarmos outra propriedade a um desses objetos `Peak`?

```js
m1.country = 'Switzerland';
```

O V8 precisa acessar o armazenamento de propriedades. Acabamos com o seguinte layout de objeto:

| palavra | valor                                 |
| ------- | ------------------------------------- |
| 0       | map                                   |
| 1       | ponteiro para armazenamento de propriedades |
| 2       | ponteiro para elementos (array vazio) |
| 3       | ponteiro para string `"Matterhorn"`      |
| 4       | `4478`                                |

O armazenamento de propriedades então fica assim:

| palavra | valor                             |
| ------- | --------------------------------- |
| 0       | map                               |
| 1       | tamanho (3)                       |
| 2       | ponteiro para string `"Switzerland"` |
| 3       | `undefined`                       |
| 4       | `undefined`                       |
| 5       | `undefined`                       |

Temos esses valores extras `undefined` lá caso você decida adicionar mais propriedades. Meio que achamos que você pode fazer isso, com base no seu comportamento até agora!

## Propriedades opcionais

Pode acontecer de você adicionar propriedades apenas em alguns casos. Suponha que, se a altura for de 4000 metros ou mais, você queira acompanhar duas propriedades adicionais, `prominence` e `isClimbed`:

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

Você adiciona algumas dessas variantes diferentes:

```js
const m1 = new Peak('Wendelstein', 1838);
const m2 = new Peak('Matterhorn', 4478, 1040, true);
const m3 = new Peak('Zugspitze', 2962);
const m4 = new Peak('Mont Blanc', 4810, 4695, true);
const m5 = new Peak('Watzmann', 2713);
const m6 = new Peak('Zinalrothorn', 4221, 490, true);
const m7 = new Peak('Eiger', 3970);
```

Neste caso, os objetos `m1`, `m3`, `m5` e `m7` têm um map, e os objetos `m2`, `m4` e `m6` têm um map mais abaixo na cadeia de descendentes do map inicial por causa das propriedades adicionais. Quando o rastreamento de slack está finalizado para essa família de maps, há **4** propriedades dentro do objeto em vez de **2** como antes, porque o rastreamento de slack garante espaço suficiente para o maior número de propriedades dentro do objeto usadas por quaisquer descendentes na árvore de maps abaixo do map inicial.

Abaixo está mostrado a família de maps após executar o código acima, e claro, o rastreamento de slack está completo:

![(X, Y, Z) significa (tamanho da instância, número de propriedades dentro do objeto, número de propriedades não utilizadas).](/_img/slack-tracking/root-map-3.svg)

## E quanto ao código otimizado?

Vamos compilar algum código otimizado antes de terminar o rastreamento de folga. Usaremos alguns comandos de sintaxe nativa para forçar a compilação otimizada antes de concluirmos o rastreamento de folga:

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo('Wendelstein', 1838);
const m2 = foo('Matterhorn', 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo('Zugspitze', 2962);
```

Isso deve ser suficiente para compilar e executar código otimizado. Fazemos algo no TurboFan (o compilador otimizador) chamado [**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27), onde ajustamos a alocação de objetos. Isso significa que o código nativo que produzimos emite instruções para pedir ao GC o tamanho da instância do objeto a ser alocado e, em seguida, inicializa cuidadosamente esses campos. No entanto, esse código seria inválido se o rastreamento de folga parasse em algum momento posterior. O que podemos fazer em relação a isso?

Muito simples! Apenas encerramos o rastreamento de folga antecipadamente para essa família de mapas. Isso faz sentido porque normalmente — não compilaríamos uma função otimizada até que milhares de objetos tenham sido criados. Então, o rastreamento de folga *deve* estar concluído. Se não estiver, azar! O objeto não deve ser tão importante afinal, se menos de 7 deles foram criados até este ponto. (Normalmente, lembre-se, só otimizamos após o programa rodar por muito tempo.)

### Compilando em uma thread de fundo

Podemos compilar código otimizado na thread principal, caso em que podemos encerrar o rastreamento de folga prematuramente com algumas chamadas para alterar o mapa inicial porque o mundo foi interrompido. No entanto, realizamos o máximo de compilação possível em uma thread de fundo. A partir dessa thread seria perigoso tocar no mapa inicial porque ele *pode estar sendo alterado na thread principal onde o JavaScript está rodando.* Então, nossa técnica funciona assim:

1. **Advinhe** que o tamanho da instância será o que seria se o rastreamento de folga fosse interrompido agora. Lembre-se desse tamanho.
1. Quando a compilação estiver quase concluída, retornamos para a thread principal onde podemos forçar com segurança a conclusão do rastreamento de folga, caso não tenha ocorrido.
1. Verifique: o tamanho da instância é o que previmos? Nesse caso, **estamos bem!** Caso contrário, descarte o objeto de código e tente novamente mais tarde.

Se você quer ver isso em código, dê uma olhada na classe [`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc) e como ela é usada em `js-create-lowering.cc` para criar alocações embutidas. Você verá que o método `PrepareInstall()` é chamado na thread principal, forçando a conclusão do rastreamento de folga. Em seguida, o método `Install()` verifica se nosso palpite sobre o tamanho da instância foi confirmado.

Aqui está o código otimizado com a alocação embutida. Primeiro você verá a comunicação com o GC, verificando se podemos apenas avançar o ponteiro pelo tamanho da instância e pegá-lo (isso é chamado de alocação com ponteiro incremental). Então, começamos a preencher os campos do novo objeto:

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; hey GC, podemos ter 28 (0x1c) bytes, por favor?
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; ok GC, pegamos. Obrigado.
61  add ecx,0x1                 ;; êêê, ECX é meu novo objeto.
64  mov edi,0x46647295          ;; objeto: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; Armazene o MAPA INICIAL.
6c  mov edi,0x56f821a1          ;; objeto: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; Armazene a backing store de PROPRIEDADES (vazia)
74  mov [ecx+0x7],edi           ;; Armazene a backing store de ELEMENTOS (vazia)
77  mov edi,0x56f82329          ;; objeto: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; propriedade embutida 1 <-- indefinido
7f  mov [ecx+0xf],edi           ;; propriedade embutida 2 <-- indefinido
82  mov [ecx+0x13],edi          ;; propriedade embutida 3 <-- indefinido
85  mov [ecx+0x17],edi          ;; propriedade embutida 4 <-- indefinido
88  mov edi,[ebp+0xc]           ;; recuperar argumento {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; objeto: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; empurre o mapa para frente
9e  mov [ecx+0xb],edi           ;; nome = {a1}
a1  mov eax,[ebp+0x10]          ;; recuperar argumento {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; objeto: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; empurre o mapa para frente
b4  mov [ecx+0xf],eax           ;; altura = {a2}
b7  cmp eax,0x1f40              ;; altura >= 4000?
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 início --
                  -- B9 início --
c2  mov edx,[ebp+0x14]          ;; recuperar argumento {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; objeto: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; empurre o mapa para frente
d6  mov [ecx+0x13],edx          ;; proeminência = {a3}
d9  mov esi,[ebp+0x18]          ;; recuperar argumento {a4}
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; objeto: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; empurre o mapa para frente até o mapa folha
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- Início de B10 (desconstruir quadro) --
f2  mov eax,ecx                 ;; prepare-se para retornar este objeto Peak incrível!
…
```

Aliás, para ver tudo isso, você deve ter uma compilação de depuração e passar algumas flags. Coloquei o código em um arquivo e chamei:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

Espero que isso tenha sido uma exploração divertida. Gostaria de agradecer especialmente a Igor Sheludko e Maya Armyanova por (pacientemente!) revisar este post.
