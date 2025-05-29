---
title: "Lançamento do V8 v6.2"
author: "a equipe V8"
date: 2017-09-11 13:33:37
tags:
  - lançamento
description: "O V8 v6.2 inclui melhorias de desempenho, mais recursos para a linguagem JavaScript, um aumento no comprimento máximo de string e muito mais."
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de uma etapa de Beta do Chrome. Hoje estamos satisfeitos em anunciar nosso mais novo branch, [V8 versão 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2), que está na versão beta até seu lançamento em coordenação com o Chrome 62 Stable em algumas semanas. O V8 v6.2 está repleto de vários recursos voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Melhorias no desempenho

O desempenho do [`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) já havia sido identificado anteriormente como um possível gargalo, já que é frequentemente utilizado por bibliotecas populares como [lodash](https://lodash.com/) e [underscore.js](http://underscorejs.org/), e frameworks como [AngularJS](https://angularjs.org/). Diversas funções auxiliares como [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) ou [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) são frequentemente utilizadas em códigos de aplicativos e bibliotecas para realizar verificações de tipo em tempo de execução.

Com o advento do ES2015, o `Object#toString` tornou-se personalizável via o novo símbolo [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag), o que também tornou o `Object#toString` mais pesado e mais desafiador de acelerar. Nesta versão, portamos uma otimização inicialmente implementada no [motor de JavaScript SpiderMonkey](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) para o V8, aumentando o throughput do `Object#toString` por um fator de **6.5×**.

![](/_img/v8-release-62/perf.svg)

Isso também impacta o benchmark Speedometer do navegador, especificamente o subteste AngularJS, onde medimos uma melhoria de 3%. Leia o [post detalhado no blog](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) para informações adicionais.

![](/_img/v8-release-62/speedometer.svg)

Também melhoramos significativamente o desempenho de [proxies ES2015](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), acelerando a chamada de um objeto proxy via `someProxy(params)` ou `new SomeOtherProxy(params)` em até **5×**:

![](/_img/v8-release-62/proxy-call-construct.svg)

De forma semelhante, o desempenho de acessar uma propriedade em um objeto proxy via `someProxy.property` melhorou em quase **6.5×**:

![](/_img/v8-release-62/proxy-property.svg)

Isso faz parte de um estágio em andamento. Fique atento para um post detalhado no blog e resultados finais.

Também estamos empolgados em anunciar que, graças às [contribuições](https://chromium-review.googlesource.com/c/v8/v8/+/620150) de [Peter Wong](https://twitter.com/peterwmwong), o desempenho da função embutida [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) melhorou em mais de **3×** desde o lançamento anterior.

Consultas de hashcode para tabelas de hash internas ficaram muito mais rápidas, resultando em melhoria de desempenho para `Map`, `Set`, `WeakMap` e `WeakSet`. Um post futuro no blog explicará essa otimização em detalhe.

![](/_img/v8-release-62/hashcode-lookups.png)

O coletor de lixo agora usa um [Scavenger Paralelo](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) para coletar a chamada geração jovem do heap.

## Modo de baixa memória aprimorado

Ao longo dos últimos lançamentos, o modo de baixa memória do V8 foi aprimorado (por exemplo, ao [definir o tamanho inicial do semi-espaço para 512 KB](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). Dispositivos com pouca memória agora sofrem menos situações de falta de memória. No entanto, esse comportamento de baixa memória pode ter um impacto negativo no desempenho em tempo de execução.

## Mais recursos para expressões regulares

O suporte para [modo `dotAll`](https://github.com/tc39/proposal-regexp-dotall-flag) em expressões regulares, habilitado pelo sinalizador `s`, agora está habilitado por padrão. No modo `dotAll`, o átomo `.` em expressões regulares corresponde a qualquer caractere, incluindo os terminadores de linha.

```js
/foo.bar/su.test('foo\nbar'); // true
```

[Assertivas Lookbehind](https://github.com/tc39/proposal-regexp-lookbehind), outro novo recurso de expressões regulares, agora estão disponíveis por padrão. O nome já descreve muito bem o seu significado. As assertivas Lookbehind oferecem uma maneira de restringir um padrão para combinar apenas se precedido pelo padrão no grupo Lookbehind. Ele vem em versões de correspondência e não-correspondência:

```js
/(?<=\$)\d+/.exec('$1 vale cerca de ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 vale cerca de ¥123'); // ['123']
```

Mais detalhes sobre esses recursos estão disponíveis em nossa postagem no blog intitulada [Recursos futuros das expressões regulares](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

## Revisão de literais de template

A restrição em sequências de escape em literais de template foi afrouxada [de acordo com a proposta relevante](https://tc39.es/proposal-template-literal-revision/). Isso possibilita novos casos de uso para tags de template, como criar um processador LaTeX.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Diversão!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{Rei!}}
Breve sobre o h vai \u{h}ere // Token ilegal!
`;
```

## Aumento no comprimento máximo da string

O comprimento máximo de strings em plataformas de 64 bits aumentou de `2**28 - 16` para `2**30 - 25` caracteres.

## Full-codegen foi removido

No V8 v6.2, as últimas partes principais do pipeline antigo foram removidas. Mais de 30 mil linhas de código foram apagadas nesta versão — uma vitória clara para a redução da complexidade do código.

## API do V8

Confira nosso [resumo de mudanças de API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada lançamento principal.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.2 -t branch-heads/6.2` para experimentar os novos recursos do V8 v6.2. Alternativamente, você pode [inscrever-se no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
