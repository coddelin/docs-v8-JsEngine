---
title: "Lançamento V8 v6.6"
author: "a equipe do V8"
date: "2018-03-27 13:33:37"
tags: 
  - lançamento
description: "O V8 v6.6 inclui vinculação de captura opcional, extensão de aparagem de strings, várias melhorias de desempenho na análise/compilação/runtime, e muito mais!"
tweet: "978534399938584576"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [versão 6.6 do V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6), que está em fase beta até seu lançamento coordenado com o Chrome 66 Stable nas próximas semanas. O V8 v6.6 está repleto de recursos voltados para desenvolvedores. Este post oferece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Recursos da linguagem JavaScript

### Revisão de `Function.prototype.toString`  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) agora retorna trechos exatos do texto de código fonte, incluindo espaços em branco e comentários. Aqui está um exemplo comparando o comportamento antigo e o novo:

```js
// Note o comentário entre a palavra-chave `function`
// e o nome da função, assim como o espaço após
// o nome da função.
function /* um comentário */ foo () {}

// Anteriormente:
foo.toString();
// → 'function foo() {}'
//             ^ sem comentário
//                ^ sem espaço

// Agora:
foo.toString();
// → 'function /* comentário */ foo () {}'
```

### JSON ⊂ ECMAScript

Os símbolos separador de linha (U+2028) e separador de parágrafo (U+2029) agora são permitidos em literais de string, [compatível com JSON](/features/subsume-json). Anteriormente, esses símbolos eram tratados como terminadores de linha dentro de literais de string, e o uso deles resultava em uma exceção `SyntaxError`.

### Vinculação opcional de `catch`

A cláusula `catch` das instruções `try` agora pode ser [usada sem um parâmetro](/features/optional-catch-binding). Isso é útil se você não precisar do objeto `exception` no código que lida com a exceção.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Olha mãe, sem vinculação!
  handleException();
}
```

### Aparagem de strings unilateral

Além de `String.prototype.trim()`, o V8 agora implementa [`String.prototype.trimStart()` e `String.prototype.trimEnd()`](/features/string-trimming). Essa funcionalidade já estava disponível por meio dos métodos não padrão `trimLeft()` e `trimRight()`, que permanecem como aliases dos novos métodos para compatibilidade retroativa.

```js
const string = '  olá mundo  ';
string.trimStart();
// → 'olá mundo  '
string.trimEnd();
// → '  olá mundo'
string.trim();
// → 'olá mundo'
```

### `Array.prototype.values`

[O método `Array.prototype.values()`](https://tc39.es/ecma262/#sec-array.prototype.values) fornece às arrays a mesma interface de iteração que as coleções `Map` e `Set` do ES2015: todas agora podem ser iteradas por `keys`, `values`, ou `entries` chamando o método com o mesmo nome. Essa mudança tem o potencial de ser incompatível com código JavaScript existente. Se você encontrar um comportamento estranho ou quebrado em um site, tente desativar esse recurso através de `chrome://flags/#enable-array-prototype-values` e [registre um problema](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user).

## Cache de código após a execução

Os termos _carregamento frio_ e _carregamento quente_ podem ser bem conhecidos por pessoas preocupadas com desempenho de carregamento. No V8, também existe o conceito de _carregamento muito quente_. Vamos explicar os diferentes níveis com o Chrome incorporando o V8 como exemplo:

- **Carregamento frio:** O Chrome vê a página da web visitada pela primeira vez e não tem nenhum dado armazenado em cache.
- **Carregamento quente:** O Chrome lembra que a página da web já foi visitada e pode recuperar certos recursos (por exemplo, imagens e arquivos de origem do script) do cache. O V8 reconhece que a página enviou o mesmo arquivo de script antes, e, portanto, armazena o código compilado junto com o arquivo de script no cache de disco.
- **Carregamento muito quente:** Na terceira vez que o Chrome visita a página da web, ao servir o arquivo de script do cache de disco, ele também fornece ao V8 o código armazenado em cache durante o carregamento anterior. O V8 pode usar esse código armazenado em cache para evitar ter que analisar e compilar o script do zero.

Antes do V8 v6.6, nós armazenávamos em cache o código gerado imediatamente após a compilação de nível superior. O V8 somente compilava as funções que eram conhecidas por serem executadas imediatamente durante a compilação de nível superior e marcava outras funções para compilação preguiçosa. Isso significava que o código em cache incluía apenas o código de nível superior, enquanto todas as outras funções precisariam ser compiladas preguiçosamente do zero em cada carregamento de página. A partir da versão 6.6, o V8 armazena em cache o código gerado após a execução de nível superior do script. À medida que executamos o script, mais funções são compiladas preguiçosamente e podem ser incluídas no cache. Como resultado, essas funções não precisam ser compiladas em futuros carregamentos de página, reduzindo o tempo de compilação e análise em cenários de carregamento intenso entre 20% e 60%. A mudança visível para o usuário é uma thread principal menos congestionada, proporcionando uma experiência de carregamento mais suave e rápida.

Fique atento para um post detalhado no blog sobre este tópico em breve.

## Compilação em background

Há algum tempo o V8 foi capaz de [analisar código JavaScript em uma thread de background](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html). Com o novo [interpretador de bytecode Ignition do V8 lançado no ano passado](/blog/launching-ignition-and-turbofan), fomos capazes de estender esse suporte para também permitir a compilação do código-fonte JavaScript para bytecode em uma thread de background. Isso permite que sistemas incorporados realizem mais trabalho fora da thread principal, liberando-a para executar mais JavaScript e reduzir interrupções. Habilitamos esse recurso no Chrome 66, onde observamos uma redução de 5% a 20% no tempo de compilação na thread principal em sites típicos. Para mais detalhes, veja [o recente post no blog sobre este recurso](/blog/background-compilation).

## Remoção de numeração AST

Continuamos colhendo benefícios ao simplificar nosso pipeline de compilação após o [lançamento do Ignition e TurboFan no ano passado](/blog/launching-ignition-and-turbofan). Nosso pipeline anterior exigia uma etapa pós-análise chamada "Numeração AST", onde os nós na árvore de sintaxe abstrata gerada eram numerados para que os vários compiladores a utilizassem como um ponto comum de referência.

Com o tempo, essa etapa de pós-processamento se expandiu para incluir outras funcionalidades: numerar pontos de suspensão para geradores e funções assíncronas, coletar funções internas para compilação antecipada, inicializar literais ou detectar padrões de código não otimizáveis.

Com o novo pipeline, o bytecode do Ignition tornou-se o ponto comum de referência, e a numeração em si não era mais necessária — mas a funcionalidade restante ainda era, e a etapa de numeração AST permaneceu.

No V8 v6.6, finalmente conseguimos [mover ou descontinuar essa funcionalidade restante](https://bugs.chromium.org/p/v8/issues/detail?id=7178) para outras etapas, permitindo-nos remover essa passagem pela árvore. Isso resultou em uma melhoria de 3-5% no tempo de compilação em cenários reais.

## Melhorias de desempenho assíncrono

Conseguimos obter algumas melhorias de desempenho interessantes para promessas e funções assíncronas, e especialmente conseguimos reduzir a diferença entre funções assíncronas e cadeias de promessas dessugared.

![Melhorias na performance de promessas](/_img/v8-release-66/promise.svg)

Além disso, o desempenho de geradores assíncronos e iteração assíncrona foi significativamente melhorado, tornando-os uma opção viável para o próximo Node 10 LTS, que está programado para incluir o V8 v6.6. Como exemplo, considere a seguinte implementação de sequência de Fibonacci:

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

Medimos as seguintes melhorias para esse padrão, antes e depois da transpilação pelo Babel:

![Melhorias na performance de geradores assíncronos](/_img/v8-release-66/async-generator.svg)

Finalmente, [melhorias no bytecode](https://chromium-review.googlesource.com/c/v8/v8/+/866734) em “funções suspensáveis” como geradores, funções assíncronas e módulos, melhoraram o desempenho dessas funções ao serem executadas no interpretador e reduziram seu tamanho compilado. Estamos planejando melhorar ainda mais o desempenho de funções assíncronas e geradores assíncronos nas versões futuras, então fique ligado.

## Melhorias na performance de Arrays

O desempenho de throughput de `Array#reduce` foi aumentado em mais de 10× para arrays duplos esparsos ([veja nosso post no blog para uma explicação sobre arrays esparsos e compactos](/blog/elements-kinds)). Isso amplia o caminho rápido para casos onde `Array#reduce` é aplicado a arrays duplos esparsos e compactos.

![Melhorias na performance de `Array.prototype.reduce`](/_img/v8-release-66/array-reduce.svg)

## Mitigações para código não confiável

No V8 v6.6 adicionamos [mais mitigações para vulnerabilidades de canais laterais](/docs/untrusted-code-mitigations) para evitar vazamentos de informações para códigos JavaScript e WebAssembly não confiáveis.

## GYP foi removido

Esta é a primeira versão do V8 que oficialmente é lançada sem arquivos GYP. Se o seu produto precisa dos arquivos GYP excluídos, você precisará copiá-los para o seu próprio repositório de código-fonte.

## Perfilamento de memória

As DevTools do Chrome agora podem rastrear e capturar objetos DOM em C++ e exibir todos os objetos DOM alcançáveis a partir de JavaScript com suas referências. Este recurso é um dos benefícios do novo mecanismo de rastreamento em C++ do coletor de lixo do V8. Para mais informações, consulte [o blog dedicado a este tema](/blog/tracing-js-dom).

## API do V8

Por favor, use `git log branch-heads/6.5..branch-heads/6.6 include/v8.h` para obter uma lista das mudanças na API.
