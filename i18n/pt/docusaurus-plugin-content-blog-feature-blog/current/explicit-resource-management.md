---
title: "O Novo Superpoder do JavaScript: Gerenciamento Explícito de Recursos"
author: "Rezvan Mahdavi Hezaveh"
avatars: 
  - "rezvan-mahdavi-hezaveh"
date: 2025-05-09
tags: 
  - ECMAScript
description: "A proposta de Gerenciamento Explícito de Recursos capacita os desenvolvedores a gerenciar explicitamente o ciclo de vida dos recursos."
tweet: ""
---

A proposta de *Gerenciamento Explícito de Recursos* introduz uma abordagem determinística para gerenciar explicitamente o ciclo de vida de recursos como manipuladores de arquivos, conexões de rede e mais. Esta proposta traz as seguintes adições à linguagem: as declarações `using` e `await using`, que chamam automaticamente o método dispose quando um recurso sai do escopo; os símbolos `[Symbol.dispose]()` e `[Symbol.asyncDispose]()` para operações de limpeza; dois novos objetos globais `DisposableStack` e `AsyncDisposableStack` como contêineres para agregar recursos descartáveis; e `SuppressedError` como um novo tipo de erro (contém tanto o erro que foi lançado mais recentemente, quanto o erro que foi suprimido) para lidar com o cenário onde um erro ocorre durante o descarte de um recurso, potencialmente mascarando um erro existente lançado pelo corpo ou pelo descarte de outro recurso. Essas adições permitem que os desenvolvedores escrevam códigos mais robustos, performáticos e mantíveis, fornecendo controle granular sobre o descarte de recursos.

<!--truncate-->
## Declarações `using` e `await using`

O núcleo da proposta de Gerenciamento Explícito de Recursos está nas declarações `using` e `await using`. A declaração `using` é projetada para recursos síncronos, garantindo que o método `[Symbol.dispose]()` de um recurso descartável seja chamado quando o escopo em que ele foi declarado finalizar. Para recursos assíncronos, a declaração `await using` funciona de forma semelhante, mas garante que o método `[Symbol.asyncDispose]()` seja chamado e o resultado dessa chamada seja aguardado, permitindo operações de limpeza assíncronas. Essa distinção permite que os desenvolvedores gerenciem de forma confiável recursos síncronos e assíncronos, prevenindo vazamentos e melhorando a qualidade geral do código. As palavras-chave `using` e `await using` podem ser usadas dentro de chaves `{}` (como blocos, loops for e corpos de função), e não podem ser usadas em níveis superiores.

Por exemplo, ao trabalhar com [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader), é crucial chamar `reader.releaseLock()` para desbloquear o fluxo e permitir que ele seja usado em outro lugar. No entanto, o tratamento de erros introduz um problema comum: se ocorrer um erro durante o processo de leitura e você esquecer de chamar `releaseLock()` antes que o erro se propague, o fluxo permanecerá bloqueado. Vamos começar com um exemplo simples:

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // Só busca se ainda não tivermos uma promessa
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const processedData = await processData(response);

    // Faz algo com processedData
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Processa os dados e salva o resultado em processedData
            ...
            // Um erro é lançado aqui!
        }
    }
    
    // Como o erro é lançado antes desta linha, o fluxo permanece bloqueado.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Portanto, é crucial para os desenvolvedores utilizarem o bloco `try...finally` ao usar fluxos e colocarem `reader.releaseLock()` em `finally`. Esse padrão garante que `reader.releaseLock()` seja sempre chamado.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // Processa os dados e salva o resultado em processedData
                ...
                // Um erro é lançado aqui!
            }
        }
    } finally {
        // O bloqueio do leitor no fluxo será sempre liberado.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Uma alternativa para escrever este código é criar um objeto descartável `readerResource`, que contém o leitor (`response.body.getReader()`) e o método `[Symbol.dispose]()` que chama `this.reader.releaseLock()`. A declaração `using` garante que `readerResource[Symbol.dispose]()` seja chamado quando o bloco de código for encerrado, e lembrar de chamar `releaseLock` não é mais necessário porque a declaração `using` cuida disso. A integração de `[Symbol.dispose]` e `[Symbol.asyncDispose]` em APIs web como streams pode acontecer no futuro, para que os desenvolvedores não precisem escrever o objeto wrapper manualmente.

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // Envolva o leitor em um recurso descartável
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Processar os dados e salvar o resultado em processedData
            ...
            // Um erro é lançado aqui!
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() é chamado automaticamente.

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` e `AsyncDisposableStack`

Para facilitar ainda mais o gerenciamento de vários recursos descartáveis, a proposta introduz `DisposableStack` e `AsyncDisposableStack`. Essas estruturas baseadas em pilha permitem que os desenvolvedores agrupem e descartem vários recursos de maneira coordenada. Recursos são adicionados à pilha e, quando a pilha é descartada, de forma síncrona ou assíncrona, os recursos são descartados na ordem inversa em que foram adicionados, garantindo que quaisquer dependências entre eles sejam tratadas corretamente. Isso simplifica o processo de limpeza ao lidar com cenários complexos que envolvem vários recursos relacionados. Ambas as estruturas fornecem métodos como `use()`, `adopt()` e `defer()` para adicionar recursos ou ações de descarte, e um método `dispose()` ou `asyncDispose()` para acionar a limpeza. `DisposableStack` e `AsyncDisposableStack` têm `[Symbol.dispose]()` e `[Symbol.asyncDispose]()`, respectivamente, para que possam ser usados com as palavras-chave `using` e `await using`. Eles oferecem uma maneira robusta de gerenciar o descarte de vários recursos dentro de um escopo definido.

Vamos analisar cada método e ver um exemplo:

`use(value)` adiciona um recurso ao topo da pilha.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Bloqueio do leitor liberado.');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Bloqueio do leitor liberado.
```

`adopt(value, onDispose)` adiciona um recurso não descartável e uma função de callback de descarte ao topo da pilha.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Bloqueio do leitor liberado.');
      });
}
// Bloqueio do leitor liberado.
```

`defer(onDispose)` adiciona uma função de callback de descarte ao topo da pilha. É útil para adicionar ações de limpeza que não têm um recurso associado.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("feito."));
}
// feito.
```

`move()` move todos os recursos atualmente nesta pilha para uma nova `DisposableStack`. Isso pode ser útil se você precisar transferir a propriedade de recursos para outra parte do seu código.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Bloqueio do leitor liberado.');
      });
    using newStack = stack.move();
}
// Aqui apenas a newStack existe e o recurso dentro dela será descartado.
// Bloqueio do leitor liberado.
```

`dispose()` em DisposableStack e `disposeAsync()` em AsyncDisposableStack descartam os recursos dentro deste objeto.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Bloqueio do leitor liberado.');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Bloqueio do leitor liberado.
```

## Disponibilidade

O Gerenciamento Explícito de Recursos está disponível no Chromium 134 e V8 v13.8.

## Suporte ao Gerenciamento Explícito de Recursos

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="não https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="não"
                 babel="sim https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
