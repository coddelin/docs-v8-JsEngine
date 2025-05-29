---
title: "Anunciando o Benchmark de Ferramentas Web"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), Equilibrista de Performance em JavaScript"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - benchmarks
  - Node.js
description: "O novíssimo Benchmark de Ferramentas Web ajuda a identificar e corrigir gargalos de desempenho do V8 em Babel, TypeScript e outros projetos do mundo real."
tweet: "927572065598824448"
---
O desempenho do JavaScript sempre foi importante para a equipe do V8, e neste post gostaríamos de discutir um novo [Benchmark de Ferramentas Web](https://v8.github.io/web-tooling-benchmark) que temos usado recentemente para identificar e corrigir alguns gargalos de desempenho no V8. Você já pode estar ciente do [forte compromisso do V8 com o Node.js](/blog/v8-nodejs), e este benchmark estende esse compromisso ao executar testes de desempenho especificamente baseados em ferramentas comuns de desenvolvedores construídas sobre Node.js. As ferramentas no Benchmark de Ferramentas Web são as mesmas usadas por desenvolvedores e designers hoje para criar sites modernos e aplicativos baseados em nuvem. Continuando nossos esforços contínuos para focar no [desempenho do mundo real](/blog/real-world-performance/) em vez de benchmarks artificiais, criamos o benchmark usando código real que os desenvolvedores executam diariamente.

<!--truncate-->
A suíte do Benchmark de Ferramentas Web foi projetada desde o início para cobrir casos de uso importantes de [ferramentas de desenvolvedor](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling) para Node.js. Como a equipe do V8 se concentra no desempenho central do JavaScript, construímos o benchmark de uma maneira que se concentra nas cargas de trabalho do JavaScript, excluindo a medição de interações externas ou específicas de I/O do Node.js. Isso torna possível executar o benchmark no Node.js, em todos os navegadores e em todos os shells principais de mecanismos JavaScript, incluindo `ch` (ChakraCore), `d8` (V8), `jsc` (JavaScriptCore) e `jsshell` (SpiderMonkey). Mesmo que o benchmark não seja limitado ao Node.js, estamos empolgados que o [grupo de trabalho de benchmarking do Node.js](https://github.com/nodejs/benchmarking) está considerando usar o benchmark de ferramentas como um padrão para o desempenho do Node ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

Os testes individuais no benchmark de ferramentas abrangem uma variedade de ferramentas que os desenvolvedores comumente usam para construir aplicativos baseados em JavaScript, por exemplo:

- O transpiler [Babel](https://github.com/babel/babel) usando o preset `es2015`.
- O parser usado pelo Babel — chamado [Babylon](https://github.com/babel/babylon) — executando em várias entradas populares (incluindo os pacotes do [lodash](https://lodash.com/) e [Preact](https://github.com/developit/preact)).
- O parser [acorn](https://github.com/ternjs/acorn) usado pelo [webpack](http://webpack.js.org/).
- O compilador [TypeScript](http://www.typescriptlang.org/) executando no projeto de exemplo [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) do projeto [TodoMVC](https://github.com/tastejs/todomvc).

Consulte a [análise detalhada](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md) para detalhes sobre todos os testes incluídos.

Com base na experiência passada com outros benchmarks como [Speedometer](http://browserbench.org/Speedometer), onde os testes rapidamente se tornam desatualizados à medida que novas versões de frameworks se tornam disponíveis, garantimos que é simples atualizar cada uma das ferramentas nos benchmarks para versões mais recentes conforme elas são lançadas. Ao basear a suíte de benchmarks na infraestrutura do npm, podemos facilmente atualizá-la para garantir que está sempre testando o estado da arte em ferramentas de desenvolvimento JavaScript. Atualizar um caso de teste é apenas uma questão de aumentar a versão no manifesto `package.json`.

Criamos um [bug de rastreamento](http://crbug.com/v8/6936) e uma [planilha](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw) para conter todas as informações relevantes que coletamos sobre o desempenho do V8 no novo benchmark até agora. Nossas investigações já produziram alguns resultados interessantes. Por exemplo, descobrimos que o V8 frequentemente seguia o caminho lento para `instanceof` ([v8:6971](http://crbug.com/v8/6971)), incorrendo em um desaceleramento de 3–4×. Também encontramos e corrigimos gargalos de desempenho em certos casos de atribuições de propriedades no formato `obj[name] = val`, onde `obj` era criado via `Object.create(null)`. Nesses casos, o V8 saía do caminho rápido, apesar de poder utilizar o fato de que `obj` tem um protótipo `null` ([v8:6985](http://crbug.com/v8/6985)). Essas e outras descobertas feitas com a ajuda deste benchmark melhoram o V8, não apenas no Node.js, mas também no Chrome.

Não apenas trabalhamos para tornar o V8 mais rápido, mas também corrigimos e upstreamamos bugs de desempenho nas ferramentas e bibliotecas do benchmark sempre que os encontramos. Por exemplo, descobrimos vários bugs de desempenho no [Babel](https://github.com/babel/babel) onde padrões de código como

```js
value = items[items.length - 1];
```

levavam a acessos da propriedade `"-1"`, porque o código não verificava se `items` estava vazio anteriormente. Esse padrão de código faz com que o V8 use um caminho lento devido à busca por `"-1"`, mesmo que uma versão ligeiramente modificada e equivalente do JavaScript seja muito mais rápida. Ajudamos a corrigir esses problemas no Babel ([babel/babel#6582](https://github.com/babel/babel/pull/6582), [babel/babel#6581](https://github.com/babel/babel/pull/6581) e [babel/babel#6580](https://github.com/babel/babel/pull/6580)). Também descobrimos e corrigimos um bug onde o Babel acessararia além do comprimento de uma string ([babel/babel#6589](https://github.com/babel/babel/pull/6589)), o que acionava outro caminho lento no V8. Além disso, [otimizamos leituras fora dos limites de arrays e strings](https://twitter.com/bmeurer/status/926357262318305280) no V8. Estamos ansiosos para continuar [trabalhando com a comunidade](https://twitter.com/rauchg/status/924349334346276864) na melhoria do desempenho desse caso de uso importante, não somente quando executado sobre o V8, mas também quando executado em outros motores JavaScript como ChakraCore.

Nosso foco intenso no desempenho do mundo real e, especialmente, na melhoria de cargas de trabalho populares do Node.js é demonstrado pelas constantes melhorias na pontuação do benchmark do V8 nas últimas versões:

![](/_img/web-tooling-benchmark/chart.svg)

Desde o V8 v5.8, que é a última versão do V8 antes de [migrar para a arquitetura Ignition+TurboFan](/blog/launching-ignition-and-turbofan), a pontuação do V8 no benchmark de ferramentas melhorou cerca de **60%**.

Nos últimos anos, a equipe do V8 reconheceu que nenhum benchmark único de JavaScript — mesmo bem-intencionado e cuidadosamente elaborado — deve ser usado como um único representante do desempenho geral de um motor de JavaScript. No entanto, acreditamos que o novo **Web Tooling Benchmark** destaca áreas do desempenho de JavaScript que merecem atenção. Apesar do nome e da motivação inicial, descobrimos que a suíte Web Tooling Benchmark não é apenas representativa de cargas de trabalho de ferramentas, mas também de uma ampla gama de aplicativos JavaScript mais sofisticados que não são bem testados por benchmarks focados em front-end, como Speedometer. De forma alguma é um substituto para o Speedometer, mas sim um conjunto de testes complementar.

A melhor notícia de todas é que, dado como o Web Tooling Benchmark é construído em torno de cargas de trabalho reais, esperamos que nossas melhorias recentes nas pontuações do benchmark se traduzam diretamente em aumento de produtividade para os desenvolvedores através de [menos tempo esperando as coisas serem construídas](https://xkcd.com/303/). Muitas dessas melhorias já estão disponíveis no Node.js: no momento da escrita, o Node 8 LTS está no V8 v6.1 e o Node 9 está no V8 v6.2.

A versão mais recente do benchmark está hospedada em [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/).
