---
title: 'Manual do usuário V8 Torque'
description: 'Este documento explica a linguagem V8 Torque, conforme usada na base de código V8.'
---
V8 Torque é uma linguagem que permite aos desenvolvedores que contribuem para o projeto V8 expressar mudanças na VM focando na _intenção_ dessas mudanças, em vez de se preocupar com detalhes de implementação não relacionados. A linguagem foi projetada para ser simples o bastante para facilitar a tradução direta da [especificação ECMAScript](https://tc39.es/ecma262/) em uma implementação no V8, mas poderosa o suficiente para expressar otimizações de baixo nível do V8 de forma robusta, como criar caminhos rápidos com base em testes para formatos específicos de objetos.

Torque será familiar para engenheiros de V8 e desenvolvedores de JavaScript, combinando uma sintaxe semelhante ao TypeScript que facilita tanto a escrita quanto a compreensão do código do V8 com sintaxes e tipos que refletem conceitos já comuns no [`CodeStubAssembler`](/blog/csa). Com um sistema de tipos forte e um fluxo de controle estruturado, Torque garante correção por construção. A expressividade do Torque é suficiente para expressar quase toda a funcionalidade que é [atualmente encontrada nos builtins do V8](/docs/builtin-functions). Ele também é bastante interoperável com os builtins do `CodeStubAssembler` e os `macro`s escritos em C++, permitindo que o código Torque utilize funcionalidades em CSA escritas à mão e vice-versa.

Torque fornece construções de linguagem para representar pedaços de implementação do V8 de alto nível e semanticamente ricos, e o compilador Torque converte esses pedaços em código assembly eficiente usando o `CodeStubAssembler`. Tanto a estrutura da linguagem Torque quanto a checagem de erros do compilador Torque garantem correção de maneiras que anteriormente eram trabalhosas e propensas a erros com o uso direto do `CodeStubAssembler`. Tradicionalmente, escrever código ótimo com o `CodeStubAssembler` exigia que os engenheiros do V8 carregassem muito conhecimento especializado em suas cabeças — muito do qual nunca foi formalmente capturado em qualquer documentação escrita — para evitar armadilhas sutis em suas implementações. Sem esse conhecimento, a curva de aprendizado para escrever builtins eficientes era íngreme. Mesmo com o conhecimento necessário, armadilhas não óbvias e não policiadas frequentemente levavam a problemas de correção ou [segurança](https://bugs.chromium.org/p/chromium/issues/detail?id=775888) [bugs](https://bugs.chromium.org/p/chromium/issues/detail?id=785804). Com Torque, muitas dessas armadilhas podem ser evitadas e reconhecidas automaticamente pelo compilador Torque.

## Introdução

A maior parte do código-fonte escrito em Torque é depositado no repositório V8 sob [o diretório `src/builtins`](https://github.com/v8/v8/tree/master/src/builtins), com a extensão de arquivo `.tq`. As definições Torque de classes alocadas no heap do V8 são encontradas junto de suas definições em C++, em arquivos `.tq` com o mesmo nome dos arquivos C++ correspondentes em `src/objects`. O compilador Torque atual pode ser encontrado em [`src/torque`](https://github.com/v8/v8/tree/master/src/torque). Os testes para funcionalidade Torque são incluídos em [`test/torque`](https://github.com/v8/v8/tree/master/test/torque), [`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque), e [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque).

Para dar uma amostra da linguagem, vamos escrever um builtin do V8 que imprime "Hello World!". Para fazer isso, adicionaremos um `macro` Torque em um caso de teste e o chamaremos a partir do framework de teste `cctest`.

Comece abrindo o arquivo `test/torque/test-torque.tq` e adicionando o seguinte código ao final (mas antes do último `}` de fechamento):

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

Depois, abra `test/cctest/torque/test-torque.cc` e adicione o seguinte caso de teste que usa o novo código Torque para construir um stub de código:

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

Então [construa o executável `cctest`](/docs/test), e por fim execute o teste `cctest` para imprimir 'Hello world':

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Como o Torque gera código

O compilador Torque não cria código máquina diretamente, mas gera código C++ que chama a interface `CodeStubAssembler` já existente no V8. O `CodeStubAssembler` usa o backend do [compilador TurboFan](https://v8.dev/docs/turbofan) para gerar código eficiente. Portanto, a compilação Torque exige múltiplas etapas:

1. A construção `gn` primeiro executa o compilador Torque. Ele processa todos os arquivos `*.tq`. Cada arquivo Torque `path/to/file.tq` causa a geração dos seguintes arquivos:
    - `path/to/file-tq-csa.cc` e `path/to/file-tq-csa.h` contendo macros CSA geradas.
    - `path/to/file-tq.inc` para ser incluído no cabeçalho correspondente `path/to/file.h` contendo definições de classes.
    - `path/to/file-tq-inl.inc` para ser incluído no cabeçalho inline correspondente `path/to/file-inl.h`, contendo acessores C++ das definições de classes.
    - `path/to/file-tq.cc` contendo verificadores de heap gerados, impressoras, etc.

    O compilador Torque também gera vários outros arquivos `.h` conhecidos, destinados a serem consumidos pela compilação do V8.
1. A build `gn` então compila os arquivos `-csa.cc` gerados na etapa 1 no executável `mksnapshot`.
1. Quando o `mksnapshot` é executado, todos os builtins do V8 são gerados e empacotados no arquivo snapshot, incluindo aqueles definidos no Torque e quaisquer outros builtins que utilizem a funcionalidade definida no Torque.
1. O restante do V8 é construído. Todos os builtins escritos no Torque são disponibilizados via o arquivo snapshot, que é vinculado ao V8. Eles podem ser chamados como qualquer outro builtin. Além disso, o executável `d8` ou `chrome` também inclui diretamente as unidades de compilação geradas relacionadas às definições de classes.

Graficamente, o processo de build se parece com isto:

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Ferramentas Torque

Ferramentas básicas e suporte ao ambiente de desenvolvimento estão disponíveis para Torque.

- Existe um [plugin Visual Studio Code](https://github.com/v8/vscode-torque) para Torque, que utiliza um servidor de linguagem personalizado para fornecer recursos como ir para definição.
- Também há uma ferramenta de formatação que deve ser usada após modificar arquivos `.tq`: `tools/torque/format-torque.py -i <filename>`

## Solução de problemas em builds envolvendo Torque

Por que você precisa saber disso? Compreender como os arquivos Torque são convertidos em código de máquina é importante porque diferentes problemas (e bugs) podem surgir em diferentes etapas da tradução do Torque para os bits binários incorporados no snapshot:

- Se você tiver um erro de sintaxe ou semântico no código Torque (isto é, um arquivo `.tq`), o compilador Torque falha. O build do V8 é abortado nesta etapa, e você não verá outros erros que podem ser revelados por partes posteriores da construção.
- Depois que seu código Torque estiver sintaticamente correto e passar pelas verificações semânticas (mais ou menos) rigorosas do compilador Torque, a construção do `mksnapshot` ainda pode falhar. Isso ocorre com mais frequência devido a inconsistências em definições externas fornecidas nos arquivos `.tq`. Definições marcadas com a palavra-chave `extern` no código Torque sinalizam para o compilador Torque que a definição de funcionalidade necessária é encontrada em C++. Atualmente, o acoplamento entre as definições `extern` dos arquivos `.tq` e o código C++ ao qual essas definições `extern` se referem é frouxo, e não há verificação durante o tempo de compilação do Torque desse acoplamento. Quando as definições `extern` não correspondem (ou nos casos mais sutis mascaram) a funcionalidade que acessam no arquivo de cabeçalho `code-stub-assembler.h` ou outros cabeçalhos do V8, a construção em C++ do `mksnapshot` falha.
- Mesmo depois que o `mksnapshot` é construído com sucesso, ele pode falhar durante a execução. Isso pode ocorrer porque o Turbofan falha ao compilar o código CSA gerado, por exemplo, porque uma `static_assert` do Torque não pode ser verificada pelo Turbofan. Além disso, os builtins fornecidos pelo Torque que são executados durante a criação do snapshot podem ter um bug. Por exemplo, `Array.prototype.splice`, um builtin criado no Torque, é chamado como parte do processo de inicialização do snapshot JavaScript para configurar o ambiente JavaScript padrão. Se houver um bug na implementação, o `mksnapshot` falha durante a execução. Quando o `mksnapshot` falha, às vezes é útil chamá-lo com a flag `--gdb-jit-full`, que gera informações de depuração extras que fornecem contexto útil, por exemplo, nomes para os builtins gerados pelo Torque em rastreamentos de pilha do `gdb`.
- Claro, mesmo que o código criado no Torque passe pelo `mksnapshot`, ainda pode ser buggy ou causar falhas. Adicionar casos de teste a `torque-test.tq` e `torque-test.cc` é uma boa maneira de garantir que seu código Torque realmente faça o que você espera. Se seu código Torque acabar causando falhas no `d8` ou no `chrome`, a flag `--gdb-jit-full` novamente será muito útil.

## `constexpr`: tempo de compilação vs. tempo de execução

Entender o processo de construção do Torque também é importante para entender um recurso central na linguagem Torque: `constexpr`.

O Torque permite a avaliação de expressões no código Torque em tempo de execução (isto é, quando os builtins do V8 são executados como parte da execução de JavaScript). No entanto, ele também permite que expressões sejam executadas em tempo de compilação (isto é, como parte do processo de construção do Torque e antes que a biblioteca V8 e o executável `d8` tenham sido criados).

Torque usa a palavra-chave `constexpr` para indicar que uma expressão deve ser avaliada no momento da construção. Seu uso é um tanto análogo ao [`constexpr` do C++](https://en.cppreference.com/w/cpp/language/constexpr): além de emprestar a palavra-chave `constexpr` e parte de sua sintaxe do C++, Torque usa `constexpr` para indicar a distinção entre avaliação em tempo de compilação e em tempo de execução.

No entanto, existem algumas diferenças sutis na semântica de `constexpr` em Torque. No C++, expressões `constexpr` podem ser totalmente avaliadas pelo compilador C++. Em Torque, expressões `constexpr` não podem ser totalmente avaliadas pelo compilador Torque, mas mapeiam para tipos, variáveis e expressões C++ que podem (e devem) ser totalmente avaliadas ao executar `mksnapshot`. Do ponto de vista do autor de Torque, expressões `constexpr` não geram código executado em tempo de execução, então nesse sentido elas são em tempo de compilação, embora tecnicamente sejam avaliadas por código C++ externo ao Torque que é executado pelo `mksnapshot`. Então, em Torque, `constexpr` essencialmente significa “tempo de `mksnapshot`”, não “tempo de compilação”.

Em combinação com genéricos, `constexpr` é uma ferramenta poderosa de Torque que pode ser usada para automatizar a geração de múltiplos builtins especializados muito eficientes que diferem entre si em um pequeno número de detalhes específicos que podem ser antecipados pelos desenvolvedores do V8 com antecedência.

## Arquivos

Código Torque é empacotado em arquivos de origem individuais. Cada arquivo de origem consiste em uma série de declarações, que podem estar opcionalmente encapsuladas em uma declaração de namespace para separar os namespaces das declarações. A seguinte descrição da gramática provavelmente está desatualizada. A fonte da verdade é [a definição da gramática no compilador Torque](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar), que é escrita com regras de gramática livre de contexto.

Um arquivo Torque é uma sequência de declarações. As declarações possíveis estão listadas [em `torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration).

## Namespaces

Namespaces em Torque permitem que declarações estejam em namespaces independentes. Eles são semelhantes aos namespaces do C++. Eles permitem criar declarações que não são automaticamente visíveis em outros namespaces. Eles podem ser aninhados e declarações dentro de um namespace aninhado podem acessar as declarações no namespace que os contém sem qualificação. Declarações que não estão explicitamente em uma declaração de namespace são colocadas em um namespace global padrão compartilhado que é visível para todos os namespaces. Namespaces podem ser reabertos, permitindo que sejam definidos em vários arquivos.

Por exemplo:

```torque
macro IsJSObject(o: Object): bool { … }  // No namespace padrão

namespace array {
  macro IsJSArray(o: Object): bool { … }  // No namespace array
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK, namespace global visível aqui
    IsJSArray(o);  // ERRO, não visível neste namespace
    array::IsJSArray(o);  // OK, qualificação explícita de namespace
  }
  // …
};

namespace array {
  // OK, o namespace foi reaberto.
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## Declarações

### Tipos

Torque é fortemente tipado. Seu sistema de tipos é a base para muitas das garantias de segurança e correção que ele fornece.

Para muitos tipos básicos, Torque na verdade não conhece muito sobre eles. Em vez disso, muitos tipos são apenas fracamente acoplados ao `CodeStubAssembler` e tipos C++ por meio de mapeamentos de tipos explícitos e dependem do compilador C++ para reforçar o rigor desse mapeamento. Esses tipos são realizados como tipos abstratos.

#### Tipos abstratos

Os tipos abstratos do Torque mapeiam diretamente para valores em tempo de compilação C++ e tempo de execução no CodeStubAssembler. Suas declarações especificam um nome e uma relação com tipos C++:

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName` especifica o nome do tipo abstrato, e `ExtendsDeclaration` opcionalmente especifica o tipo do qual o tipo declarado deriva. `GeneratesDeclaration` opcionalmente especifica um literal de string que corresponde ao tipo C++ `TNode` usado no código `CodeStubAssembler` para conter um valor em tempo de execução de seu tipo. `ConstexprDeclaration` é um literal de string que especifica o tipo C++ correspondente à versão `constexpr` do tipo Torque para avaliação em tempo de construção (`mksnapshot`).

Aqui está um exemplo de `base.tq` para os tipos inteiros assinados de 31 e 32 bits do Torque:

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### Tipos de União

Tipos de união expressam que um valor pertence a um de vários tipos possíveis. Só permitimos tipos de união para valores etiquetados, porque eles podem ser distinguidos em tempo de execução usando o ponteiro do mapa. Por exemplo, números JavaScript são valores Smi ou objetos `HeapNumber` alocados.

```torque
type Number = Smi | HeapNumber;
```

Os tipos de união satisfazem as seguintes igualdades:

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` se `B` for um subtipo de `A`

Só é permitido formar tipos de união a partir de tipos marcados porque tipos não marcados não podem ser distinguidos em tempo de execução.

Ao mapear tipos de união para CSA, o subtipo comum mais específico de todos os tipos da união é selecionado, com a exceção de `Number` e `Numeric`, que são mapeados para os tipos de união CSA correspondentes.

#### Tipos de classe

Os tipos de classe tornam possível definir, alocar e manipular objetos estruturados no heap GC do V8 a partir do código Torque. Cada tipo de classe Torque deve corresponder a uma subclasse de HeapObject no código C++. Para minimizar o custo de manutenção do código acessador de objetos entre as implementações em C++ e Torque do V8, as definições de classe Torque são utilizadas para gerar o código C++ acessador de objetos sempre que possível (e apropriado), reduzindo o esforço de manter o C++ e Torque sincronizados manualmente.

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

Um exemplo de classe:

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` significa que esta classe está definida em C++, em vez de ser definida apenas em Torque.

As declarações de campos em classes implicitamente geram getters e setters de campos que podem ser usados a partir de CodeStubAssembler, por exemplo:

```cpp
// Em TorqueGeneratedExportedMacrosAssembler:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

Como descrito acima, os campos definidos em classes Torque geram código C++ que remove a necessidade de código acessador duplicado e de visitantes de heap. A definição escrita manualmente de JSProxy deve herdar de um modelo de classe gerado, como este:

```cpp
// Em js-proxy.h:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Qualquer coisa que a classe precise além do que é gerado por Torque vai aqui...

  // No final, porque isso altera public/private:
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// Em js-proxy-inl.h:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

A classe gerada fornece funções de conversão, funções acessadoras de campos e constantes de deslocamento de campos (por exemplo, `kTargetOffset` e `kHandlerOffset` neste caso) que representam o deslocamento em bytes de cada campo a partir do início da classe.

##### Anotações de tipos de classe

Algumas classes não podem usar o padrão de herança mostrado no exemplo acima. Nesses casos, a classe pode especificar `@doNotGenerateCppClass`, herdar diretamente de seu tipo de superclasse e incluir um macro gerado por Torque para suas constantes de deslocamento de campo. Tais classes devem implementar seus próprios acessadores e funções de conversão. O uso desse macro fica assim:

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // Resto da classe omitido...
}
```

`@generateBodyDescriptor` faz com que o Torque emita uma classe `BodyDescriptor` dentro da classe gerada, que representa como o coletor de lixo deve visitar o objeto. Caso contrário, o código C++ deve definir sua própria visitação de objeto ou usar um dos padrões existentes (por exemplo, herdar de `Struct` e incluir a classe em `STRUCT_LIST` significa que a classe é esperada para conter apenas valores marcados).

Se a anotação `@generatePrint` for adicionada, o gerador implementará uma função C++ que imprime os valores dos campos conforme definido pela estrutura Torque. Usando o exemplo JSProxy, a assinatura seria `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`, que pode ser herdada por `JSProxy`.

O compilador Torque também gera código de verificação para todas as classes `extern`, a menos que a classe opte por não tê-lo com a anotação `@noVerifier`. Por exemplo, a definição da classe JSProxy acima gerará um método C++ `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)` que verifica se seus campos são válidos de acordo com a definição de tipo do Torque. Ele também gerará uma função correspondente na classe gerada, `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`, que chama a função estática de `TorqueGeneratedClassVerifiers`. Se você quiser adicionar verificações extras para uma classe (como um intervalo de valores aceitáveis em um número ou uma exigência de que o campo `foo` seja verdadeiro se o campo `bar` não for nulo, etc.), então adicione um `DECL_VERIFIER(JSProxy)` à classe C++ (que oculta o `JSProxyVerify` herdado) e implemente-o em `src/objects-debug.cc`. O primeiro passo de qualquer verificador personalizado deve ser chamar o verificador gerado, como `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`. (Para executar esses verificadores antes e depois de cada coleta de lixo, compile com `v8_enable_verify_heap = true` e execute com `--verify-heap`.)

`@abstract` indica que a classe em si não é instanciada e não possui seu próprio tipo de instância: os tipos de instância que logicamente pertencem à classe são os tipos de instância das classes derivadas.

A anotação `@export` faz com que o compilador Torque gere uma classe C++ concreta (como `JSProxy` no exemplo acima). Isso obviamente só é útil se você não quiser adicionar nenhuma funcionalidade C++ além daquela fornecida pelo código gerado pelo Torque. Não pode ser usado em conjunto com `extern`. Para uma classe que é definida e usada apenas dentro do Torque, é mais apropriado não usar nem `extern` nem `@export`.

`@hasSameInstanceTypeAsParent` indica classes que têm os mesmos tipos de instância que sua classe pai, mas renomeiam alguns campos ou possivelmente possuem um mapa diferente. Nesses casos, a classe pai não é abstrata.

As anotações `@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType` e `@apiExposedInstanceTypeValue` afetam a geração de tipos de instância. Geralmente você pode ignorar isso e ainda assim estar bem. O Torque é responsável por atribuir um valor único na enumeração `v8::internal::InstanceType` para cada classe, para que o V8 possa determinar em tempo de execução o tipo de qualquer objeto no heap JS. A atribuição de tipos de instância pelo Torque deve ser suficiente na grande maioria dos casos, mas há algumas situações em que queremos que o tipo de instância de uma classe específica seja estável entre compilações, ou esteja no início ou final do intervalo de tipos de instância atribuídos à sua superclasse, ou seja um intervalo de valores reservados que podem ser definidos fora do Torque.

##### Campos de Classe

Além de valores simples, como no exemplo acima, os campos de classe podem conter dados indexados. Aqui está um exemplo:

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

Isso significa que as instâncias de `CoverageInfo` são de tamanhos variados com base nos dados em `slot_count`.

Diferentemente do C++, o Torque não adiciona implicitamente preenchimento entre os campos; ao invés disso, ele falhará e emitirá um erro se os campos não estiverem devidamente alinhados. O Torque também exige que campos fortes, fracos e escalares estejam agrupados com outros campos da mesma categoria na ordem dos campos.

`const` significa que um campo não pode ser alterado em tempo de execução (ou pelo menos não facilmente; o Torque falhará na compilação se você tentar defini-lo). Isso é uma boa ideia para campos de comprimento, que só devem ser redefinidos com muito cuidado, pois exigiriam liberar qualquer espaço liberado e poderiam causar condições de corrida com um thread de marcação.
Na verdade, o Torque exige que campos de comprimento usados para dados indexados sejam `const`.

`weak` no início de uma declaração de campo significa que o campo é uma referência fraca personalizada, ao contrário do mecanismo de marcação `MaybeObject` para campos fracos.
Além disso, `weak` afeta a geração de constantes como `kEndOfStrongFieldsOffset` e `kStartOfWeakFieldsOffset`, que é um recurso legado usado em alguns `BodyDescriptor`s personalizados e atualmente ainda exige o agrupamento de campos marcados como `weak`. Esperamos remover esta palavra-chave assim que o Torque for totalmente capaz de gerar todos os `BodyDescriptor`s.

Se o objeto armazenado em um campo puder ser uma referência fraca ao estilo `MaybeObject` (com o segundo bit definido), então `Weak<T>` deve ser usado no tipo e a palavra-chave `weak` **não** deve ser usada. Ainda há algumas exceções a essa regra, como neste campo de `Map`, que pode conter alguns tipos fortes e alguns fracos, e também é marcado como `weak` para inclusão na seção fraca:

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` e `@ifnot` marcam campos que devem ser incluídos em algumas configurações de compilação, mas não em outras. Eles aceitam valores da lista em `BuildFlags`, em `src/torque/torque-parser.cc`.

##### Classes definidas inteiramente fora do Torque

Algumas classes não são definidas no Torque, mas o Torque precisa conhecer todas as classes porque é responsável por atribuir tipos de instância. Para esse caso, as classes podem ser declaradas sem corpo, e o Torque não gerará nada para elas, exceto o tipo de instância. Exemplo:

```torque
extern class OrderedHashMap extends HashTable;
```

#### Shapes

Definir um `shape` é semelhante a definir uma `class`, exceto que usa a palavra-chave `shape` em vez de `class`. Um `shape` é um subtipo de `JSObject` que representa um arranjo momentâneo de propriedades dentro do objeto (em linguagem técnica, essas são "propriedades de dados" em vez de "slots internos"). Um `shape` não tem seu próprio tipo de instância. Um objeto com um `shape` específico pode mudar e perder esse `shape` a qualquer momento, pois o objeto pode entrar no modo de dicionário e mover todas as suas propriedades para um armazenamento separado.

#### Structs

`struct`s são coleções de dados que podem ser facilmente passados juntos. (Totalmente não relacionado à classe chamada `Struct`.) Como classes, podem incluir macros que operam nos dados. Diferentemente das classes, elas também suportam genéricos. A sintaxe é semelhante à de uma classe:

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Anotações de Struct

Qualquer struct marcada como `@export` será incluída com um nome previsível no arquivo gerado `gen/torque-generated/csa-types.h`. O nome é precedido por `TorqueStruct`, então `PromiseResolvingFunctions` torna-se `TorqueStructPromiseResolvingFunctions`.

Os campos da struct podem ser marcados como `const`, o que significa que não devem ser modificados. A struct inteira ainda pode ser sobrescrita.

##### Structs como campos de classe

Uma struct pode ser usada como o tipo de um campo de classe. Nesse caso, ela representa dados agrupados e ordenados dentro da classe (caso contrário, structs não têm requisitos de alinhamento). Isso é particularmente útil para campos indexados em classes. Por exemplo, `DescriptorArray` contém um array de structs com três valores:

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### Referências e Slices

`Reference<T>` e `Slice<T>` são structs especiais que representam ponteiros para dados armazenados dentro de objetos no heap. Ambos contêm um objeto e um deslocamento; `Slice<T>` também contém um comprimento. Em vez de construir essas structs diretamente, você pode usar uma sintaxe especial: `&o.x` criará uma `Reference` para o campo `x` dentro do objeto `o`, ou um `Slice` para os dados se `x` for um campo indexado. Para referências e slices, existem versões constantes e mutáveis. Para referências, esses tipos são escritos como `&T` e `const &T` para referências mutáveis e constantes, respectivamente. A mutabilidade refere-se aos dados que elas apontam e pode não ser global, ou seja, você pode criar referências constantes para dados mutáveis. Para slices, não há sintaxe especial para os tipos e as duas versões são escritas como `ConstSlice<T>` e `MutableSlice<T>`. Referências podem ser desreferenciadas com `*` ou `->`, consistente com C++.

Referências e slices para dados não etiquetados também podem apontar para dados fora do heap.

#### Structs de Bitfield

Um `bitfield struct` representa uma coleção de dados numéricos agrupados em um único valor numérico. Sua sintaxe é semelhante a um `struct` normal, com a adição do número de bits para cada campo.

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

Se um struct de bitfield (ou qualquer outro dado numérico) for armazenado dentro de um Smi, ele pode ser representado usando o tipo `SmiTagged<T>`.

#### Tipos de ponteiros de função

Os ponteiros de função podem apontar apenas para builtins definidos no Torque, uma vez que isso garante a ABI padrão. Eles são especialmente úteis para reduzir o tamanho do código binário.

Embora os tipos de ponteiros de função sejam anônimos (como em C), eles podem ser vinculados a um alias de tipo (como um `typedef` em C).

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### Tipos especiais

Existem dois tipos especiais indicados pelas palavras-chave `void` e `never`. `void` é usado como o tipo de retorno para chamáveis que não retornam valor, e `never` é usado como o tipo de retorno para chamáveis que nunca retornam de fato (ou seja, apenas saem por caminhos excepcionais).

#### Tipos transitórios

No V8, objetos no heap podem alterar sua estrutura em tempo de execução. Para expressar layouts de objetos sujeitos a alterações ou outras suposições temporárias no sistema de tipos, o Torque suporta o conceito de “tipo transitório”. Ao declarar um tipo abstrato, adicionar a palavra-chave `transient` marca-o como um tipo transitório.

```torque
// Um HeapObject com um mapa JSArray, e elementos rápidos compactados, ou
// elementos rápidos com furos quando o NoElementsProtector global não está invalidado.
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

Por exemplo, no caso de `FastJSArray`, o tipo transitório é invalidado se a matriz mudar para elementos com dicionário ou se o `NoElementsProtector` global for invalidado. Para expressar isso no Torque, anote todos os chamáveis que poderiam potencialmente fazer isso como `transitioning`. Por exemplo, chamar uma função JavaScript pode executar JavaScript arbitrário, então é `transitioning`.

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

A maneira como isso é controlado no sistema de tipos é que é ilegal acessar um valor de um tipo transitório durante uma operação de transição.

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) caso contrário Bailout;
Call(f, Undefined);
return fastArray; // Erro de tipo: fastArray é inválido aqui.
```

#### Enums

As enumerações proporcionam um meio de definir um conjunto de constantes e agrupá-las sob um nome semelhante aos classes enum em C++. Uma declaração é introduzida pela palavra-chave `enum` e segue a seguinte estrutura sintática:

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

Um exemplo básico se parece com isto:

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

Esta declaração define um novo tipo `LanguageMode`, onde a cláusula `extends` especifica o tipo subjacente, que é o tipo de tempo de execução usado para representar um valor do enum. Neste exemplo, este é `TNode<Smi>`, já que é o que o tipo `Smi` `gera`. Um `constexpr LanguageMode` é convertido para `LanguageMode` nos arquivos CSA gerados, uma vez que nenhuma cláusula `constexpr` é especificada no enum para substituir o nome padrão. Se a cláusula `extends` for omitida, Torque gerará apenas a versão `constexpr` do tipo. A palavra-chave `extern` informa ao Torque que existe uma definição C++ deste enum. Atualmente, apenas enums `extern` são suportados.

Torque gera um tipo distinto e constante para cada uma das entradas do enum. Estes são definidos dentro de um namespace que corresponde ao nome do enum. Especializações necessárias de `FromConstexpr<>` são geradas para converter dos tipos `constexpr` das entradas para o tipo enum. O valor gerado para uma entrada nos arquivos C++ é `<enum-constexpr>::<entry-name>` onde `<enum-constexpr>` é o nome `constexpr` gerado para o enum. No exemplo acima, esses valores são `LanguageMode::kStrict` e `LanguageMode::kSloppy`.

As enumerações do Torque funcionam muito bem em conjunto com a construção `typeswitch`, porque os valores são definidos usando tipos distintos:

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

Se a definição C++ do enum contiver mais valores do que os usados nos arquivos `.tq`, Torque precisa saber disso. Isso é feito declarando o enum como 'aberto' ao adicionar `...` após a última entrada. Considere o `ExtractFixedArrayFlag`, por exemplo, onde apenas algumas das opções estão disponíveis/usadas a partir do Torque:

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### Callables

Os callables são conceitualmente como funções em JavaScript ou C++, mas têm semânticas adicionais que permitem interagir de forma útil com o código CSA e com o tempo de execução do V8. Torque fornece vários tipos diferentes de callables: `macro`s, `builtin`s, `runtime`s e `intrinsic`s.

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` callables

Os macros são um callable que corresponde a um pedaço de código CSA gerado em C++. Os `macro`s podem ser totalmente definidos no Torque, caso em que o código CSA é gerado pelo Torque, ou marcado como `extern`, caso em que a implementação deve ser fornecida como código CSA escrito à mão em uma classe CodeStubAssembler. Conceitualmente, é útil pensar nos `macro`s como pedaços de código CSA que podem ser inline em pontos de chamada.

As declarações de `macro` no Torque têm a seguinte forma:

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

Todo `macro` Torque não `extern` usa o bloco de declarações `StatementBlock` do `macro` para criar uma função geradora de CSA na classe `Assembler` gerada de seu namespace. Este código se parece com outros códigos que você pode encontrar em `code-stub-assembler.cc`, embora um pouco menos legível, porque é gerado por máquina. Os `macro`s que são marcados como `extern` não têm corpo escrito no Torque e simplesmente fornecem a interface para código CSA em C++ escrito à mão, para que seja utilizável no Torque.

As definições de `macro` especificam parâmetros implícitos e explícitos, um tipo de retorno opcional e labels opcionais. Parâmetros e tipos de retorno serão discutidos em mais detalhes abaixo, mas por enquanto basta saber que funcionam de forma semelhante aos parâmetros de TypeScript, conforme discutidos na seção sobre tipos de funções na documentação do TypeScript [aqui](https://www.typescriptlang.org/docs/handbook/functions.html).

Os rótulos são um mecanismo para saída excepcional de um `macro`. Eles mapeiam 1:1 para rótulos CSA e são adicionados como parâmetros do tipo `CodeStubAssemblerLabels*` ao método C++ gerado para o `macro`. Suas exatas semânticas são discutidas abaixo, mas para o propósito da declaração de um `macro`, a lista de rótulos de um `macro`, separada por vírgulas, é opcionalmente fornecida com a palavra-chave `labels` e posicionada após as listas de parâmetros e o tipo de retorno do `macro`.

Aqui está um exemplo de `base.tq` de `macro`s definidos externamente e no Torque:

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): nunca
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(context implícito: Context)(o: Object):
    nunca
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) caso contrário NotTaken, Taken;
}
```

#### `builtin` chamáveis

`builtin`s são semelhantes aos `macro`s, pois podem ser definidos totalmente no Torque ou marcados como `extern`. No caso de um builtin baseado no Torque, o corpo do builtin é usado para gerar um builtin do V8 que pode ser chamado como qualquer outro builtin do V8, incluindo a adição automática das informações relevantes em `builtin-definitions.h`. Assim como os `macro`s, os `builtin`s do Torque que são marcados como `extern` não possuem um corpo baseado no Torque e simplesmente fornecem uma interface para os `builtin`s existentes no V8 para que possam ser usados a partir do código Torque.

As declarações de `builtin` no Torque têm o seguinte formato:

```grammar
DeclaraçãoMacro :
  transição opt javascript opt builtin NomeIdentificador ParâmetrosImplícitos opt ParâmetrosExplícitosOuVarArgs TipoRetorno opt BlocoDeclaração
  extern transição opt javascript opt builtin NomeIdentificador ParâmetrosImplícitos opt TiposExplícitosOuVarArgs TipoRetorno opt ;
```

Há apenas uma cópia do código de um builtin do Torque, e está no objeto código builtin gerado. Ao contrário dos `macro`s, quando `builtin`s são chamados a partir do código Torque, o código CSA não é embutido no local da chamada, mas uma chamada é gerada para o builtin.

`builtin`s não podem ter rótulos.

Se você estiver codificando a implementação de um `builtin`, pode criar uma [tailcall](https://en.wikipedia.org/wiki/Tail_call) para um builtin ou uma função runtime se (e somente se) for a chamada final no builtin. O compilador pode evitar criar uma nova estrutura de pilha nesse caso. Basta adicionar `tail` antes da chamada, como em `tail MyBuiltin(foo, bar);`.

#### `runtime` chamáveis

`runtime`s são semelhantes aos `builtin`s, pois podem expor uma interface para funcionalidade externa ao Torque. No entanto, em vez de serem implementados no CSA, a funcionalidade fornecida por um `runtime` deve sempre ser implementada no V8 como um callback padrão do runtime.

As declarações de `runtime` no Torque têm o seguinte formato:

```grammar
DeclaraçãoMacro :
  extern transição opt runtime NomeIdentificador ParâmetrosImplícitos opt TiposExplícitosOuVarArgs TipoRetorno opt ;
```

O `runtime extern` especificado com o nome <i>NomeIdentificador</i> corresponde à função de runtime especificada por <code>Runtime::k<i>NomeIdentificador</i></code>.

Assim como os `builtin`s, os `runtime`s não podem ter rótulos.

Você também pode chamar uma função `runtime` como uma tailcall quando apropriado. Basta incluir a palavra-chave `tail` antes da chamada.

Declarações de funções de runtime geralmente são colocadas em um namespace chamado `runtime`. Isso as diferencia de builtins com o mesmo nome e facilita ver no local da chamada que estamos chamando uma função de runtime. Devemos considerar tornar isso obrigatório.

#### `intrinsic` chamáveis

`intrinsic`s são chamáveis do Torque builtin que fornecem acesso a funcionalidades internas que não podem ser implementadas no Torque de outra forma. Eles são declarados no Torque, mas não definidos, uma vez que a implementação é fornecida pelo compilador Torque. As declarações `intrinsic` usam a seguinte gramática:

```grammar
DeclaraçãoIntrinsic :
  intrinsic % NomeIdentificador ParâmetrosImplícitos opt ParâmetrosExplícitos TipoRetorno opt ;
```

Na maior parte, o código Torque "usuário" raramente deve usar `intrinsic`s diretamente.
A seguir estão alguns dos intrinsics suportados:

```torque
// %RawObjectCast faz um downcast de Object para um subtipo de Object sem
// teste rigoroso se o objeto é realmente do tipo de destino.
// RawObjectCasts nunca devem (bem, quase nunca) ser usados em qualquer
// lugar no código Torque, exceto em operadores UnsafeCast baseados em Torque precedidos por um
// tipo apropriado assert()
intrinsic %RawObjectCast<A: tipo>(o: Object): A;

// %RawPointerCast faz um downcast de RawPtr para um subtipo de RawPtr sem
// teste rigoroso se o objeto é realmente do tipo de destino.
intrinsic %RawPointerCast<A: tipo>(p: RawPtr): A;

// %RawConstexprCast converte um valor constante de tempo de compilação para outro.
// Tanto os tipos de origem quanto os de destino devem ser 'constexpr'.
// %RawConstexprCast é traduzido para static_casts no código C++ gerado.
intrinsic %RawConstexprCast<Para: tipo, De: tipo>(f: De): Para;

// %FromConstexpr converte um valor constexpr para um valor não-constexpr.
// Atualmente, apenas a conversão para os seguintes tipos não-constexpr
// é suportada: Smi, Number, String, uintptr, intptr e int32
intrinsic %FromConstexpr<Para: tipo, De: tipo>(b: De): Para;

// %Allocate aloca um objeto não inicializado de tamanho 'size' a partir do heap
// de GC do V8 e "reinterpret casts" o ponteiro do objeto resultante para o
// classe Torque especificada, permitindo que os construtores usem subsequentemente
// operadores padrão de acesso a campos para inicializar o objeto.
// Este intrínseco nunca deve ser chamado a partir do código Torque. Ele é usado
// internamente ao dessugar o operador 'new'.
intrinsec %Allocate<Class: type>(size: intptr): Class;
```

Como `builtin`s e `runtime`s, `intrinsec`s não podem ter rótulos.

### Parâmetros explícitos

Declarações de Callables definidos por Torque, por exemplo, `macro`s e `builtin`s de Torque, possuem listas de parâmetros explícitos. Elas são uma lista de pares identificador e tipo que usam uma sintaxe semelhante às listas de parâmetros de função tipados do TypeScript, com a exceção de que Torque não suporta parâmetros opcionais ou padrão. Além disso, `builtin`s implementados em Torque podem opcionalmente suportar parâmetros de descanso se o `builtin` usar a convenção de chamada interna do JavaScript do V8 (por exemplo, estiver marcado com a palavra-chave `javascript`).

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

Como exemplo:

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### Parâmetros implícitos

Callables de Torque podem especificar parâmetros implícitos usando algo semelhante aos [parâmetros implícitos do Scala](https://docs.scala-lang.org/tour/implicit-parameters.html):

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

Concretamente: Um `macro` pode declarar parâmetros implícitos além dos explícitos:

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

Ao mapear para CSA, parâmetros implícitos e parâmetros explícitos são tratados da mesma forma e formam uma lista de parâmetros conjunta.

Parâmetros implícitos não são mencionados no ponto de chamada, mas são passados implicitamente: `Foo(4, 5)`. Para que isso funcione, `Foo(4, 5)` deve ser chamado em um contexto que forneça um valor chamado `context`. Exemplo:

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

Ao contrário do Scala, proibimos isso se os nomes dos parâmetros implícitos não forem idênticos.

Como a resolução de sobrecarga pode causar comportamentos confusos, garantimos que parâmetros implícitos não influenciem a resolução de sobrecarga de forma alguma. Ou seja: ao comparar candidatos de um conjunto de sobrecarga, não consideramos as ligações implícitas disponíveis no ponto de chamada. Somente depois de encontrarmos uma única melhor sobrecarga, verificamos se há ligações implícitas para os parâmetros implícitos disponíveis.

Ter os parâmetros implícitos à esquerda dos parâmetros explícitos é diferente do Scala, mas se adapta melhor à convenção existente em CSA de ter o parâmetro `context` primeiro.

#### `js-implicit`

Para builtins com ligação JavaScript definida em Torque, você deve usar a palavra-chave `js-implicit` em vez de `implicit`. Os argumentos são limitados a estes quatro componentes da convenção de chamada:

- context: `NativeContext`
- receiver: `JSAny` (`this` em JavaScript)
- target: `JSFunction` (`arguments.callee` em JavaScript)
- newTarget: `JSAny` (`new.target` em JavaScript)

Não é necessário declarar todos, apenas os que você deseja usar. Por exemplo, aqui está nosso código para `Array.prototype.shift`:

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

Observe que o argumento `context` é um `NativeContext`. Isso ocorre porque os builtins no V8 sempre incorporam o contexto nativo em seus fechamentos. Codificar isso na convenção js-implicit permite ao programador eliminar uma operação para carregar o contexto nativo a partir do contexto da função.

### Resolução de sobrecarga

`Macro`s de Torque e operadores (que são apenas aliases para `macro`s) permitem sobrecarga baseada em tipos de argumentos. As regras de sobrecarga são inspiradas nas do C++: uma sobrecarga é selecionada se for estritamente melhor do que todas as alternativas. Isso significa que ela deve ser estritamente melhor em pelo menos um parâmetro e melhor ou igualmente boa em todos os outros.

Ao comparar um par de parâmetros correspondentes de duas sobrecargas…

- …eles são considerados igualmente bons se:
    - forem iguais;
    - ambos exigirem alguma conversão implícita.
- …um é considerado melhor se:
    - ele for um subtipo estrito do outro;
    - ele não exigir uma conversão implícita, enquanto o outro exigir.

Se nenhuma sobrecarga for estritamente melhor que todas as alternativas, isso resulta em um erro de compilação.

### Blocos adiados

Um bloco de declaração pode, opcionalmente, ser marcado como `deferred`, o que é um sinal para o compilador de que ele é acessado com menos frequência. O compilador pode optar por localizar esses blocos no final da função, melhorando assim a localidade do cache para as regiões de código não adiadas. Por exemplo, neste código da implementação de `Array.prototype.forEach`, esperamos permanecer no caminho "rápido" e raramente tomar o caso de desvio:

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

Aqui está outro exemplo, onde os elementos do dicionário são marcados como adiados para melhorar a geração de código para os casos mais prováveis (da implementação de `Array.prototype.join`):

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## Portando código CSA para Torque

[O patch que portou `Array.of`](https://chromium-review.googlesource.com/c/v8/v8/+/1296464) serve como um exemplo mínimo de portabilidade de código CSA para Torque.
