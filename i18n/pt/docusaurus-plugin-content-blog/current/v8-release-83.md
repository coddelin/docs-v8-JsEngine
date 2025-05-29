---
title: 'Lançamento do V8 v8.3'
author: '[Victor Gomes](https://twitter.com/VictorBFG), trabalhando em segurança de casa'
avatars:
 - 'victor-gomes'
date: 2020-05-04
tags:
 - lançamento
description: 'O V8 v8.3 apresenta ArrayBuffers mais rápidos, memórias Wasm maiores e APIs obsoletas.'
tweet: '1257333120115847171'
---

A cada seis semanas, criamos uma nova branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada a partir do Git mestre do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nossa nova branch, [V8 versão 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3), que está em beta até seu lançamento em coordenação com o Chrome 83 Stable nas próximas semanas. O V8 v8.3 está repleto de todos os tipos de novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Performance

### Rastreamento mais rápido de `ArrayBuffer` no coletor de lixo

Os armazenamentos de suporte de `ArrayBuffer`s são alocados fora do heap do V8 usando `ArrayBuffer::Allocator` fornecido pelo embedder. Esses armazenamentos de suporte precisam ser liberados quando seu objeto `ArrayBuffer` é recuperado pelo coletor de lixo. O V8 v8.3 possui um novo mecanismo para rastrear `ArrayBuffer`s e seus armazenamentos de suporte que permite ao coletor de lixo iterar e liberar o armazenamento de suporte simultaneamente com a aplicação. Mais detalhes estão disponíveis neste [documento de design](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e). Isso reduziu o tempo total de pausa do GC em cargas de trabalho intensivas de `ArrayBuffer` em 50%.

### Memórias Wasm maiores

De acordo com uma atualização na [especificação do WebAssembly](https://webassembly.github.io/spec/js-api/index.html#limits), o V8 v8.3 agora permite que módulos solicitem memórias de até 4GB, permitindo casos de uso mais intensivos em memória em plataformas alimentadas pelo V8. Por favor, tenha em mente que essa quantidade de memória pode nem sempre estar disponível no sistema do usuário; recomendamos criar memórias em tamanhos menores, aumentá-las conforme necessário e lidar graciosamente com falhas ao tentar expandi-las.

## Correções

### Armazenamento em objetos com arrays tipados na cadeia de protótipos

De acordo com a especificação do JavaScript, ao armazenar um valor na chave especificada, precisamos procurar na cadeia de protótipos para ver se a chave já existe no protótipo. Na maioria das vezes, essas chaves não existem na cadeia de protótipos, e o V8 instala manipuladores de busca rápida para evitar essas buscas na cadeia de protótipos quando é seguro fazê-lo.

No entanto, recentemente identificamos um cenário particular onde o V8 instalou incorretamente esse manipulador de busca rápida, levando a um comportamento incorreto. Quando `TypedArray`s estão na cadeia de protótipos, todos os armazenamentos de chaves que estão fora dos limites (OOB) do `TypedArray` devem ser ignorados. Por exemplo, no caso abaixo, `v[2]` não deveria adicionar uma propriedade a `v` e as leituras subsequentes deveriam retornar undefined.

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // Deve retornar undefined
```

Os manipuladores de busca rápida do V8 não lidavam com esse caso, e no exemplo acima retornaríamos `123`. O V8 v8.3 corrige esse problema ao não usar manipuladores de busca rápida quando `TypedArray`s estão na cadeia de protótipos. Considerando que este não é um caso comum, não observamos nenhuma regressão de performance em nossos benchmarks.

## API do V8

### APIs experimentais de WeakRefs e FinalizationRegistry obsoletas

As seguintes APIs experimentais relacionadas a WeakRefs estão obsoletas:

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry` (renomeado de `FinalizationGroup`) é parte da [proposta de referências fracas do JavaScript](https://v8.dev/features/weak-references) e fornece uma maneira para programadores JavaScript registrarem finalizadores. Essas APIs serviam para que o embedder agendasse e executasse tarefas de limpeza do `FinalizationRegistry` onde os finalizadores registrados são invocados; elas estão obsoletas porque não são mais necessárias. As tarefas de limpeza do `FinalizationRegistry` são agora agendadas automaticamente pelo V8 usando o executor de tarefas em primeiro plano fornecido pela `v8::Platform` do embedder e não requerem nenhum código adicional do embedder.

### Outras alterações na API

Por favor, use `git log branch-heads/8.1..branch-heads/8.3 include/v8.h` para obter uma lista das alterações na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 8.3 -t branch-heads/8.3` para experimentar os novos recursos do V8 v8.3. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
