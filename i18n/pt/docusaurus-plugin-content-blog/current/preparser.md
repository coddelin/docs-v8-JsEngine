---
title: "Parsing extremamente rápido, parte 2: análise preguiçosa"
author: "Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)) e Marja Hölttä ([@marjakh](https://twitter.com/marjakh)), analisadores mais esparsos"
avatars:
  - "toon-verwaest"
  - "marja-holtta"
date: 2019-04-15 17:03:37
tags:
  - internals
  - parsing
tweet: "1117807107972243456"
description: "Esta é a segunda parte da nossa série de artigos explicando como o V8 analisa JavaScript da forma mais rápida possível."
---
Esta é a segunda parte da nossa série explicando como o V8 analisa JavaScript da forma mais rápida possível. A primeira parte explicou como tornamos o [scanner](/blog/scanner) do V8 rápido.

Analisar é a etapa em que o código-fonte é transformado em uma representação intermediária para ser consumida por um compilador (no V8, o compilador de bytecode [Ignition](/blog/ignition-interpreter)). A análise e a compilação ocorrem no caminho crítico do início de uma página da web, e nem todas as funções enviadas ao navegador são necessárias imediatamente durante o início. Embora os desenvolvedores possam atrasar esse código com scripts assíncronos e adiados, isso nem sempre é viável. Além disso, muitas páginas da web enviam códigos que só são usados por certos recursos que podem não ser acessados por um usuário durante qualquer execução específica da página.

<!--truncate-->
Compilar o código antecipadamente sem necessidade tem custos reais de recursos:

- Ciclos de CPU são usados para criar o código, atrasando a disponibilidade do código que realmente é necessário para o início.
- Objetos de código ocupam memória, pelo menos até que o [descarte do bytecode](/blog/v8-release-74#bytecode-flushing) decida que o código não é necessário no momento e permite que ele seja coletado como lixo.
- Código compilado até o momento em que o script de nível superior termina de executar acaba sendo armazenado em cache no disco, ocupando espaço.

Por essas razões, todos os navegadores principais implementam _análise preguiçosa_. Em vez de gerar uma árvore de sintaxe abstrata (AST) para cada função e depois compilá-la para bytecode, o analisador pode decidir 'pré-analisar' as funções que encontrar, em vez de analisá-las completamente. Ele faz isso alternando para [o pré-analisador](https://cs.chromium.org/chromium/src/v8/src/parsing/preparser.h?l=921&rcl=e3b2feb3aade83c02e4bd2fa46965a69215cd821), uma cópia do analisador que faz o mínimo necessário para ignorar a função. O pré-analisador verifica se as funções que ignora são sintaticamente válidas e produz todas as informações necessárias para que as funções externas sejam compiladas corretamente. Quando uma função pré-analisada é chamada posteriormente, ela é completamente analisada e compilada sob demanda.

## Alocação de variáveis

A principal complicação da pré-análise é a alocação de variáveis.

Por razões de desempenho, as ativações de função são gerenciadas na pilha de máquina. Por exemplo, se uma função `g` chama uma função `f` com argumentos `1` e `2`:

```js
function f(a, b) {
  const c = a + b;
  return c;
}

function g() {
  return f(1, 2);
  // O ponteiro de instrução de retorno de `f` agora aponta aqui
  // (porque quando `f` retorna, ele retorna aqui).
}
```

Primeiro o receptor (ou seja, o valor `this` para `f`, que é `globalThis` já que é uma chamada de função desleixada) é empurrado para a pilha, seguido pela função chamada `f`. Depois, os argumentos `1` e `2` são empurrados para a pilha. Nesse ponto, a função `f` é chamada. Para executar a chamada, primeiro salvamos o estado de `g` na pilha: o 'ponteiro de instrução de retorno' (`rip`; qual código precisamos retornar) de `f` bem como o 'ponteiro de quadro' (`fp`; como a pilha deve se parecer no retorno). Em seguida, entramos em `f`, que aloca espaço para a variável local `c`, bem como qualquer espaço temporário que possa precisar. Isso garante que qualquer dado usado pela função desapareça quando a ativação da função sair do escopo: ele é simplesmente removido da pilha.

![Layout da pilha de uma chamada à função `f` com argumentos `a`, `b` e variável local `c` alocados na pilha.](/_img/preparser/stack-1.svg)

O problema com essa configuração é que funções podem referenciar variáveis declaradas em funções externas. Funções internas podem sobreviver à ativação na qual foram criadas:

```js
function make_f(d) { // ← declaração de `d`
  return function inner(a, b) {
    const c = a + b + d; // ← referência a `d`
    return c;
  };
}

const f = make_f(10);

function g() {
  return f(1, 2);
}
```

No exemplo acima, a referência de `inner` à variável local `d` declarada em `make_f` é avaliada após `make_f` ter retornado. Para implementar isso, as VMs de linguagens com closures lexicais alocam variáveis referenciadas de funções internas na heap, em uma estrutura chamada 'contexto'.

![Layout da pilha de uma chamada a `make_f` com o argumento copiado para um contexto alocado na heap para uso posterior por `inner`, que captura `d`.](/_img/preparser/stack-2.svg)

Isso significa que, para cada variável declarada em uma função, precisamos saber se uma função interna faz referência à variável, para que possamos decidir se alocamos a variável na pilha ou em um contexto alocado no heap. Ao avaliar um literal de função, alocamos um fechamento que aponta tanto para o código da função quanto para o contexto atual: o objeto que contém os valores das variáveis às quais pode precisar acessar.

Resumindo, realmente precisamos rastrear pelo menos referências de variáveis no pré-analisador.

No entanto, se rastrearmos apenas referências, superestimaremos as variáveis referenciadas. Uma variável declarada em uma função externa pode ser sombreada por uma re-declaração em uma função interna, fazendo com que uma referência dessa função interna aponte para a declaração interna, e não para a externa. Se alocarmos incondicionalmente a variável externa no contexto, isso prejudicará o desempenho. Por isso, para que a alocação de variáveis funcione adequadamente com a pré-análise, precisamos garantir que as funções pré-analisadas rastreiem adequadamente tanto as referências quanto as declarações de variáveis.

O código de nível superior é uma exceção a essa regra. O nível superior de um script é sempre alocado no heap, já que as variáveis são visíveis entre os scripts. Uma maneira simples de se aproximar de uma arquitetura funcional é simplesmente executar o pré-analisador sem rastreamento de variáveis para fazer a análise rápida das funções de nível superior; e usar o analisador completo para funções internas, mas pular sua compilação. Isso é mais custoso do que a pré-análise, pois construímos desnecessariamente uma AST completa, mas faz o sistema funcionar. Foi exatamente o que o V8 fez até a versão v6.3 / Chrome 63.

## Ensinando o pré-analisador sobre variáveis

Rastrear declarações e referências de variáveis no pré-analisador é complicado porque, em JavaScript, nem sempre é claro desde o início o significado de uma expressão parcial. Por exemplo, suponha que temos uma função `f` com um parâmetro `d`, que possui uma função interna `g` com uma expressão que parece que pode referenciar `d`.

```js
function f(d) {
  function g() {
    const a = ({ d }
```

De fato, pode acabar referenciando `d`, porque os tokens que vimos fazem parte de uma expressão de atribuição por desestruturação.

```js
function f(d) {
  function g() {
    const a = ({ d } = { d: 42 });
    return a;
  }
  return g;
}
```

Também pode acabar sendo uma função de seta com um parâmetro de desestruturação `d`, caso em que o `d` em `f` não é referenciado por `g`.

```js
function f(d) {
  function g() {
    const a = ({ d }) => d;
    return a;
  }
  return [d, g];
}
```

Inicialmente, nosso pré-analisador foi implementado como uma cópia autônoma do analisador sem muito compartilhamento, o que fez com que os dois analisadores divergirem ao longo do tempo. Reescrevendo o analisador e o pré-analisador para serem baseados em um `ParserBase` implementando o [padrão recorrente curioso de templates](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern), conseguimos maximizar o compartilhamento ao mesmo tempo que mantivemos os benefícios de desempenho de cópias separadas. Isso simplificou bastante a adição de um rastreamento completo de variáveis no pré-analisador, já que grande parte da implementação pode ser compartilhada entre o analisador e o pré-analisador.

Na verdade, era incorreto ignorar declarações e referências de variáveis mesmo para funções de nível superior. A especificação ECMAScript exige que vários tipos de conflitos de variáveis sejam detectados na primeira análise do script. Por exemplo, se uma variável for declarada duas vezes como uma variável lexical no mesmo escopo, isso é considerado um [erro antecipado de `SyntaxError`](https://tc39.es/ecma262/#early-error). Como nosso pré-analisador simplesmente ignorava declarações de variáveis, ele permitia incorretamente o código durante a pré-análise. Na época, consideramos que o ganho de desempenho justificava a violação da especificação. Agora que o pré-analisador rastreia variáveis adequadamente, no entanto, eliminamos toda essa classe de violações relacionadas à resolução de variáveis em conformidade com a especificação, sem custo de desempenho significativo.

## Pulando funções internas

Conforme mencionado anteriormente, quando uma função pré-analisada é chamada pela primeira vez, a analisamos completamente e compilamos a AST resultante para o bytecode.

```js
// Este é o escopo de nível superior.
function outer() {
  // pré-analisado
  function inner() {
    // pré-analisado
  }
}

outer(); // Analisa e compila completamente `outer`, mas não `inner`.
```

A função aponta diretamente para o contexto externo que contém os valores das declarações de variáveis que precisam estar disponíveis para funções internas. Para permitir a compilação preguiçosa de funções (e para suportar o depurador), o contexto aponta para um objeto de metadados chamado [`ScopeInfo`](https://cs.chromium.org/chromium/src/v8/src/objects/scope-info.h?rcl=ce2242080787636827dd629ed5ee4e11a4368b9e&l=36). Objetos `ScopeInfo` descrevem quais variáveis estão listadas em um contexto. Isso significa que, enquanto compilamos funções internas, podemos calcular onde as variáveis vivem na cadeia de contextos.

Para calcular se a função compilada preguiçosa precisa ou não de um contexto, precisamos realizar novamente a resolução de escopo: precisamos saber se as funções aninhadas na função compilada preguiçosa fazem referência às variáveis declaradas pela função preguiçosa. Podemos descobrir isso ao pré-analisar essas funções novamente. Isso é exatamente o que o V8 fez até a versão V8 v6.3 / Chrome 63. Isso, entretanto, não é ideal em termos de desempenho, pois torna a relação entre o tamanho do código fonte e o custo de análise não linear: pré-analisaríamos funções tantas vezes quanto elas estivessem aninhadas. Além do aninhamento natural de programas dinâmicos, compactadores de JavaScript frequentemente envolvem código em "[expressões de função imediatamente invocadas](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression)" (IIFEs), fazendo com que a maioria dos programas JavaScript possua vários níveis de aninhamento.

![Cada reanálise adiciona, no mínimo, o custo de analisar a função.](/_img/preparser/parse-complexity-before.svg)

Para evitar a sobrecarga de desempenho não linear, realizamos uma resolução de escopo completa mesmo durante a pré-análise. Armazenamos metadados suficientes para que possamos posteriormente simplesmente _pular_ funções internas, ao invés de ter que pré-analisá-las novamente. Uma forma seria armazenar os nomes das variáveis referenciadas pelas funções internas. Isso seria caro para armazenar e exigiria que ainda duplicássemos o trabalho: já realizamos a resolução de variáveis durante a pré-análise.

Em vez disso, serializamos onde as variáveis são alocadas como um array denso de sinalizadores por variável. Quando analisamos preguiçosamente uma função, as variáveis são recriadas na mesma ordem em que o pré-analisador as viu, e podemos simplesmente aplicar os metadados às variáveis. Agora que a função foi compilada, os metadados de alocação de variáveis não são mais necessários e podem ser coletados como lixo. Como só precisamos desses metadados para funções que realmente contêm funções internas, uma grande fração de todas as funções nem sequer precisa desses metadados, reduzindo significativamente a sobrecarga de memória.

![Ao acompanhar os metadados de funções pré-analisadas, podemos pular completamente funções internas.](/_img/preparser/parse-complexity-after.svg)

O impacto de desempenho de pular funções internas é, assim como a sobrecarga de reanalisar funções internas, não linear. Existem sites que movem todas as suas funções para o escopo de nível superior. Como o nível de aninhamento deles é sempre 0, a sobrecarga é sempre 0. Muitos sites modernos, entretanto, aninham funções de fato profundamente. Nesses sites, vimos melhorias significativas quando este recurso foi lançado no V8 v6.3 / Chrome 63. A principal vantagem é que agora não importa mais o quão profundamente o código está aninhado: qualquer função é, no máximo, pré-analisada uma vez e completamente analisada uma vez[^1].

![Tempo de análise na thread principal e fora dela, antes e depois de lançar a otimização de "pular funções internas".](/_img/preparser/skipping-inner-functions.svg)

[^1]: Por razões de memória, o V8 [libera bytecode](/blog/v8-release-74#bytecode-flushing) quando este não é usado por algum tempo. Se o código acabar sendo necessário novamente mais tarde, nós reanalisamos e recompilamos. Como permitimos que os metadados de variáveis sejam descartados durante a compilação, isso provoca uma reanálise de funções internas na recompilação preguiçosa. Nesse ponto, recriamos os metadados para suas funções internas, de forma que não precisamos reanalisar novamente funções internas de suas funções internas.

## Expressões de Função Possivelmente Invocadas

Conforme mencionado anteriormente, compactadores frequentemente combinam vários módulos em um único arquivo ao envolver o código do módulo em um fechamento que eles imediatamente chamam. Isso fornece isolamento para os módulos, permitindo que eles sejam executados como se fossem o único código no script. Essas funções são essencialmente scripts aninhados; as funções são imediatamente chamadas durante a execução do script. Compactadores frequentemente enviam _expressões de função imediatamente invocadas_ (IIFEs; pronunciadas "iffies") como funções colocadas entre parênteses: `(function(){…})()`.

Como essas funções são imediatamente necessárias durante a execução do script, não é ideal pré-analisar tais funções. Durante a execução de nível superior do script, precisamos imediatamente da função compilada, e analisamos e compilamos completamente a função. Isso significa que a análise mais rápida que fizemos anteriormente para tentar acelerar o início é garantidamente um custo adicional desnecessário para o início.

Por que você simplesmente não compila funções chamadas, você pode perguntar? Embora normalmente seja direto para um desenvolvedor notar quando uma função é chamada, isso não é o caso para o analisador. O analisador precisa decidir — antes mesmo de começar a analisar uma função! — se deseja compilar a função imediatamente ou adiar a compilação. Ambiguidades na sintaxe tornam difícil simplesmente escanear rapidamente até o fim da função, e o custo rapidamente se assemelha ao custo de pré-análise regular.

Por este motivo, o V8 reconhece dois padrões simples como _expressões de função possivelmente invocadas_ (PIFEs; pronunciadas "piffies"), nos quais ele analisa e compila uma função rapidamente:

- Se uma função é uma expressão de função colocada entre parênteses, ou seja, `(function(){…})`, assumimos que ela será chamada. Fazemos essa suposição assim que vemos o início desse padrão, ou seja, `(function`.
- Desde o V8 v5.7 / Chrome 57, também detectamos o padrão `!function(){…}(),function(){…}(),function(){…}()` gerado por [UglifyJS](https://github.com/mishoo/UglifyJS2). Essa detecção ocorre assim que vemos `!function`, ou `,function` se este segue imediatamente um PIFE.

Como o V8 compila rapidamente PIFEs, elas podem ser usadas como [feedback orientado por perfil](https://en.wikipedia.org/wiki/Profile-guided_optimization)[^2], informando ao navegador quais funções são necessárias para o início.

Em um momento em que o V8 ainda reanalisava funções internas, alguns desenvolvedores notaram que o impacto da análise de JS na inicialização era bastante alto. O pacote [`optimize-js`](https://github.com/nolanlawson/optimize-js) transforma funções em PIFEs com base em heurísticas estáticas. Na época em que o pacote foi criado, isso tinha um grande impacto no desempenho de carregamento no V8. Reproduzimos esses resultados executando os benchmarks fornecidos pelo `optimize-js` no V8 v6.1, considerando apenas os scripts minimizados.

![Analisar e compilar PIFEs de forma antecipada resulta em inicialização mais rápida a frio e a quente (primeiro e segundo carregamento da página, medindo tempos totais de análise + compilação + execução). No entanto, o benefício é muito menor no V8 v7.5 do que costumava ser no V8 v6.1, devido a grandes melhorias no analisador.](/_img/preparser/eager-parse-compile-pife.svg)

No entanto, agora que não reanalisamos mais funções internas e desde que o analisador ficou muito mais rápido, a melhoria de desempenho obtida através do `optimize-js` é muito reduzida. A configuração padrão para o v7.5, na verdade, já é muito mais rápida do que a versão otimizada executando no v6.1. Mesmo no v7.5 ainda pode fazer sentido usar PIFEs com moderação para código necessário durante a inicialização: evitamos a análise antecipada já que aprendemos cedo que a função será necessária.

Os resultados do benchmark `optimize-js` não refletem exatamente o mundo real. Os scripts são carregados de forma síncrona, e o tempo total de análise + compilação é contado como tempo de carregamento. Em um cenário do mundo real, você provavelmente carregaria os scripts usando tags `<script>`. Isso permite que o pré-carregador do Chrome descubra o script _antes_ de ser avaliado, e o baixe, analise e compile sem bloquear a thread principal. Tudo o que decidimos compilar de forma antecipada é automaticamente compilado fora da thread principal e deve contar minimamente para a inicialização. Executar a compilação de script fora da thread principal amplifica o impacto do uso de PIFEs.

Ainda há um custo, especialmente em termos de memória, então não é uma boa ideia compilar tudo de forma antecipada:

![Compilar antecipadamente *todo* o JavaScript implica em um custo significativo de memória.](/_img/preparser/eager-compilation-overhead.svg)

Embora adicionar parênteses em torno de funções necessárias durante a inicialização seja uma boa ideia (por exemplo, com base no perfil da inicialização), usar um pacote como `optimize-js` que aplica heurísticas estáticas simples não é uma grande ideia. Por exemplo, ele assume que uma função será chamada durante a inicialização se for um argumento para uma chamada de função. Se tal função implementar um módulo inteiro que só será necessário muito mais tarde, no entanto, você acaba compilando demais. Compilar excessivamente de forma antecipada é ruim para o desempenho: V8 sem compilação preguiçosa regredirá significativamente o tempo de carregamento. Além disso, alguns dos benefícios do `optimize-js` vêm de problemas com o UglifyJS e outros minimizadores que removem parênteses de PIFEs que não são IIFEs, removendo dicas úteis que poderiam ter sido aplicadas, por exemplo, a módulos no estilo [Universal Module Definition](https://github.com/umdjs/umd). Esse é provavelmente um problema que os minimizadores devem corrigir para obter o máximo desempenho em navegadores que compilam PIFEs de forma antecipada.

[^2]: PIFEs também podem ser entendidos como expressões de função informadas por perfil.

## Conclusões

A análise preguiçosa acelera a inicialização e reduz a sobrecarga de memória de aplicativos que enviam mais código do que precisam. Poder rastrear adequadamente declarações e referências de variáveis no analisador prévio é necessário para analisarmos previamente de forma correta (conforme a especificação) e rápida. Alocar variáveis no analisador prévio também nos permite serializar informações de alocação de variáveis para uso posterior no analisador, para evitarmos ter que reanalisar funções internas completamente, evitando comportamento de análise não-linear de funções profundamente aninhadas.

PIFEs que podem ser reconhecidos pelo analisador evitam sobrecarga inicial de análise prévia para código necessário imediatamente durante a inicialização. O uso criterioso de PIFEs orientado por perfil ou o uso por empacotadores pode oferecer uma melhoria útil no tempo de inicialização a frio. No entanto, envolver funções desnecessariamente em parênteses para acionar essa heurística deve ser evitado, já que isso faz com que mais código seja compilado de forma antecipada, resultando em desempenho pior na inicialização e aumento no uso de memória.
