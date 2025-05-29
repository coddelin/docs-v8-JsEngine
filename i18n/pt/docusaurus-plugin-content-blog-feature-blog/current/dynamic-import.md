---
title: "Importação Dinâmica `import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-11-21
tags: 
  - ECMAScript
  - ES2020
description: "O `import()` dinâmico desbloqueia novas capacidades em comparação com a importação estática. Este artigo compara os dois e oferece uma visão geral do que há de novo."
tweet: "932914724060254208"
---
[Importação Dinâmica `import()`](https://github.com/tc39/proposal-dynamic-import) introduz uma nova forma semelhante a uma função de `import` que desbloqueia novas capacidades em comparação com a importação estática. Este artigo compara os dois e oferece uma visão geral do que há de novo.

<!--truncate-->
## Importação estática `import` (recapitulação)

O Chrome 61 foi lançado com suporte para a instrução `import` do ES2015 dentro de [módulos](/features/modules).

Considere o seguinte módulo, localizado em `./utils.mjs`:

```js
// Exportação padrão
export default () => {
  console.log('Olá da exportação padrão!');
};

// Exportação nomeada `doStuff`
export const doStuff = () => {
  console.log('Fazendo coisas…');
};
```

Aqui está como importar e usar o módulo `./utils.mjs` estaticamente:

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → registra 'Olá da exportação padrão!'
  module.doStuff();
  // → registra 'Fazendo coisas…'
</script>
```

:::note
**Nota:** O exemplo anterior usa a extensão `.mjs` para sinalizar que é um módulo em vez de um script regular. Na Web, extensões de arquivo não importam muito, desde que os arquivos sejam servidos com o tipo MIME correto (por exemplo, `text/javascript` para arquivos JavaScript) no cabeçalho HTTP `Content-Type`.

A extensão `.mjs` é especialmente útil em outras plataformas como [Node.js](https://nodejs.org/api/esm.html#esm_enabling) e [`d8`](/docs/d8), onde não há conceito de tipos MIME ou outros ganchos obrigatórios como `type="module"` para determinar se algo é um módulo ou um script comum. Estamos usando a mesma extensão aqui para consistência entre plataformas e para distinguir claramente entre módulos e scripts comuns.
:::

Essa forma sintática para importar módulos é uma declaração *estática*: ela só aceita um literal de string como especificador de módulo e introduz vinculações no escopo local via um processo de "ligação" pré-runtime. A sintaxe de `import` estática só pode ser usada no nível superior do arquivo.

`import` estático permite casos de uso importantes, como análise estática, ferramentas de empacotamento e eliminação de código morto (tree-shaking).

Em alguns casos, é útil:

- importar um módulo sob demanda (ou condicionalmente)
- calcular o especificador do módulo em tempo de execução
- importar um módulo dentro de um script comum (em vez de um módulo)

Nenhuma dessas opções é possível com a `import` estática.

## `import()` Dinâmico 🔥

[`import()` Dinâmico](https://github.com/tc39/proposal-dynamic-import) introduz uma nova forma semelhante a uma função de `import` que atende a esses casos de uso. `import(moduleSpecifier)` retorna uma promessa para o objeto de namespace do módulo solicitado, que é criado após o carregamento, a instanciação e a avaliação de todas as dependências do módulo, bem como do próprio módulo.

Aqui está como importar e usar o módulo `./utils.mjs` dinamicamente:

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → registra 'Olá da exportação padrão!'
      module.doStuff();
      // → registra 'Fazendo coisas…'
    });
</script>
```

Como `import()` retorna uma promessa, é possível usar `async`/`await` em vez do estilo de callback baseado em `then`:

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → registra 'Olá da exportação padrão!'
    module.doStuff();
    // → registra 'Fazendo coisas…'
  })();
</script>
```

:::note
**Nota:** Embora `import()` _pareça_ uma chamada de função, ele é especificado como *sintaxe* que por acaso usa parênteses (semelhante ao [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)). Isso significa que `import` não herda de `Function.prototype`, então você não pode usá-lo com `call` ou `apply`, e coisas como `const importAlias = import` não funcionam — aliás, `import` nem é um objeto! Porém, isso não faz diferença prática.
:::

Aqui está um exemplo de como o `import()` dinâmico permite carregar módulos sob demanda ao navegar em uma pequena aplicação de página única:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>Minha biblioteca</title>
<nav>
  <a href="books.html" data-entry-module="books">Livros</a>
  <a href="movies.html" data-entry-module="movies">Filmes</a>
  <a href="video-games.html" data-entry-module="video-games">Video Games</a>
</nav>
<main>Este é um espaço reservado para o conteúdo que será carregado sob demanda.</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // O módulo exporta uma função chamada `loadPageInto`.
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

As capacidades de carregamento dinâmico habilitadas pelo `import()` dinâmico podem ser bastante poderosas quando aplicadas corretamente. Para fins de demonstração, [Addy](https://twitter.com/addyosmani) modificou [um exemplo de PWA do Hacker News](https://hnpwa-vanilla.firebaseapp.com/) que importava todos os seus dependentes estaticamente, incluindo comentários, na primeira carga. [A versão atualizada](https://dynamic-import.firebaseapp.com/) usa o `import()` dinâmico para carregar os comentários de maneira preguiçosa, evitando o custo de carregamento, análise e compilação até que o usuário realmente precise deles.

:::note
**Nota:** Se seu aplicativo importa scripts de outro domínio (seja estaticamente ou dinamicamente), os scripts precisam ser retornados com cabeçalhos CORS válidos (como `Access-Control-Allow-Origin: *`). Isso ocorre porque, ao contrário dos scripts regulares, os scripts de módulos (e suas importações) são buscados com CORS.
:::

## Recomendações

`import` estático e `import()` dinâmico são ambos úteis. Cada um tem seus próprios casos de uso muito distintos. Use `import`s estáticos para dependências de pintura inicial, especialmente para conteúdo acima da dobra. Em outros casos, considere carregar dependências sob demanda com `import()` dinâmico.

## Suporte a `import()` dinâmico

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
