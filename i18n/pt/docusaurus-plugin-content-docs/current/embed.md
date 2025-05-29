---
title: "Introdução ao uso do V8"
description: "Este documento apresenta alguns conceitos-chave do V8 e fornece um exemplo de “hello world” para começar a trabalhar com o código do V8."
---
Este documento apresenta alguns conceitos-chave do V8 e fornece um exemplo de “hello world” para começar a trabalhar com o código do V8.

## Público-alvo

Este documento é destinado a programadores C++ que desejam incorporar o motor JavaScript V8 em uma aplicação C++. Ele ajuda a tornar os objetos e métodos C++ de sua aplicação acessíveis ao JavaScript, e também a disponibilizar objetos e funções em JavaScript para sua aplicação C++.

## Hello world

Vamos analisar um [exemplo de Hello World](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc) que recebe uma declaração JavaScript como argumento de string, executa-a como código JavaScript e imprime o resultado na saída padrão.

Primeiro, alguns conceitos-chave:

- Um isolate é uma instância de VM com seu próprio heap.
- Um handle local é um ponteiro para um objeto. Todos os objetos V8 são acessados usando handles. Eles são necessários devido à forma como o coletor de lixo do V8 funciona.
- Um escopo de handle pode ser pensado como um contêiner para qualquer número de handles. Quando você termina de usar seus handles, em vez de deletar cada um individualmente, pode simplesmente deletar o escopo deles.
- Um contexto é um ambiente de execução que permite que códigos JavaScript separados e não relacionados sejam executados em uma única instância do V8. Você deve especificar explicitamente o contexto no qual deseja executar qualquer código JavaScript.

Esses conceitos são discutidos em maiores detalhes no [guia avançado](/docs/embed#advanced-guide).

## Executar o exemplo

Siga os passos abaixo para executar o exemplo você mesmo:

1. Baixe o código-fonte do V8 seguindo [as instruções do Git](/docs/source-code#using-git).
1. As instruções para este exemplo de hello world foram testadas pela última vez com o V8 v13.1. Você pode conferir este branch com `git checkout branch-heads/13.1 -b sample -t`
1. Crie uma configuração de build usando o script auxiliar:

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    Você pode inspecionar e editar manualmente a configuração de build executando:

    ```bash
    gn args out.gn/x64.release.sample
    ```

1. Compile a biblioteca estática em um sistema Linux 64:

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

1. Compile `hello-world.cc`, vinculando à biblioteca estática criada no processo de construção. Por exemplo, no Linux 64bit usando o compilador GNU e o linker LLD:

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

1. Para códigos mais complexos, o V8 falha sem um arquivo de dados ICU. Copie este arquivo para onde seu binário está armazenado:

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

1. Execute o arquivo executável `hello_world` na linha de comando. Exemplo: No Linux, no diretório V8, execute:

    ```bash
    ./hello_world
    ```

1. Ele imprime `Hello, World!`. Yay!  
   Nota: em novembro de 2024, pode ocorrer um segfault no início da inicialização do processo. Investigação está pendente. Se ocorrer com você e você descobrir o problema, por favor comente em [issue 377222400](https://issues.chromium.org/issues/377222400), ou [envie um patch](https://v8.dev/docs/contribute).

Se você estiver procurando por um exemplo sincronizado com o branch principal, confira o arquivo [`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc). Este é um exemplo muito simples e provavelmente você desejará fazer mais do que apenas executar scripts como strings. [O guia avançado abaixo](#advanced-guide) contém mais informações para integradores do V8.

## Mais exemplos de código

Os seguintes exemplos são fornecidos como parte do download do código-fonte.

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

Este exemplo fornece o código necessário para estender uma aplicação hipotética de processamento de requisições HTTP — que poderia, por exemplo, fazer parte de um servidor web — tornando-a roteável por scripts. Ele recebe um script JavaScript como argumento, que deve fornecer uma função chamada `Process`. A função `Process` em JavaScript pode ser usada, por exemplo, para coletar informações como quantos acessos cada página servida pelo servidor web fictício recebe.

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

Este exemplo recebe nomes de arquivos como argumentos e, em seguida, lê e executa seus conteúdos. Inclui um prompt de comando onde é possível introduzir trechos de código JavaScript, que são então executados. Neste exemplo, funções adicionais como `print` também são adicionadas ao JavaScript através do uso de templates de objetos e funções.

## Guia avançado

Agora que você está familiarizado com o uso do V8 como uma máquina virtual autônoma e com alguns conceitos-chave do V8, como handles, escopos e contextos, vamos discutir esses conceitos mais detalhadamente e introduzir alguns outros conceitos que são essenciais para embutir o V8 em sua própria aplicação em C++.

A API do V8 fornece funções para compilar e executar scripts, acessar métodos e estruturas de dados em C++, lidar com erros e habilitar verificações de segurança. Sua aplicação pode usar o V8 como qualquer outra biblioteca em C++. Seu código em C++ acessa o V8 por meio da API do V8 incluindo o cabeçalho `include/v8.h`.

### Handles e coleta de lixo

Um handle fornece uma referência à localização de um objeto JavaScript na memória heap. O coletor de lixo do V8 recupera a memória usada por objetos que não podem mais ser acessados. Durante o processo de coleta de lixo, o coletor de lixo frequentemente move objetos para diferentes localizações no heap. Quando o coletor de lixo move um objeto, ele também atualiza todos os handles que se referem ao objeto com sua nova localização.

Um objeto é considerado lixo se estiver inacessível a partir do JavaScript e não houver handles que se refiram a ele. De tempos em tempos, o coletor de lixo remove todos os objetos considerados como lixo. O mecanismo de coleta de lixo do V8 é fundamental para o desempenho do V8.

Existem vários tipos de handles:

- Handles locais são mantidos em uma pilha e são excluídos quando o destrutor apropriado é chamado. A duração desses handles é determinada por um escopo de handle, que geralmente é criado no início de uma chamada de função. Quando o escopo do handle é excluído, o coletor de lixo está livre para desalocar os objetos anteriormente referenciados pelos handles no escopo, desde que eles não sejam mais acessíveis a partir do JavaScript ou outros handles. Esse tipo de handle é usado no exemplo 'Hello World' acima.

    Handles locais têm a classe `Local<SomeType>`.

    **Nota:** A pilha de handles não faz parte da pilha de chamadas do C++, mas os escopos de handles estão embutidos na pilha do C++. Escopos de handles só podem ser alocados na pilha, não podem ser alocados com `new`.

- Handles persistentes fornecem uma referência a um objeto JavaScript alocado no heap, exatamente como um handle local. Existem duas variações, que diferem na gestão da duração da referência que manipulam. Use um handle persistente quando precisar manter uma referência a um objeto por mais de uma chamada de função, ou quando a duração dos handles não corresponder aos escopos do C++. O Google Chrome, por exemplo, usa handles persistentes para se referir a nós do Modelo de Objeto de Documento (DOM). Um handle persistente pode ser tornado fraco, usando `PersistentBase::SetWeak`, para acionar um callback do coletor de lixo quando as únicas referências a um objeto forem provenientes de handles persistentes fracos.

    - Um handle `UniquePersistent<SomeType>` depende de construtores e destrutores do C++ para gerenciar a duração do objeto subjacente.
    - Um `Persistent<SomeType>` pode ser construído com seu construtor, mas deve ser explicitamente limpo com `Persistent::Reset`.

- Existem outros tipos de handles que são raramente usados e que mencionaremos brevemente aqui:

    - `Eternal` é um handle persistente para objetos JavaScript que se espera nunca serem excluídos. É mais barato de usar porque dispensa o coletor de lixo de determinar a vitalidade desse objeto.
    - Tanto `Persistent` quanto `UniquePersistent` não podem ser copiados, o que os torna inadequados como valores com contêineres de biblioteca padrão pré-C++11. `PersistentValueMap` e `PersistentValueVector` fornecem classes de contêiner para valores persistentes com semântica de mapa e vetor. Desenvolvedores do C++11 não necessitam deles, já que a semântica de movimento do C++11 resolve o problema subjacente.

Naturalmente, criar um handle local toda vez que você cria um objeto pode resultar em muitos handles! É aí que os escopos de handles se tornam muito úteis. Você pode pensar em um escopo de handle como um contêiner que mantém muitos handles. Quando o destrutor do escopo de handle é chamado, todos os handles criados dentro desse escopo são removidos da pilha. Como você esperaria, isso resulta nos objetos aos quais os handles apontam sendo elegíveis para exclusão do heap pelo coletor de lixo.

Voltando ao [nosso exemplo muito simples de Hello World](#hello-world), no diagrama a seguir você pode ver a pilha de handles e os objetos alocados no heap. Note que `Context::New()` retorna um handle `Local`, e criamos um novo handle `Persistent` com base nele para demonstrar o uso de handles `Persistent`.

![](/_img/docs/embed/local-persist-handles-review.png)

Quando o destrutor `HandleScope::~HandleScope` é chamado, o escopo do handle é deletado. Os objetos referenciados pelos handles dentro do escopo do handle deletado estão aptos para remoção na próxima coleta de lixo, se não houver outras referências a eles. O coletor de lixo também pode remover os objetos `source_obj` e `script_obj` do heap, pois eles não são mais referenciados por nenhum handle ou acessíveis de outra forma a partir do JavaScript. Como o handle de contexto é um handle persistente, ele não é removido quando o escopo do handle é encerrado. A única maneira de remover o handle de contexto é chamando explicitamente `Reset` nele.

:::note
**Nota:** Ao longo deste documento, o termo “handle” refere-se a um handle local. Quando se discute um handle persistente, esse termo é utilizado por completo.
:::

É importante estar ciente de uma armadilha comum com este modelo: *você não pode retornar um handle local diretamente de uma função que declara um escopo de handle*. Se fizer isso, o handle local que você está tentando retornar será deletado pelo destrutor do escopo do handle imediatamente antes de a função retornar. A maneira correta de retornar um handle local é criar um `EscapableHandleScope` em vez de um `HandleScope` e chamar o método `Escape` no escopo do handle, passando o handle cujo valor você deseja retornar. Aqui está um exemplo de como isso funciona na prática:

```cpp
// Esta função retorna um novo array com três elementos, x, y e z.
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // Vamos criar handles temporários, então usamos um escopo de handle.
  v8::EscapableHandleScope handle_scope(isolate);

  // Criar um novo array vazio.
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // Retornar um resultado vazio se houve um erro ao criar o array.
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // Preencher os valores
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Retornar o valor através do Escape.
  return handle_scope.Escape(array);
}
```

O método `Escape` copia o valor de seu argumento para o escopo envolvente, deleta todos os handles locais e, em seguida, retorna a nova cópia do handle, que pode ser retornada com segurança.

### Contextos

No V8, um contexto é um ambiente de execução que permite que aplicações JavaScript separadas e não relacionadas sejam executadas em uma única instância do V8. Você deve especificar explicitamente o contexto no qual deseja que qualquer código JavaScript seja executado.

Por que isso é necessário? Porque o JavaScript fornece um conjunto de funções utilitárias e objetos internos que podem ser alterados pelo código JavaScript. Por exemplo, se duas funções JavaScript completamente não relacionadas alterassem o objeto global da mesma maneira, então resultados inesperados provavelmente aconteceriam.

Em termos de tempo de CPU e memória, pode parecer uma operação cara criar um novo contexto de execução, dado o número de objetos internos que devem ser construídos. No entanto, o extenso cache do V8 garante que, embora o primeiro contexto que você criar seja um pouco caro, os contextos subsequentes são muito mais baratos. Isso se deve ao fato de que o primeiro contexto precisa criar os objetos internos e analisar o código JavaScript embutido, enquanto os contextos subsequentes precisam apenas criar os objetos internos de seu contexto. Com o recurso de snapshot do V8 (ativado com a opção de build `snapshot=yes`, que é o padrão), o tempo gasto na criação do primeiro contexto será altamente otimizado, pois o snapshot inclui um heap serializado que já contém código compilado para o código JavaScript embutido. Junto com a coleta de lixo, o extenso cache do V8 também é fundamental para o desempenho do V8.

Quando você cria um contexto, pode entrar e sair dele quantas vezes quiser. Enquanto estiver no contexto A, você pode também entrar em um contexto diferente, B, o que significa que você substitui A pelo contexto atual B. Quando sair de B, A será restaurado como o contexto atual. Isso é ilustrado abaixo:

![](/_img/docs/embed/intro-contexts.png)

Observe que as funções utilitárias e objetos internos de cada contexto são mantidos separados. Você pode opcionalmente definir um token de segurança ao criar um contexto. Consulte a seção [Modelo de Segurança](#security-model) para mais informações.

A motivação para o uso de contextos no V8 foi para que cada janela e iframe em um navegador pudesse ter seu próprio ambiente JavaScript.

### Templates

Um template é um modelo para funções e objetos JavaScript em um contexto. Você pode usar um template para envolver funções e estruturas de dados C++ dentro de objetos JavaScript para que possam ser manipulados por scripts JavaScript. Por exemplo, o Google Chrome usa templates para encapsular nós DOM C++ como objetos JavaScript e para instalar funções no namespace global. Você pode criar um conjunto de templates e, em seguida, usar os mesmos para cada novo contexto que criar. Você pode ter quantos templates forem necessários. No entanto, você pode ter apenas uma instância de qualquer template em um contexto específico.

No JavaScript, há uma forte dualidade entre funções e objetos. Para criar um novo tipo de objeto em Java ou C++, normalmente você definiria uma nova classe. No JavaScript, você cria uma nova função e cria instâncias usando a função como um construtor. O layout e a funcionalidade de um objeto JavaScript estão intimamente ligados à função que o construiu. Isso é refletido na forma como os templates do V8 funcionam. Existem dois tipos de templates:

- Templates de função.

    Um modelo de função é o projeto para uma única função. Você cria uma instância JavaScript do modelo chamando o método `GetFunction` do modelo dentro do contexto em que deseja instanciar a função JavaScript. Você também pode associar um callback em C++ a um modelo de função, que é chamado quando a instância da função JavaScript é invocada.

- Modelos de objeto

    Cada modelo de função tem um modelo de objeto associado. Isso é usado para configurar objetos criados com essa função como seu construtor. Você pode associar dois tipos de callbacks em C++ com modelos de objeto:

    - callbacks de acessores são invocados quando uma propriedade específica do objeto é acessada por um script
    - callbacks de interceptores são invocados quando qualquer propriedade do objeto é acessada por um script

  [Acessores](#accessors) e [interceptores](#interceptors) são discutidos posteriormente neste documento.

O código a seguir fornece um exemplo de criação de um modelo para o objeto global e configuração das funções globais embutidas.

```cpp
// Cria um modelo para o objeto global e define as
// funções globais embutidas.
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// Cada processador obtém seu próprio contexto para que diferentes processadores
// não interfiram uns nos outros.
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

Este código de exemplo é retirado de `JsHttpProcessor::Initializer` no exemplo `process.cc`.

### Acessores

Um acessor é um callback em C++ que calcula e retorna um valor quando uma propriedade do objeto é acessada por um script JavaScript. Os acessores são configurados por meio de um modelo de objeto, usando o método `SetAccessor`. Este método recebe o nome da propriedade com a qual está associado e dois callbacks para executar quando um script tenta ler ou escrever a propriedade.

A complexidade de um acessor depende do tipo de dado que você está manipulando:

- [Acessando variáveis globais estáticas](#accessing-static-global-variables)
- [Acessando variáveis dinâmicas](#accessing-dynamic-variables)

### Acessando variáveis globais estáticas

Suponha que existam duas variáveis inteiras em C++, `x` e `y`, que precisam estar disponíveis para JavaScript como variáveis globais dentro de um contexto. Para fazer isso, você precisa chamar funções acessoras em C++ sempre que um script lê ou escreve essas variáveis. Essas funções acessoras convertem um inteiro em C++ para um inteiro JavaScript usando `Integer::New` e convertem um inteiro JavaScript para um inteiro em C++ usando `Int32Value`. Um exemplo é fornecido abaixo:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetter são tão similares que foram omitidos por brevidade

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

Observe que o modelo de objeto no código acima é criado ao mesmo tempo que o contexto. O modelo poderia ter sido criado antecipadamente e então usado para qualquer número de contextos.

### Acessando variáveis dinâmicas

No exemplo anterior, as variáveis eram estáticas e globais. E se os dados que estão sendo manipulados forem dinâmicos, como acontece com a árvore DOM em um navegador? Vamos imaginar que `x` e `y` são campos de objeto na classe C++ `Point`:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

Para disponibilizar qualquer número de instâncias `point` em C++ para JavaScript, precisamos criar um objeto JavaScript para cada `point` em C++ e estabelecer uma conexão entre o objeto JavaScript e a instância C++. Isso é feito com valores externos e campos internos de objetos.

Primeiro, crie um modelo de objeto para o objeto wrapper `point`:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

Cada objeto `point` em JavaScript mantém uma referência ao objeto em C++ para o qual é um wrapper com um campo interno. Esses campos são chamados assim porque não podem ser acessados de dentro do JavaScript, apenas do código em C++. Um objeto pode ter qualquer número de campos internos, e o número de campos internos é definido no modelo de objeto como segue:

```cpp
point_templ->SetInternalFieldCount(1);
```

Aqui o número de campos internos é definido como `1`, o que significa que o objeto tem um campo interno, com índice `0`, que aponta para um objeto em C++.

Adicione os acessores `x` e `y` ao modelo:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

Em seguida, encapsule um ponto C++ criando uma nova instância do template e, em seguida, definindo o campo interno `0` para um encapsulamento externo em torno do ponto `p`.

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

O objeto externo é simplesmente um encapsulamento em torno de um `void*`. Objetos externos só podem ser usados para armazenar valores de referência em campos internos. Objetos JavaScript não podem ter referências diretas a objetos C++, então o valor externo é usado como uma "ponte" para ir do JavaScript para o C++. Nesse sentido, os valores externos são o oposto dos handles, uma vez que os handles permitem que o C++ faça referências a objetos JavaScript.

Aqui está a definição dos acessores `get` e `set` para `x`, as definições dos acessores `y` são idênticas, exceto pela substituição de `x` por `y`:

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

Acessores extraem a referência ao objeto `point` que foi encapsulado pelo objeto JavaScript e, em seguida, lêem e escrevem no campo associado. Dessa forma, esses acessores genéricos podem ser usados em qualquer número de objetos `point` encapsulados.

### Interceptadores

Você também pode especificar um callback para sempre que um script acessar qualquer propriedade de objeto. Estes são chamados de interceptadores. Por eficiência, existem dois tipos de interceptadores:

- *interceptadores de propriedade nomeada* - chamados ao acessar propriedades com nomes em formato de string.
  Um exemplo disso, em um ambiente de navegador, é `document.theFormName.elementName`.
- *interceptadores de propriedade indexada* - chamados ao acessar propriedades indexadas. Um exemplo disso, em um ambiente de navegador, é `document.forms.elements[0]`.

O exemplo `process.cc`, fornecido com o código-fonte do V8, inclui um exemplo de uso de interceptadores. No seguinte trecho de código `SetNamedPropertyHandler` especifica os interceptadores `MapGet` e `MapSet`:

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

O interceptador `MapGet` é fornecido abaixo:

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // Obtém o mapa encapsulado por este objeto.
  map<string, string> *obj = UnwrapMap(info.Holder());

  // Converte a string JavaScript em uma std::string.
  string key = ObjectToString(name);

  // Busca o valor, se ele existir, usando o padrão do STL.
  map<string, string>::iterator iter = obj->find(key);

  // Se a chave não estiver presente, retorna um handle vazio como sinal.
  if (iter == obj->end()) return;

  // Caso contrário, busca o valor e encapsula em uma string JavaScript.
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

Assim como os acessores, os callbacks especificados são invocados sempre que uma propriedade é acessada. A diferença entre acessores e interceptadores é que interceptadores lidam com todas as propriedades, enquanto acessores estão associados a uma propriedade específica.

### Modelo de segurança

A "política de mesma origem" (introduzida pela primeira vez com o Netscape Navigator 2.0) impede que um documento ou script carregado de uma "origem" obtenha ou defina propriedades de um documento de uma origem diferente. O termo origem é definido aqui como uma combinação de nome de domínio (exemplo: `www.example.com`), protocolo (exemplo: `https`) e porta. Por exemplo, `www.example.com:81` não é a mesma origem que `www.example.com`. Os três devem coincidir para que duas páginas da web possam ser consideradas como tendo a mesma origem. Sem essa proteção, uma página web maliciosa poderia comprometer a integridade de outra página web.

No V8, uma "origem" é definida como um contexto. O acesso a qualquer contexto diferente daquele de onde você está chamando não é permitido por padrão. Para acessar um contexto diferente daquele de onde você está chamando, você precisa usar tokens de segurança ou callbacks de segurança. Um token de segurança pode ser qualquer valor, mas normalmente é um símbolo, uma string canônica que não existe em nenhum outro lugar. Você pode especificar opcionalmente um token de segurança com `SetSecurityToken` ao configurar um contexto. Se você não especificar um token de segurança, o V8 gerará automaticamente um para o contexto que você está criando.

Quando uma tentativa é feita para acessar uma variável global, o sistema de segurança da V8 primeiro verifica o token de segurança do objeto global sendo acessado em relação ao token de segurança do código que está tentando acessá-lo. Se os tokens forem iguais, o acesso é concedido. Se os tokens não forem iguais, a V8 realiza um callback para verificar se o acesso deve ser permitido. Você pode especificar se o acesso a um objeto deve ser permitido configurando o callback de segurança no objeto, usando o método `SetAccessCheckCallbacks` em templates de objetos. O sistema de segurança da V8 pode então buscar o callback de segurança do objeto sendo acessado e chamá-lo para perguntar se outro contexto tem permissão para acessá-lo. Este callback recebe o objeto sendo acessado, o nome da propriedade sendo acessada, o tipo de acesso (leitura, escrita ou exclusão, por exemplo) e retorna se o acesso será ou não permitido.

Este mecanismo é implementado no Google Chrome, de modo que, se os tokens de segurança não corresponderem, um callback especial é usado para permitir acesso apenas aos seguintes: `window.focus()`, `window.blur()`, `window.close()`, `window.location`, `window.open()`, `history.forward()`, `history.back()`, e `history.go()`.

### Exceções

O V8 lança uma exceção se ocorrer um erro — por exemplo, quando um script ou função tenta ler uma propriedade que não existe ou se uma função é chamada que não é uma função.

O V8 retorna um handle vazio se uma operação não tiver sucesso. Portanto, é importante que seu código verifique se o valor retornado não é um handle vazio antes de continuar a execução. Verifique se um handle é vazio com a função pública `IsEmpty()` da classe `Local`.

Você pode capturar exceções com `TryCatch`, por exemplo:

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Exception: %s\n", *exception_str);
  // ...
}
```

Se o valor retornado for um handle vazio, e você não tiver um `TryCatch` configurado, seu código precisa ser abortado. Caso você tenha um `TryCatch`, a exceção é capturada e o código pode continuar o processamento.

### Herança

JavaScript é uma linguagem orientada a objetos *sem classes* e, como tal, usa herança prototípica em vez de herança clássica. Isso pode ser confuso para programadores treinados em linguagens orientadas a objetos convencionais como C++ e Java.

Linguagens orientadas a objetos baseadas em classes, como Java e C++, são fundamentadas no conceito de duas entidades distintas: classes e instâncias. JavaScript é uma linguagem baseada em protótipos e, portanto, não faz essa distinção: ela simplesmente tem objetos. JavaScript não suporta nativamente a declaração de hierarquias de classes; entretanto, o mecanismo de protótipo do JavaScript simplifica o processo de adicionar propriedades e métodos personalizados a todas as instâncias de um objeto. Em JavaScript, você pode adicionar propriedades personalizadas a objetos. Por exemplo:

```js
// Criar um objeto chamado `bicycle`.
function bicycle() {}
// Criar uma instância de `bicycle` chamada `roadbike`.
var roadbike = new bicycle();
// Definir uma propriedade personalizada, `wheels`, em `roadbike`.
roadbike.wheels = 2;
```

Uma propriedade personalizada adicionada desta forma existe apenas para aquela instância do objeto. Se criarmos outra instância de `bicycle()`, chamada `mountainbike`, por exemplo, `mountainbike.wheels` retornará `undefined` a menos que a propriedade `wheels` seja explicitamente adicionada.

Às vezes isso é exatamente o que é necessário; outras vezes seria útil adicionar a propriedade personalizada a todas as instâncias de um objeto - afinal, todas as bicicletas têm rodas. É aqui que o objeto protótipo do JavaScript é muito útil. Para usar o objeto protótipo, referencie a palavra-chave `prototype` no objeto antes de adicionar a propriedade personalizada a ele, da seguinte forma:

```js
// Primeiro, criar o objeto “bicycle”
function bicycle() {}
// Atribuir a propriedade wheels ao protótipo do objeto
bicycle.prototype.wheels = 2;
```

Todas as instâncias de `bicycle()` agora terão a propriedade `wheels` previamente construída nelas.

A mesma abordagem é usada no V8 com templates. Cada `FunctionTemplate` tem um método `PrototypeTemplate` que fornece um template para o protótipo da função. Você pode definir propriedades e associar funções C++ a essas propriedades, em um `PrototypeTemplate` que então estará presente em todas as instâncias do `FunctionTemplate` correspondente. Por exemplo:

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

Isso faz com que todas as instâncias de `biketemplate` tenham um método `wheels` na sua cadeia de protótipo que, quando chamado, faz com que a função C++ `MyWheelsMethodCallback` seja chamada.

A classe `FunctionTemplate` do V8 fornece a função pública `Inherit()` que você pode chamar quando quiser que um template de função herde de outro template de função, da seguinte forma:

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
