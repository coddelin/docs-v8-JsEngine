---
title: "Declarações de importação"
author: "Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), importador assertivo de declarações de importação"
avatars: 
  - "dan-clark"
date: 2021-06-15
tags: 
  - ECMAScript
description: "As declarações de importação permitem que instruções de importação de módulos incluam informações adicionais junto ao especificador do módulo"
tweet: ""
---

O novo recurso de [declarações de importação](https://github.com/tc39/proposal-import-assertions) permite que instruções de importação de módulos incluam informações adicionais junto ao especificador do módulo. Um uso inicial para o recurso é permitir que documentos JSON sejam importados como [módulos JSON](https://github.com/tc39/proposal-json-modules):

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from './foo.json' assert { type: 'json' };
console.log(json.answer); // 42
```

## Contexto: Módulos JSON e tipo MIME

Uma pergunta natural é por que um módulo JSON não poderia simplesmente ser importado assim:

```javascript
import json from './foo.json';
```

A plataforma web verifica o tipo MIME de um recurso de módulo para validade antes de executá-lo, e em teoria esse tipo MIME também poderia ser usado para determinar se o recurso deve ser tratado como um módulo JSON ou como um módulo JavaScript.

No entanto, há um [problema de segurança](https://github.com/w3c/webcomponents/issues/839) com confiar apenas no tipo MIME.

Os módulos podem ser importados entre origens, e um desenvolvedor pode querer importar um módulo JSON de uma fonte de terceiros. Isso pode parecer basicamente seguro, mesmo de terceiros não confiáveis, desde que o JSON seja devidamente sanitizado, pois importar JSON não executa script.

No entanto, scripts de terceiros podem de fato ser executados nesse cenário porque o servidor de terceiros pode inesperadamente responder com um tipo MIME JavaScript e uma carga maliciosa de JavaScript, executando código no domínio do importador.

```javascript
// Executa JS se evil.com responder com um
// tipo MIME de JavaScript (por exemplo, `text/javascript`)!
import data from 'https://evil.com/data.json';
```

As extensões de arquivo não podem ser usadas para determinar o tipo do módulo porque [não são um indicador confiável do tipo de conteúdo na web](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md). Em vez disso, usamos declarações de importação para indicar o tipo esperado do módulo e evitar essa armadilha de escalonamento de privilégios.

Quando um desenvolvedor quer importar um módulo JSON, ele deve usar uma declaração de importação para especificar que deve ser JSON. A importação falhará se o tipo MIME recebido da rede não corresponder ao tipo esperado:

```javascript
// Falha se evil.com responder com um tipo MIME que não seja JSON.
import data from 'https://evil.com/data.json' assert { type: 'json' };
```

## `import()` dinâmico

As declarações de importação também podem ser passadas para [`import()` dinâmico](https://v8.dev/features/dynamic-import#dynamic) com um novo segundo parâmetro:

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import('./foo.json', {
  assert: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

O conteúdo JSON é a exportação padrão do módulo, então ele é referenciado através da propriedade `default` no objeto retornado de `import()`.

## Conclusão

Atualmente, o único uso especificado de declarações de importação é para especificar o tipo de módulo. No entanto, o recurso foi projetado para permitir pares arbitrários de chave/valor nas declarações, então usos adicionais podem ser adicionados no futuro, caso seja útil restringir importações de módulos de outras maneiras.

Enquanto isso, módulos JSON com a nova sintaxe de declarações de importação estão disponíveis por padrão no Chromium 91. [Scripts de módulo CSS](https://chromestatus.com/feature/5948572598009856) também estão chegando em breve, usando a mesma sintaxe de declaração do tipo de módulo.

## Suporte a declarações de importação

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/babel/babel/pull/12139"></feature-support>
