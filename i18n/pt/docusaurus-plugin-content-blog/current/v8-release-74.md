---
title: "Lançamento do V8 v7.4"
author: "Georg Neis"
date: 2019-03-22 16:30:42
tags:
  - lançamento
description: "O V8 v7.4 apresenta threads/átomos WebAssembly, campos privados de classe, melhorias de desempenho e memória, e muito mais!"
tweet: "1109094755936489472"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada a partir da ramificação principal do Git do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4), que está em beta até seu lançamento em coordenação com o Chrome 74 Stable em algumas semanas. O V8 v7.4 está repleto de recursos voltados para desenvolvedores. Este post oferece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## V8 sem JIT

Agora, o V8 oferece suporte à execução de *JavaScript* sem alocar memória executável em tempo de execução. Informações detalhadas sobre esse recurso podem ser encontradas no [post dedicado](/blog/jitless).

## Threads/Átomos WebAssembly lançados

Agora, os threads/átomos WebAssembly estão habilitados em sistemas operacionais que não sejam Android. Isso conclui o [teste de origem/visualização que habilitamos no V8 v7.0](/blog/v8-release-70#a-preview-of-webassembly-threads). Um artigo nos Fundamentos da Web explica [como usar átomos WebAssembly com Emscripten](https://developers.google.com/web/updates/2018/10/wasm-threads).

Isso desbloqueia o uso de múltiplos núcleos no computador do usuário via WebAssembly, possibilitando novos casos de uso que exigem muita computação na web.

## Desempenho

### Chamadas mais rápidas com incompatibilidade de argumentos

Em JavaScript, é perfeitamente válido chamar funções com poucos ou muitos parâmetros (ou seja, passar menos ou mais do que os parâmetros formais declarados). O primeiro caso é chamado de _subaplicação_, o segundo é chamado de _sobreaplicação_. No caso de subaplicação, os parâmetros formais restantes recebem o valor `undefined`, enquanto no caso de sobreaplicação, os parâmetros supérfluos são ignorados.

No entanto, as funções JavaScript ainda podem acessar os parâmetros reais por meio do [objeto `arguments`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Functions/arguments), usando [parâmetros rest](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Functions/rest_parameters), ou mesmo usando a propriedade não padrão [`Function.prototype.arguments`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments) em funções no [modo não estrito](https://developer.mozilla.org/pt-BR/docs/Glossary/Sloppy_mode). Como resultado, os motores do JavaScript devem fornecer uma maneira de acessar os parâmetros reais. No V8, isso é feito por meio de uma técnica chamada _adaptação de argumentos_, que fornece os parâmetros reais em casos de subaplicação ou sobreaplicação. Infelizmente, a adaptação de argumentos tem um custo de desempenho e é comumente necessária nas estruturas modernas de front-end e middleware (ou seja, muitas APIs com parâmetros opcionais ou listas de argumentos variáveis).

Há cenários em que o motor sabe que a adaptação de argumentos não é necessária, visto que os parâmetros reais não podem ser observados, nomeadamente quando a função chamada está no modo estrito e não usa nem `arguments` nem parâmetros rest. Nesses casos, o V8 agora ignora completamente a adaptação de argumentos, reduzindo o overhead de chamadas em até **60%**.

![Impacto no desempenho ao ignorar a adaptação de argumentos, conforme medido através de [um microbenchmark](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js).](/_img/v8-release-74/argument-mismatch-performance.svg)

O gráfico mostra que não há mais overhead, mesmo no caso de uma incompatibilidade de argumentos (supondo que a função chamada não consiga observar os argumentos reais). Para mais detalhes, veja o [documento de design](https://bit.ly/v8-faster-calls-with-arguments-mismatch).

### Desempenho aprimorado de acessores nativos

A equipe do Angular [descobriu](https://mhevery.github.io/perf-tests/DOM-megamorphic.html) que chamar acessores nativos (ou seja, acessores de propriedade DOM) diretamente por meio de suas respectivas funções `get` era significativamente mais lento no Chrome do que o acesso de propriedade [monomórfico](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching) ou até [megamórfico](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching). Isso se deve ao caminho lento no V8 para chamadas em acessores DOM via [`Function#call()`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Function/call), em vez do caminho rápido que já existia para acessos de propriedades.

![](/_img/v8-release-74/native-accessor-performance.svg)

Conseguimos melhorar o desempenho ao chamar acessores nativos, tornando-o significativamente mais rápido do que o acesso a propriedades megamórficas. Para mais informações, veja [V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820).

### Desempenho do analisador

No Chrome, scripts grandes o suficiente são analisados em "streaming" em threads de trabalho enquanto estão sendo baixados. Nesta versão, identificamos e corrigimos um problema de desempenho com a decodificação UTF-8 personalizada usada pelo fluxo de origem, resultando em uma análise em streaming 8% mais rápida, em média.

Encontramos um problema adicional no preparador do V8, que geralmente é executado em um thread de trabalho: nomes de propriedades estavam sendo desduplicados desnecessariamente. Remover essa desduplicação melhorou o analisador em streaming em mais 10,5%. Isso também melhora o tempo de análise no thread principal de scripts que não são transmitidos, como pequenos scripts e scripts inline.

![Cada queda no gráfico acima representa uma das melhorias de desempenho no analisador de streaming.](/_img/v8-release-74/parser-performance.jpg)

## Memória

### Descarte de bytecode

O bytecode compilado a partir da fonte JavaScript ocupa uma parte significativa do espaço do heap do V8, tipicamente cerca de 15%, incluindo metadados relacionados. Existem muitas funções que são executadas apenas durante a inicialização ou raramente usadas após terem sido compiladas.

Para reduzir o overhead de memória do V8, implementamos suporte para descartar bytecodes compilados de funções durante a coleta de lixo, caso não tenham sido executados recentemente. Para habilitar isso, rastreamos a idade do bytecode de uma função, incrementando a idade durante coletas de lixo, e redefinindo-a para zero quando a função é executada. Qualquer bytecode que cruzar um limiar de idade será elegível para ser coletado na próxima coleta de lixo, e a função será reconfigurada para recompilar seu bytecode de forma preguiçosa caso seja executada novamente no futuro.

Nossos experimentos com descarte de bytecode mostram que ele proporciona uma economia significativa de memória para os usuários do Chrome, reduzindo a quantidade de memória no heap do V8 em cerca de 5–15%, sem prejudicar o desempenho ou aumentar significativamente o tempo de CPU gasto na compilação de código JavaScript.

![](/_img/v8-release-74/bytecode-flushing.svg)

### Eliminação de blocos básicos de bytecode mortos

O compilador de bytecode Ignition tenta evitar gerar código que sabe ser morto, por exemplo, código após uma instrução `return` ou `break`:

```js
return;
deadCall(); // ignorado
```

No entanto, anteriormente isso era feito oportunisticamente para instruções que terminam na lista de instruções, então não levava em conta outras otimizações, como atalhos de condições que são conhecidas por serem verdadeiras:

```js
if (2.2) return;
deadCall(); // não ignorado
```

Tentamos resolver isso no V8 v7.3, mas ainda em nível de instrução, o que não funcionaria quando o fluxo de controle se tornava mais complexo, por exemplo:

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // não ignorado
```

O `deadCall()` acima estaria no início de um novo bloco básico, que em nível de instrução seria acessível como um alvo para instruções `break` no laço.

No V8 v7.4, permitimos que blocos básicos inteiros se tornem mortos, se nenhum bytecode de `Jump` (o principal primitivo de controle de fluxo do Ignition) se referir a eles. No exemplo acima, o `break` não é emitido, o que significa que o laço não tem instruções `break`. Assim, o bloco básico que começa com `deadCall()` não tem saltos que o referenciem e, portanto, também é considerado morto. Embora não esperamos um impacto significativo no código do usuário, isso é particularmente útil para simplificar várias desestruturações, como geradores, `for-of` e `try-catch`, e, em particular, remove uma classe de bugs onde blocos básicos poderiam “ressuscitar” instruções complexas no meio de sua implementação.

## Recursos da linguagem JavaScript

### Campos privados de classes

O V8 v7.2 adicionou suporte para a sintaxe de campos públicos de classes. Os campos de classes simplificam a sintaxe de classes ao evitar a necessidade de funções construtoras apenas para definir propriedades de instâncias. A partir do V8 v7.4, você pode marcar um campo como privado ao adicioná-lo com um prefixo `#`.

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('Obtendo o valor atual!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Ao contrário dos campos públicos, os campos privados não são acessíveis fora do corpo da classe:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

Para mais informações, leia nosso [artigo explicativo sobre campos públicos e privados de classes](/features/class-fields).

### `Intl.Locale`

Os aplicativos JavaScript geralmente usam strings como `'en-US'` ou `'de-CH'` para identificar locais. `Intl.Locale` oferece um mecanismo mais poderoso para lidar com locais, permitindo extrair facilmente preferências específicas do local, como o idioma, o calendário, o sistema numérico, o ciclo de horas e assim por diante.

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### Gramática do Hashbang

Os programas JavaScript agora podem começar com `#!`, um chamado [hashbang](https://github.com/tc39/proposal-hashbang). O resto da linha que segue o hashbang é tratado como um comentário de linha única. Isso corresponde ao uso de fato em hosts de linha de comando JavaScript, como Node.js. O seguinte agora é um programa JavaScript sintaticamente válido:

```js
#!/usr/bin/env node
console.log(42);
```

## API do V8

Por favor, use `git log branch-heads/7.3..branch-heads/7.4 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 7.4 -t branch-heads/7.4` para experimentar os novos recursos no V8 v7.4. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
