---
title: "Lançamento do V8 v7.2"
author: "Andreas Haas, manipulador de traps"
avatars: 
  - andreas-haas
date: "2018-12-18 11:48:21"
tags: 
  - lançamento
description: "O V8 v7.2 apresenta parsing de JavaScript em alta velocidade, async-await mais rápido, redução no consumo de memória no ia32, campos de classe públicos e muito mais!"
tweet: "1074978755934863361"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do repositório Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2), que está em beta até seu lançamento em coordenação com o Chrome 72 Estável em algumas semanas. O V8 v7.2 está cheio de novidades para desenvolvedores. Este post apresenta uma prévia de alguns dos destaques na expectativa do lançamento.

<!--truncate-->
## Memória

[Builtins incorporados](/blog/embedded-builtins) agora são suportados e habilitados por padrão na arquitetura ia32.

## Desempenho

### Parsing de JavaScript

Em média, páginas da web gastam 9,5% do tempo do V8 no início ao fazer parsing de JavaScript. Por isso, nos concentramos em entregar o parser de JavaScript mais rápido do V8 até agora com o v7.2. Melhoramos drasticamente a velocidade de parsing em todas as áreas. Desde o v7.0, a velocidade de parsing melhorou cerca de 30% no desktop. O gráfico a seguir documenta as impressionantes melhorias em nosso benchmark de carregamento real do Facebook nos últimos meses.

![Tempo de parsing do V8 no facebook.com (quanto menor, melhor)](/_img/v8-release-72/facebook-parse-time.png)

Focamos no parser em diversas ocasiões. Os gráficos a seguir mostram as melhorias em relação ao lançamento mais recente do v7.2 em vários sites populares.

![Tempos de parsing do V8 em relação ao V8 v7.2 (quanto menor, melhor)](/_img/v8-release-72/relative-parse-times.svg)

No geral, as melhorias recentes reduziram a média percentual de parsing de 9,5% para 7,5%, resultando em tempos de carregamento mais rápidos e páginas mais responsivas.

### `async`/`await`

O V8 v7.2 vem com [uma implementação mais rápida de `async`/`await`](/blog/fast-async#await-under-the-hood), habilitada por padrão. Fizemos [uma proposta para a especificação](https://github.com/tc39/ecma262/pull/1250) e estamos atualmente reunindo dados de compatibilidade na web para que a mudança seja oficialmente incorporada à especificação ECMAScript.

### Elementos spread

O V8 v7.2 melhora significativamente o desempenho dos elementos spread quando eles aparecem no início do literal de array, por exemplo `[...x]` ou `[...x, 1, 2]`. A melhoria se aplica a arrays expandidos, strings primitivas, conjuntos, chaves de mapas, valores de mapas e — por extensão — ao `Array.from(x)`. Para mais detalhes, veja [nosso artigo detalhado sobre a aceleração de elementos spread](/blog/spread-elements).

### WebAssembly

Analisamos uma série de benchmarks de WebAssembly e os usamos para orientar melhorias na geração de código no nível de execução superior. Em particular, o V8 v7.2 habilita divisão de nós no escalonador do compilador otimizado e rotação de loops no backend. Também melhoramos o caching de wrappers e introduzimos wrappers personalizados que reduzem a sobrecarga nas chamadas de funções matemáticas importadas do JavaScript. Além disso, projetamos mudanças no alocador de registros que aprimoram o desempenho de muitos padrões de código, essas mudanças serão lançadas em uma versão futura.

### Manipuladores de traps

Os manipuladores de traps estão melhorando o throughput geral do código WebAssembly. Eles estão implementados e disponíveis para Windows, macOS e Linux no V8 v7.2. No Chromium, eles estão habilitados para Linux. Windows e macOS serão ativados assim que houver confirmação sobre a estabilidade. Estamos atualmente trabalhando para disponibilizá-los também no Android.

## Rastreamentos de pilha assíncronos

Como [mencionado anteriormente](/blog/fast-async#improved-developer-experience), adicionamos um novo recurso chamado [rastreamentos de pilha assíncronos sem custo](https://bit.ly/v8-zero-cost-async-stack-traces), que enriquece a propriedade `error.stack` com quadros de chamadas assíncronas. Atualmente está disponível por meio do flag de linha de comando `--async-stack-traces`.

## Recursos de linguagem JavaScript

### Campos de classe públicos

O V8 v7.2 adiciona suporte para [campos de classe públicos](/features/class-fields). Em vez de:

```js
class Animal {
  constructor(nome) {
    this.nome = nome;
  }
}

class Gato extends Animal {
  constructor(nome) {
    super(nome);
    this.gostaDeBanho = false;
  }
  miar() {
    console.log('Miau!');
  }
}
```

…você agora pode escrever:

```js
class Animal {
  constructor(nome) {
    this.nome = nome;
  }
}

class Gato extends Animal {
  gostaDeBanho = false;
  miar() {
    console.log('Miau!');
  }
}
```

O suporte para [campos privados de classe](/features/class-fields#private-class-fields) está previsto para uma futura versão do V8.

### `Intl.ListFormat`

O V8 v7.2 adiciona suporte para [a proposta `Intl.ListFormat`](/features/intl-listformat), permitindo a formatação localizada de listas.

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank e Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine e Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora e Harrison'
```

Para mais informações e exemplos de uso, confira [nosso explicativo sobre `Intl.ListFormat`](/features/intl-listformat).

### `JSON.stringify` bem formado

`JSON.stringify` agora produz sequências de escape para substitutos solitários, tornando sua saída Unicode válida (e representável em UTF-8):

```js
// Comportamento antigo:
JSON.stringify('\uD800');
// → '"�"'

// Novo comportamento:
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Para mais informações, veja [nosso explicativo sobre `JSON.stringify` bem formado](/features/well-formed-json-stringify).

### Exportações de namespace de módulo

Em [módulos JavaScript](/features/modules), já era possível usar a seguinte sintaxe:

```js
import * as utils from './utils.mjs';
```

No entanto, não existia uma sintaxe `export` simétrica… [até agora](/features/module-namespace-exports):

```js
export * as utils from './utils.mjs';
```

Isso é equivalente ao seguinte:

```js
import * as utils from './utils.mjs';
export { utils };
```

## API do V8

Use `git log branch-heads/7.1..branch-heads/7.2 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.2 -t branch-heads/7.2` para experimentar os novos recursos do V8 v7.2. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
