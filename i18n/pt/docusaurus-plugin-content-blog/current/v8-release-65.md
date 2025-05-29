---
title: "Lançamento do V8 v6.5"
author: "a equipe V8"
date: 2018-02-01 13:33:37
tags:
  - lançamento
description: "O V8 v6.5 adiciona suporte para a compilação de WebAssembly por streaming e inclui um novo “modo de código não confiável”."
tweet: "959174292406640640"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é criada a partir do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso novo branch, [V8 versão 6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5), que está em beta até seu lançamento em coordenação com o Chrome 65 Stable em algumas semanas. O V8 v6.5 está cheio de recursos voltados para desenvolvedores. Este post fornece uma prévia de alguns destaques em antecipação ao lançamento.

<!--truncate-->
## Modo de código não confiável

Em resposta ao último ataque especulativo de canal lateral chamado Spectre, o V8 introduziu um [modo de código não confiável](/docs/untrusted-code-mitigations). Se você embutir o V8, considere utilizar este modo caso sua aplicação processe código gerado por usuários e não confiável. Observe que o modo está ativado por padrão, inclusive no Chrome.

## Compilação por streaming para código WebAssembly

A API WebAssembly oferece uma função especial para suportar [compilação por streaming](https://developers.google.com/web/updates/2018/04/loading-wasm) em combinação com a API `fetch()`:

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

Esta API está disponível desde o V8 v6.1 e Chrome 61, embora a implementação inicial não usasse realmente a compilação por streaming. No entanto, com o V8 v6.5 e Chrome 65 aproveitamos esta API e compilamos módulos WebAssembly enquanto ainda estamos baixando os bytes do módulo. Assim que baixamos todos os bytes de uma única função, passamos a função para uma thread em segundo plano para compilá-la.

Nossas medições mostram que, com essa API, a compilação WebAssembly no Chrome 65 pode acompanhar velocidades de download de até 50 Mbit/s em máquinas de alto desempenho. Isso significa que, se você baixar código WebAssembly a 50 Mbit/s, a compilação desse código termina assim que o download terminar.

No gráfico abaixo, medimos o tempo que leva para baixar e compilar um módulo WebAssembly com 67 MB e cerca de 190.000 funções. Fazemos as medições com velocidades de download de 25 Mbit/s, 50 Mbit/s e 100 Mbit/s.

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

Quando o tempo de download é maior que o tempo de compilação do módulo WebAssembly, por exemplo, no gráfico acima com 25 Mbit/s e 50 Mbit/s, a função `WebAssembly.compileStreaming()` termina a compilação quase imediatamente após os últimos bytes serem baixados.

Quando o tempo de download é menor que o tempo de compilação, a função `WebAssembly.compileStreaming()` leva aproximadamente o mesmo tempo que levaria para compilar o módulo WebAssembly sem baixá-lo primeiro.

## Velocidade

Continuamos trabalhando para ampliar o caminho rápido dos builtins do JavaScript em geral, adicionando um mecanismo para detectar e prevenir uma situação prejudicial chamada “loop de desotimização”. Isso ocorre quando seu código otimizado desotimiza e _não há como aprender o que deu errado_. Em tais cenários, o TurboFan continua tentando otimizar, desistindo após cerca de 30 tentativas. Isso aconteceria se você fizesse algo para alterar o formato do array na função de callback de qualquer um dos nossos builtins de array de segunda ordem. Por exemplo, alterar o `length` do array — no V8 v6.5, anotamos quando isso ocorre e paramos de inserir o builtin de array chamado naquele local em futuras tentativas de otimização.

Também ampliamos o caminho rápido inserindo muitos builtins que anteriormente eram excluídos devido a um efeito colateral entre o carregamento da função a ser chamada e a própria chamada, como uma chamada de função. E `String.prototype.indexOf` obteve uma [melhoria de desempenho de 10× nas chamadas de função](https://bugs.chromium.org/p/v8/issues/detail?id=6270).

No V8 v6.4, inserimos suporte para `Array.prototype.forEach`, `Array.prototype.map` e `Array.prototype.filter`. No V8 v6.5 adicionamos suporte à inserção para:

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

Além disso, ampliamos o caminho rápido para todos esses builtins. Antes, desistíamos ao ver arrays com números de ponto flutuante ou (desistíamos ainda mais) [se os arrays tinham “lacunas”](/blog/elements-kinds), por exemplo, `[3, 4.5, , 6]`. Agora, lidamos com arrays lacunados de ponto flutuante em todos os lugares, exceto em `find` e `findIndex`, onde a exigência da especificação para converter lacunas em `undefined` complica nossos esforços (_por enquanto…!_).

A imagem a seguir mostra o delta de melhoria em comparação ao V8 v6.4 em nossos builtins inline, dividido em arrays de inteiros, arrays de números de ponto flutuante e arrays de números de ponto flutuante com buracos. O tempo está em milissegundos.

![Melhorias de desempenho desde V8 v6.4](/_img/v8-release-65/performance-improvements.svg)

## API do V8

Por favor, use `git log branch-heads/6.4..branch-heads/6.5 include/v8.h` para obter uma lista das alterações na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.5 -t branch-heads/6.5` para experimentar os novos recursos no V8 v6.5. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos você mesmo em breve.
