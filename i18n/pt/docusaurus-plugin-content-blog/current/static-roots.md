---
title: "Raízes Estáticas: Objetos com Endereços Constantes em Tempo de Compilação"
author: "Olivier Flückiger"
avatars:
  - olivier-flueckiger
date: 2024-02-05
tags:
  - JavaScript
description: "Raízes Estáticas tornam os endereços de certos objetos JS constantes em tempo de compilação."
tweet: ""
---

Você já se perguntou de onde vêm `undefined`, `true` e outros objetos principais do JavaScript? Esses objetos são os átomos de qualquer objeto definido por usuário e precisam estar presentes primeiro. O V8 os chama de raízes imutáveis e imovíveis e eles vivem em seu próprio heap – o heap somente leitura. Como eles são usados constantemente, o acesso rápido é crucial. E o que poderia ser mais rápido do que adivinhar corretamente seu endereço de memória em tempo de compilação?

<!--truncate-->
Como exemplo, considere a função de API extremamente comum `IsUndefined` [API function](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-value.h?q=symbol:%5Cbv8::Value::IsUndefined%5Cb%20case:yes). Em vez de precisar procurar o endereço do objeto `undefined` para referência, se pudéssemos simplesmente verificar se um ponteiro de objeto termina, digamos, em `0x61` para saber se é indefinido. Isso é exatamente o que o recurso *raízes estáticas* do V8 realiza. Este post explora os obstáculos que tivemos que superar para chegar lá. O recurso foi introduzido no Chrome 111 e trouxe benefícios de desempenho para toda a VM, especialmente acelerando o código C++ e funções integradas.

## Inicialização do Heap Somente Leitura

Criar os objetos somente leitura leva algum tempo, então o V8 os cria em tempo de compilação. Para compilar o V8, primeiro um binário proto-V8 mínimo chamado `mksnapshot` é compilado. Ele cria todos os objetos compartilhados somente leitura, bem como o código nativo de funções integradas, e os escreve em um snapshot. Então, o binário real do V8 é compilado e incorporado ao snapshot. Para iniciar o V8, o snapshot é carregado na memória e podemos imediatamente começar a usar seu conteúdo. O diagrama a seguir mostra o processo de compilação simplificado para o binário independente `d8`.

![](/_img/static-roots/static-roots1.svg)

Uma vez que `d8` está em execução, todos os objetos somente leitura têm seu lugar fixo na memória e nunca se movem. Quando compilamos código JIT, podemos, por exemplo, referir-nos diretamente ao `undefined` pelo seu endereço. Contudo, ao construir o snapshot e ao compilar o C++ para libv8, o endereço ainda não é conhecido. Ele depende de duas coisas desconhecidas em tempo de formação. Primeiro, o layout binário do heap somente leitura e, segundo, onde no espaço de memória esse heap somente leitura está localizado.

## Como Prever Endereços?

O V8 usa [compressão de ponteiros](https://v8.dev/blog/pointer-compression). Em vez de endereços de 64 bits completos, nos referimos a objetos por um deslocamento de 32 bits em uma região de memória de 4GB. Para muitas operações, como carregamentos de propriedades ou comparações, o deslocamento de 32 bits dentro dessa área é tudo que é necessário para identificar exclusivamente um objeto. Portanto, nosso segundo problema — não saber onde, no espaço de memória, está localizado o heap somente leitura — não é realmente um problema. Nós simplesmente posicionamos o heap somente leitura no início de cada área de compressão de ponteiro, atribuindo-lhe um local conhecido. Por exemplo, de todos os objetos no heap do V8, `undefined` sempre tem o menor endereço compactado, começando em 0x61 bytes. É assim que sabemos que se os 32 bits inferiores do endereço completo de qualquer objeto JS forem 0x61, então, ele deve ser `undefined`.

Isso já é útil, mas queremos poder usar esse endereço no snapshot e no libv8 – um problema aparentemente circular. Contudo, se garantirmos que `mksnapshot` cria deterministicamente um heap somente leitura idêntico, então podemos reutilizar esses endereços em diferentes compilações. Para usá-los no próprio libv8, basicamente construímos o V8 duas vezes:

![](/_img/static-roots/static-roots2.svg)

Na primeira vez em que chamamos `mksnapshot`, o único artefato produzido é um arquivo que contém os [endereços](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/roots/static-roots.h) relativos à base da área de cada objeto no heap somente leitura. Na segunda etapa da compilação, compilamos libv8 novamente e uma flag garante que sempre que nos referirmos ao `undefined`, usamos literalmente `cage_base + StaticRoot::kUndefined`; o deslocamento estático de `undefined`, é claro, sendo definido no arquivo static-roots.h. Em muitos casos, isso permitirá que o compilador C++ criando libv8 e o compilador de funções integradas em `mksnapshot` gerem código muito mais eficiente, já que a alternativa é sempre carregar o endereço de um array global de objetos raízes. Acabamos com um binário `d8` onde o endereço compacto de `undefined` é codificado de forma rígida para ser `0x61`.

Bom, moralmente é assim que tudo funciona, mas na prática só construímos o V8 uma vez – ninguém tem tempo para isso. O arquivo static-roots.h gerado é armazenado em cache no repositório de código fonte e só precisa ser recriado se alterarmos o layout do heap somente leitura.

## Aplicações Adicionais

Falando de questões práticas, raízes estáticas permitem ainda mais otimizações. Por exemplo, desde então, agrupamos objetos comuns juntos, permitindo-nos implementar algumas operações como verificações de intervalo sobre seus endereços. Por exemplo, todos os mapas de strings (ou seja, os objetos meta [hidden-class](https://v8.dev/docs/hidden-classes) que descrevem o layout de diferentes tipos de strings) estão próximos uns dos outros, portanto um objeto é uma string se seu mapa tem um endereço comprimido entre `0xdd` e `0x49d`. Ou, objetos verdadeiros devem ter um endereço que seja no mínimo `0xc1`.

Nem tudo diz respeito ao desempenho do código JITed no V8. Como este projeto mostrou, uma mudança relativamente pequena no código C++ pode ter um impacto significativo também. Por exemplo, o Speedometer 2, um benchmark que exercita a API V8 e a interação entre o V8 e seu incorporador, ganhou cerca de 1% na pontuação em uma CPU M1 graças às raízes estáticas.
