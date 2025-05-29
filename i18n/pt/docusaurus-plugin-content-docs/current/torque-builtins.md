---
title: &apos;Builtins Torque do V8&apos;
description: &apos;Este documento é uma introdução à escrita de builtins Torque e é direcionado para desenvolvedores do V8.&apos;
---
Este documento é uma introdução à escrita de builtins Torque e é direcionado para desenvolvedores do V8. Torque substitui o CodeStubAssembler como a maneira recomendada de implementar novos builtins. Veja [Builtins CodeStubAssembler](/docs/csa-builtins) para a versão deste guia no CSA.

## Builtins

No V8, os builtins podem ser vistos como blocos de código executáveis pela VM em tempo de execução. Um caso comum de uso é implementar funções de objetos integrados (como `RegExp` ou `Promise`), mas os builtins também podem ser usados para fornecer outras funcionalidades internas (por exemplo, como parte do sistema IC).

Os builtins do V8 podem ser implementados usando diversos métodos diferentes (cada um com diferentes compensações):

- **Linguagem de montagem dependente de plataforma**: pode ser altamente eficiente, mas necessita de portas manuais para todas as plataformas e é difícil de manter.
- **C++**: estilo muito similar às funções de tempo de execução e com acesso às poderosas funcionalidades de tempo de execução do V8, mas usualmente não adequado para áreas sensíveis ao desempenho.
- **JavaScript**: código conciso e legível, acesso a intrínsecos rápidos, mas com uso frequente de chamadas de tempo de execução lentas, sujeito a desempenho imprevisível devido à poluição de tipos e questões sutis relacionadas à semântica do JS (complicada e não óbvia). Os builtins em JavaScript estão obsoletos e não devem mais ser adicionados.
- **CodeStubAssembler**: fornece funcionalidade eficiente de baixo nível que é muito próxima da linguagem de montagem, ao mesmo tempo que permanece independente de plataforma e mantém a legibilidade.
- **[V8 Torque](/docs/torque)**: é uma linguagem específica de domínio no V8 que é traduzida para CodeStubAssembler. Assim, estende o CodeStubAssembler e oferece tipagem estática, bem como sintaxe legível e expressiva.

O restante do documento foca neste último e fornece um breve tutorial para desenvolver um builtin simples em Torque exposto ao JavaScript. Para informações mais completas sobre Torque, veja o [manual do usuário do V8 Torque](/docs/torque).

## Escrevendo um builtin em Torque

Nesta seção, escreveremos um builtin simples em CSA que recebe um único argumento e retorna se ele representa o número `42`. O builtin é exposto ao JS instalando-o no objeto `Math` (porque podemos).

Este exemplo demonstra:

- Criar um builtin Torque com ligação em JavaScript, que pode ser chamado como uma função JS.
- Usar Torque para implementar lógica simples: distinção de tipos, manipulação de Smi e números na heap, condicionais.
- Instalação do builtin CSA no objeto `Math`.

Caso queira acompanhar localmente, o seguinte código é baseado na revisão [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614).

## Definindo `MathIs42`

O código Torque está localizado nos arquivos `src/builtins/*.tq`, organizados aproximadamente por tópico. Como estaremos escrevendo um builtin `Math`, colocaremos nossa definição em `src/builtins/math.tq`. Como este arquivo ainda não existe, precisamos adicioná-lo à [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614) em [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // Neste ponto, x pode ser basicamente qualquer coisa - um Smi, um HeapNumber,
    // undefined ou qualquer outro objeto JS arbitrário. ToNumber_Inline está definido
    // em CodeStubAssembler. Ele inlines um caminho rápido (se o argumento já é um número)
    // e chama o builtin ToNumber caso contrário.
    const number: Number = ToNumber_Inline(x);
    // Um typeswitch nos permite alternar com base no tipo dinâmico de um valor. O sistema
    // de tipos sabe que um Number pode ser apenas um Smi ou um HeapNumber, então este
    // switch é exaustivo.
    typeswitch (number) {
      case (smi: Smi): {
        // O resultado de smi == 42 não é um booleano em Javascript, então usamos um
        // condicional para criar um valor booleano em Javascript.
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

Colocamos a definição no namespace Torque `math`. Como este namespace não existia antes, precisamos adicioná-lo a [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614) em [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn).

## Anexando `Math.is42`

Objetos embutidos como `Math` são configurados principalmente em [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) (com algumas configurações ocorrendo em arquivos `.js`). Adicionar nosso novo embutido é simples:

```cpp
// Código existente para configurar Math, incluído aqui para clareza.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

Agora que `is42` está anexado, ele pode ser chamado a partir de JS:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42(&apos;42.0&apos;);
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Definindo e chamando um embutido com ligação de stub

Embutidos também podem ser criados com ligação de stub (em vez de ligação em JS, como usamos acima em `MathIs42`). Esses embutidos podem ser úteis para extrair código comumente usado em um objeto de código separado, que pode ser reutilizado por múltiplos chamadores, enquanto o código é produzido apenas uma vez. Vamos extrair o código que lida com números no heap para um embutido separado chamado `HeapNumberIs42`, e chamá-lo a partir de `MathIs42`.

A definição também é direta. A única diferença em relação ao nosso embutido com ligação em Javascript é que omitimos a palavra-chave `javascript` e não há argumento de receptor.

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // Em vez de lidar com números no heap inline, agora chamamos nosso novo embutido.
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

Por que você deveria se importar com embutidos? Por que não deixar o código inline (ou extraído em macros para maior legibilidade)?

Uma razão importante é o espaço do código: embutidos são gerados em tempo de compilação e incluídos no snapshot do V8 ou incorporados no binário. Extrair grandes blocos de código comumente usado em embutidos separados pode rapidamente levar a economias de espaço da ordem de 10 KB a 100 KB.

## Testando embutidos com ligação de stub

Mesmo que nosso novo embutido use uma convenção de chamada não padrão (pelo menos não em C++), é possível escrever casos de teste para ele. O seguinte código pode ser adicionado a [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) para testar o embutido em todas as plataformas:

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
