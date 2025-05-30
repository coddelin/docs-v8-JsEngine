---
title: "Lançamento do V8 v6.8"
author: "a equipe do V8"
date: "2018-06-21 13:33:37"
tags: 
  - lançamento
description: "O V8 v6.8 apresenta consumo de memória reduzido e várias melhorias de desempenho."
tweet: "1009753739060826112"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é derivada do repositório Git mestre do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nosso mais novo branch, [V8 versão 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8), que está em beta até seu lançamento em conjunto com o Chrome 68 Stable dentro de algumas semanas. O V8 v6.8 está repleto de recursos que beneficiam os desenvolvedores. Este post oferece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Memória

Funções JavaScript mantinham desnecessariamente vivas as funções externas e seus metadados (conhecidos como `SharedFunctionInfo` ou `SFI`). Especialmente em códigos intensivos em funções que dependem de IIFEs de curta duração, isso poderia levar a vazamentos de memória. Antes dessa mudança, um `Context` ativo (ou seja, uma representação na pilha de ativação de uma função) mantinha o `SFI` vivo da função que criou o contexto:

![](/_img/v8-release-68/context-jsfunction-before.svg)

Ao permitir que o `Context` aponte para um objeto `ScopeInfo`, que contém as informações mínimas necessárias para depuração, podemos quebrar a dependência do `SFI`.

![](/_img/v8-release-68/context-jsfunction-after.svg)

Já observamos melhorias de 3% na memória do V8 em dispositivos móveis em um conjunto das 10 principais páginas.

Paralelamente, reduzimos o consumo de memória dos próprios `SFI`s, removendo campos desnecessários ou comprimindo-os sempre que possível, e diminuímos seu tamanho em ~25%, com mais reduções previstas em versões futuras. Observamos que os `SFI`s ocupam de 2% a 6% da memória do V8 em sites típicos, mesmo após serem desconectados do contexto, portanto, você deve notar melhorias de memória em códigos com um grande número de funções.

## Desempenho

### Melhorias no desembrulhamento de arrays

O compilador otimizador não gerava código ideal para desembrulhamento de arrays. Por exemplo, trocar variáveis usando `[a, b] = [b, a]` costumava ser duas vezes mais lento que `const tmp = a; a = b; b = tmp`. Após desbloquear a análise de escape para eliminar todas as alocações temporárias, o desembrulhamento de arrays com um array temporário é tão rápido quanto uma sequência de atribuições.

### Melhorias em `Object.assign`

Até agora `Object.assign` tinha um caminho rápido implementado em C++. Isso significava que a fronteira entre JavaScript e C++ tinha que ser cruzada para cada chamada de `Object.assign`. Uma maneira óbvia de melhorar o desempenho embutido era implementar um caminho rápido no lado do JavaScript. Tínhamos duas opções: implementá-lo como um recurso embutido em JS nativo (o que viria com alguma sobrecarga desnecessária nesse caso) ou implementá-lo [usando a tecnologia CodeStubAssembler](/blog/csa) (que oferece mais flexibilidade). Optamos pela última solução. A nova implementação de `Object.assign` melhora a pontuação de [Speedometer2/React-Redux em cerca de 15%, aumentando a pontuação total do Speedometer 2 em 1,5%](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590).

### Melhorias em `TypedArray.prototype.sort`

`TypedArray.prototype.sort` possui dois caminhos: um caminho rápido, usado quando o usuário não fornece uma função de comparação, e um caminho lento para todos os outros casos. Até agora, o caminho lento reutilizava a implementação de `Array.prototype.sort`, que fazia muito mais do que era necessário para ordenar `TypedArray`s. O V8 v6.8 substitui o caminho lento por uma implementação no [CodeStubAssembler](/blog/csa). (Não diretamente CodeStubAssembler, mas uma linguagem específica de domínio construída sobre CodeStubAssembler).

O desempenho para ordenar `TypedArray`s sem uma função de comparação permanece o mesmo, enquanto há um aumento de até 2,5× na velocidade ao ordenar usando uma função de comparação.

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

No V8 v6.8 você pode começar a usar [verificação de limites baseada em traps](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit) em plataformas Linux x64. Essa otimização de gerenciamento de memória melhora consideravelmente a velocidade de execução do WebAssembly. Já está sendo utilizado no Chrome 68, e no futuro mais plataformas serão suportadas gradualmente.

## API V8

Por favor, use `git log branch-heads/6.7..branch-heads/6.8 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.8 -t branch-heads/6.8` para experimentar os novos recursos no V8 v6.8. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
