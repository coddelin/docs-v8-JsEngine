---
title: "Acelerando as expressões regulares do V8"
author: "Jakob Gruber, Engenheiro de Software Regular"
avatars: 
  - "jakob-gruber"
date: "2017-01-10 13:33:37"
tags: 
  - internos
  - RegExp
description: "Recentemente, o V8 migrou as funções integradas de RegExp de uma implementação de JavaScript autônoma para uma nova arquitetura de geração de código baseada no TurboFan."
---
Este post no blog aborda a recente migração das funções integradas de RegExp do V8 de uma implementação de JavaScript autônoma para uma que se conecta diretamente à nossa nova arquitetura de geração de código baseada no [TurboFan](/blog/v8-release-56).

<!--truncate-->
A implementação de RegExp do V8 é baseada no [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html), amplamente considerada uma das engines de RegExp mais rápidas. Embora a engine em si encapsule a lógica de baixo nível para realizar correspondências de padrões com strings, funções no protótipo de RegExp, como [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), realizam o trabalho adicional necessário para expor sua funcionalidade ao usuário.

Historicamente, vários componentes do V8 foram implementados em JavaScript. Até recentemente, o `regexp.js` era um deles, hospedando a implementação do construtor de RegExp, todas as suas propriedades, bem como as propriedades do seu protótipo.

Infelizmente, essa abordagem tem desvantagens, incluindo desempenho imprevisível e transições caras para o runtime C++ para funcionalidades de baixo nível. A recente adição de subclasses integradas no ES6 (permitindo que os desenvolvedores de JavaScript forneçam sua própria implementação personalizada de RegExp) resultou em uma penalidade de desempenho adicional para o RegExp, mesmo que o integrado de RegExp não seja subclassificado. Essas regressões não puderam ser completamente abordadas na implementação de JavaScript autônoma.

Portanto, decidimos migrar a implementação de RegExp do JavaScript. No entanto, preservar o desempenho acabou sendo mais difícil do que o esperado. Uma migração inicial para uma implementação totalmente em C++ foi significativamente mais lenta, alcançando apenas cerca de 70% do desempenho da implementação original. Após alguma investigação, encontramos várias causas:

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) contém algumas áreas extremamente sensíveis ao desempenho, principalmente incluindo a transição para a engine de RegExp subjacente e a construção do resultado de RegExp com suas chamadas associadas de substring. Para isso, a implementação de JavaScript dependia de fragmentos de código altamente otimizados chamados “stubs”, escritos em linguagem de montagem nativa ou se conectando diretamente ao pipeline do compilador otimizador. Não é possível acessar esses stubs de C++, e seus equivalentes de runtime são significativamente mais lentos.
- Os acessos às propriedades, como o `lastIndex` de RegExp, podem ser caros, possivelmente exigindo buscas por nome e percorrendo a cadeia de protótipos. O compilador otimizador do V8 muitas vezes pode substituir automaticamente esses acessos por operações mais eficientes, enquanto esses casos precisariam ser tratados explicitamente em C++.
- Em C++, referências a objetos de JavaScript devem ser envolvidas em chamados `Handles` para cooperar com a coleta de lixo. A gestão de Handles produz mais sobrecarga em comparação com a implementação pura em JavaScript.

Nosso novo design para a migração de RegExp é baseado no [CodeStubAssembler](/blog/csa), um mecanismo que permite aos desenvolvedores do V8 escrever código independente de plataforma que será posteriormente traduzido em código rápido e específico para plataforma pelo mesmo backend que também é usado para o novo compilador otimizador TurboFan. Usar o CodeStubAssembler nos permite abordar todas as deficiências da implementação inicial em C++. Stubs (como o ponto de entrada na engine de RegExp) podem ser facilmente chamados a partir do CodeStubAssembler. Embora acessos rápidos a propriedades ainda precisem ser implementados explicitamente em caminhos rápidos, esses acessos são extremamente eficientes no CodeStubAssembler. Handles simplesmente não existem fora do C++. E, como a implementação agora opera em um nível muito baixo, podemos tomar atalhos adicionais, como pular construções de resultados caros quando não são necessários.

Os resultados têm sido muito positivos. Nossa pontuação em [uma carga de trabalho substancial de RegExp](https://github.com/chromium/octane/blob/master/regexp.js) melhorou em 15%, recuperando amplamente as perdas recentes de desempenho relacionadas ao subclassing. Microbenchmarks (Figura 1) mostram melhorias em todos os aspectos, de 7% para [`RegExp.prototype.exec`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), até 102% para [`RegExp.prototype[@@split]`](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split).

![Figura 1: Aceleração do RegExp dividida por função](/_img/speeding-up-regular-expressions/perf.png)

Então, como você, como desenvolvedor JavaScript, pode garantir que seus RegExps sejam rápidos? Se você não está interessado em se aprofundar nos internos de RegExp, certifique-se de que nem a instância RegExp, nem seu protótipo sejam modificados para obter o melhor desempenho:

```js
const re = /./g;
re.exec('');  // Caminho rápido.
re.new_property = 'lento';
RegExp.prototype.new_property = 'também lento';
re.exec('');  // Caminho lento.
```

Embora o subclassing de RegExp possa ser bastante útil às vezes, esteja ciente de que instâncias subclassificadas de RegExp exigem um tratamento mais genérico e, portanto, seguem o caminho lento:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec('');  // Caminho lento.
```

A migração completa de RegExp estará disponível no V8 v5.7.
