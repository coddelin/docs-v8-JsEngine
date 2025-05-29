---
title: 'CodeStubAssembler builtins'
description: 'Este documento tem como objetivo apresentar a escrita de builtins do CodeStubAssembler, e é direcionado para desenvolvedores do V8.'
---
Este documento tem como objetivo apresentar a escrita de builtins do CodeStubAssembler, e é direcionado para desenvolvedores do V8.

:::note
**Nota:** [Torque](/docs/torque) substitui o CodeStubAssembler como a maneira recomendada de implementar novos builtins. Consulte [Torque builtins](/docs/torque-builtins) para a versão Torque deste guia.
:::

## Builtins

No V8, os builtins podem ser vistos como blocos de código executáveis pela VM em tempo de execução. Um caso de uso comum é implementar as funções de objetos embutidos (como RegExp ou Promise), mas os builtins também podem ser usados para fornecer outras funcionalidades internas (por exemplo, como parte do sistema IC).

Os builtins do V8 podem ser implementados usando vários métodos diferentes (cada um com vantagens e desvantagens específicas):

- **Linguagem assembly dependente da plataforma**: pode ser altamente eficiente, mas requer portabilidade manual para todas as plataformas e é difícil de manter.
- **C++**: muito semelhante em estilo às funções de tempo de execução e tem acesso à poderosa funcionalidade de execução do V8, mas geralmente não é adequado para áreas sensíveis ao desempenho.
- **JavaScript**: código conciso e legível, acesso a intrínsecos rápidos, mas uso frequente de chamadas de execução lentas, sujeito a desempenho imprevisível devido à poluição de tipo, e problemas sutis relacionados à semântica (complicada e não óbvia) do JS.
- **CodeStubAssembler**: oferece funcionalidade de baixo nível eficiente, muito próxima da linguagem assembly, enquanto permanece independente da plataforma e preserva a legibilidade.

O restante deste documento foca no último método e fornece um breve tutorial para desenvolver um builtin simples do CodeStubAssembler (CSA) exposto ao JavaScript.

## CodeStubAssembler

O CodeStubAssembler do V8 é um montador personalizado e independente de plataforma que fornece primitivos de baixo nível como uma abstração fina sobre o assembly, mas também oferece uma extensa biblioteca de funcionalidades de alto nível.

```cpp
// Nível baixo:
// Carrega os dados de tamanho de ponteiro em addr para value.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// E de alto nível:
// Executa a operação JS ToString(object).
// A semântica ToString está especificada em https://tc39.es/ecma262/#sec-tostring.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

Os builtins do CSA passam por uma parte do pipeline de compilação TurboFan (incluindo agendamento de blocos e alocação de registros, mas, notavelmente, não passam por otimizações), que então emite o código executável final.

## Escrevendo um builtin do CodeStubAssembler

Nesta seção, escreveremos um builtin simples do CSA que recebe um único argumento e retorna se ele representa o número `42`. O builtin é exposto ao JS ao ser instalado no objeto `Math` (porque podemos).

Este exemplo demonstra:

- Criar um builtin do CSA com ligação JavaScript, que pode ser chamado como uma função JS.
- Usar o CSA para implementar lógica simples: manipulação de Smi e heap-number, condicionais e chamadas para builtins TFS.
- Usar Variáveis CSA.
- Instalação do builtin do CSA no objeto `Math`.

Caso você queira seguir localmente, o código a seguir é baseado na revisão [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0).

## Declarando `MathIs42`

Os builtins são declarados na macro `BUILTIN_LIST_BASE` em [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1). Para criar um novo builtin CSA com ligação JS e um parâmetro chamado `X`:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Observe que `BUILTIN_LIST_BASE` utiliza várias macros diferentes que denotam diferentes tipos de builtins (veja a documentação inline para mais detalhes). Especificamente, os builtins do CSA se dividem em:

- **TFJ**: Ligação JavaScript.
- **TFS**: Ligação Stub.
- **TFC**: Builtin de ligação Stub que exige um descriptor de interface personalizado (por exemplo, se os argumentos não são etiquetados ou precisam ser passados em registros específicos).
- **TFH**: Builtin de ligação Stub especializado usado para manipuladores de IC.

## Definindo `MathIs42`

As definições de builtins estão localizadas nos arquivos `src/builtins/builtins-*-gen.cc`, aproximadamente organizados por tópico. Como estaremos escrevendo um builtin de `Math`, colocaremos nossa definição em [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1).

```cpp
// TF_BUILTIN é uma macro de conveniência que cria uma nova subclasse do
// assembler dado nos bastidores.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // Carregue o contexto da função atual (um argumento implícito para cada stub)
  // e o argumento X. Observe que podemos nos referir aos parâmetros pelos nomes
  // definidos na declaração do builtin.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // Neste ponto, x pode ser basicamente qualquer coisa - um Smi, um HeapNumber,
  // indefinido ou qualquer outro objeto JS arbitrário. Vamos chamar o builtin ToNumber
  // para converter x em um número que podemos usar.
  // CallBuiltin pode ser usado para chamar convenientemente qualquer builtin CSA.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // Crie uma variável CSA para armazenar o valor resultante. O tipo da
  // variável é kTagged, já que apenas armazenaremos ponteiros marcados nela.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // Precisamos definir alguns rótulos que serão usados como destinos de salto.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber sempre retorna um número. Precisamos distinguir entre Smis
  // e heap numbers - aqui, verificamos se number é um Smi e condicionalmente
  // saltamos para os rótulos correspondentes.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // Vincular um rótulo começa a gerar código para ele.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant retorna os valores JS true/false dependendo de
    // se a condição passada é verdadeira/falsa. O resultado é vinculado à nossa
    // variável var_result e, em seguida, pulamos incondicionalmente para o rótulo out.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber só pode retornar um Smi ou um heap number. Apenas para garantir,
    // adicionamos aqui uma asserção que verifica se number é realmente um heap number.
    CSA_ASSERT(this, IsHeapNumber(number));
    // Heap numbers envolvem um valor de ponto flutuante. Precisamos extrair explicitamente
    // este valor, realizar uma comparação de ponto flutuante e novamente vincular
    // var_result com base no resultado.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Retornar(result);
  }
}
```

## Associando `Math.Is42`

Objetos builtins como `Math` são configurados principalmente em [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (com algumas configurações ocorrendo em arquivos `.js`). Associar nosso novo builtin é simples:

```cpp
// Código existente para configurar Math, incluído aqui para clareza.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

Agora que `Is42` está associado, ele pode ser chamado a partir do JS:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Definindo e chamando um builtin com ligação stub

Builtins de CSA também podem ser criados com ligação stub (em vez de ligação JS como usamos acima em `MathIs42`). Tais builtins podem ser úteis para extrair código comumente usado em um objeto de código separado que pode ser usado por vários chamadores, enquanto o código é produzido apenas uma vez. Vamos extrair o código que manipula heap numbers em um builtin separado chamado `MathIsHeapNumber42` e chamá-lo a partir de `MathIs42`.

Definir e usar stubs TFS é fácil; declarações são novamente feitas em [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1):

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Observe que atualmente, a ordem dentro de `BUILTIN_LIST_BASE` importa. Como `MathIs42` chama `MathIsHeapNumber42`, o primeiro precisa ser listado após o segundo (esse requisito deve ser removido em algum momento).

A definição também é direta. Em [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1):

```cpp
// Definir um builtin TFS funciona exatamente da mesma maneira que builtins TFJ.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Retornar(SelectBooleanConstant(is_42));
}
```

Finalmente, vamos chamar nosso novo builtin a partir de `MathIs42`:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // Em vez de lidar com números do heap inline, agora chamamos nosso novo stub TFS.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

Por que você deveria se preocupar com builtins TFS? Por que não deixar o código inline (ou extraído em um método auxiliar para melhor legibilidade)?

Uma razão importante é o espaço de código: builtins são geradas durante o tempo de compilação e incluídas no snapshot do V8, ocupando (significativamente) espaço em cada isolado criado. Extrair grandes blocos de código comumente usado para builtins TFS pode rapidamente levar a economias de espaço de 10s a 100s de KBs.

## Testando builtins de ligação de stub

Embora nossa nova builtin use uma convenção de chamada não padrão (pelo menos não-C++), é possível escrever casos de teste para ela. O código a seguir pode ser adicionado a [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) para testar a builtin em todas as plataformas:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
