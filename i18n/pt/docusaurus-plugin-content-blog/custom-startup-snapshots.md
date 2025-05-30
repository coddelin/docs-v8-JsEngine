---
title: "Snapshots personalizados de inicialização"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), Engenheiro de Software e fornecedor de pré-aquecedor de motor"
avatars: 
  - "yang-guo"
date: "2015-09-25 13:33:37"
tags: 
  - internos
description: "Embedders do V8 podem utilizar snapshots para pular o tempo de inicialização causado por inicializações de programas JavaScript."
---
A especificação do JavaScript inclui muitas funcionalidades integradas, desde [funções matemáticas](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math) até um [motor de expressões regulares completo](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions). Todo contexto recém-criado do V8 tem essas funções disponíveis desde o início. Para que isso funcione, o objeto global (por exemplo, o objeto window em um navegador) e todas as funcionalidades integradas devem ser configurados e inicializados no heap do V8 no momento em que o contexto é criado. Isso leva um tempo considerável para ser feito do zero.

<!--truncate-->
Felizmente, o V8 usa um atalho para acelerar as coisas: assim como descongelar uma pizza congelada para um jantar rápido, nós desserializamos um snapshot previamente preparado diretamente no heap para obter um contexto inicializado. Em um computador desktop comum, isso pode reduzir o tempo para criar um contexto de 40 ms para menos de 2 ms. Em um telefone celular médio, isso pode significar uma diferença entre 270 ms e 10 ms.

Aplicações diferentes do Chrome que incorporam o V8 podem exigir mais do que o JavaScript padrão. Muitas carregam scripts de biblioteca adicionais na inicialização, antes de o aplicativo “real” ser executado. Por exemplo, uma máquina virtual simples de TypeScript baseada no V8 teria que carregar o compilador de TypeScript na inicialização para traduzir o código-fonte TypeScript em JavaScript em tempo real.

A partir do lançamento do V8 v4.3 há dois meses, embedders podem utilizar a criação de snapshots para pular o tempo de inicialização causado por essas inicializações. O [caso de teste](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661) para esse recurso mostra como essa API funciona.

Para criar um snapshot, podemos chamar `v8::V8::CreateSnapshotDataBlob` com o script a ser incorporado como uma string C terminada em nulo. Após criar um novo contexto, este script é compilado e executado. No nosso exemplo, criamos dois snapshots personalizados de inicialização, cada um dos quais define funções além do que o JavaScript já possui embutido.

Podemos então usar `v8::Isolate::CreateParams` para configurar um isolamento recém-criado de modo que ele inicialize os contextos a partir de um snapshot personalizado de inicialização. Os contextos criados nesse isolamento são cópias exatas do contexto do qual tiramos o snapshot. As funções definidas no snapshot estão disponíveis sem precisar defini-las novamente.

Há uma limitação importante nisso: o snapshot só pode capturar o heap do V8. Qualquer interação do V8 com o exterior é proibida ao criar o snapshot. Tais interações incluem:

- definir e chamar callbacks de API (ou seja, funções criadas via `v8::FunctionTemplate`)
- criar arrays tipados, já que o armazenamento de apoio pode ser alocado fora do V8

E, claro, valores derivados de fontes como `Math.random` ou `Date.now` são fixos uma vez que o snapshot tenha sido capturado. Eles não são mais realmente aleatórios nem refletem o tempo atual.

Apesar das limitações, snapshots de inicialização continuam sendo uma ótima maneira de economizar tempo na inicialização. Podemos economizar 100 ms da inicialização gasto no carregamento do compilador de TypeScript em nosso exemplo acima (em um computador desktop comum). Estamos ansiosos para ver como você pode usar snapshots personalizados!
