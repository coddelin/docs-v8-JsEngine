---
title: 'Desativando temporariamente a análise de escape'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)), analista de escape de sandbox'
avatars:
  - 'mathias-bynens'
date: 2017-09-22 13:33:37
tags:
  - segurança
description: 'Desativamos a análise de escape do V8 no Chrome 61 para proteger os usuários contra uma vulnerabilidade de segurança.'
tweet: '911339802884284416'
---
Em JavaScript, um objeto alocado _escapa_ se ele for acessível fora da função atual. Normalmente, o V8 aloca novos objetos no heap do JavaScript, mas utilizando _análise de escape_, um compilador de otimização pode determinar quando um objeto pode ser tratado de forma especial porque seu tempo de vida está comprovadamente vinculado à ativação da função. Quando a referência a um objeto recém-alocado não escapa da função que o cria, os engines de JavaScript não precisam alocar explicitamente esse objeto no heap. Eles podem, em vez disso, tratar efetivamente os valores do objeto como variáveis locais da função. Isso, por sua vez, permite todos os tipos de otimizações, como armazenar esses valores na pilha ou em registradores, ou, em alguns casos, otimizar os valores completamente. Objetos que escapam (mais precisamente, objetos que não podem ser comprovadamente não escapantes) precisam ser alocados no heap.

<!--truncate-->
Por exemplo, a análise de escape permite que o V8 reescreva efetivamente o seguinte código:

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // Nota: `object` não escapa.
}
```

…neste código, que possibilita diversas otimizações nos bastidores:

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

As versões do V8 até a v6.1 utilizavam uma implementação de análise de escape que era complexa e gerava vários bugs desde sua introdução. Essa implementação foi removida e uma nova base de código de análise de escape está disponível no [V8 v6.2](/blog/v8-release-62).

No entanto, [uma vulnerabilidade de segurança no Chrome](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html) envolvendo a antiga implementação de análise de escape no V8 v6.1 foi descoberta e divulgada de forma responsável para nós. Para proteger nossos usuários, desativamos a análise de escape no Chrome 61. O Node.js não deve ser afetado, pois a exploração depende da execução de JavaScript não confiável.

Desativar a análise de escape impacta negativamente o desempenho, pois desativa as otimizações mencionadas anteriormente. Especificamente, os seguintes recursos do ES2015 podem sofrer lentidões temporárias:

- desestruturação
- iteração com `for`-`of`
- espalhamento de array
- parâmetros rest

Observe que a desativação da análise de escape é apenas uma medida temporária. Com o Chrome 62, lançaremos a nova implementação da análise de escape — e o mais importante, habilitada — conforme visto no V8 v6.2.
