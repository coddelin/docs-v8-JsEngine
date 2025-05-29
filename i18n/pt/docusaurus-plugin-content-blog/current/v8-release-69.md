---
title: 'Lançamento do V8 v6.9'
author: 'a equipe do V8'
date: 2018-08-07 13:33:37
tags:
  - lançamento
description: 'O V8 v6.9 apresenta redução no uso de memória através de funções embutidas, inicialização mais rápida do WebAssembly com o Liftoff, melhor desempenho do DataView e WeakMap, e muito mais!'
tweet: '1026825606003150848'
---
A cada seis semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9), que está em beta até seu lançamento em coordenação com o Chrome 69 Stable nas próximas semanas. O V8 v6.9 está repleto de funcionalidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Redução de memória com funções embutidas

O V8 vem com uma extensa biblioteca de funções embutidas. Os exemplos incluem métodos em objetos embutidos como `Array.prototype.sort` e `RegExp.prototype.exec`, mas também uma ampla gama de funcionalidades internas. Como sua geração leva muito tempo, as funções embutidas são compiladas no momento da compilação e serializadas em uma [imagem de inicialização](/blog/custom-startup-snapshots), que é posteriormente desserializada em tempo de execução para criar o estado inicial do heap do JavaScript.

As funções embutidas atualmente consomem 700 KB em cada Isolate (um Isolate corresponde aproximadamente a uma aba do navegador no Chrome). Isso é bastante desperdício, e no ano passado começamos a trabalhar para reduzir esse overhead. No V8 v6.4, lançamos a [desserialização preguiçosa](/blog/lazy-deserialization), garantindo que cada Isolate só pagasse pelas funções embutidas que realmente precisasse (mas cada Isolate ainda tinha sua própria cópia).

As [funções embutidas](/blog/embedded-builtins) vão um passo além. Uma função embutida é compartilhada por todos os Isolates e incluída no próprio binário em vez de ser copiada para o heap do JavaScript. Isso significa que as funções embutidas existem na memória apenas uma vez, independentemente de quantos Isolates estão em execução, uma propriedade particularmente útil agora que a [Isolação de Sites](https://developers.google.com/web/updates/2018/07/site-isolation) foi ativada por padrão. Com as funções embutidas, observamos uma redução mediana de _9% do tamanho do heap do V8_ nos top 10 mil sites no x64. Desses sites, 50% economizam pelo menos 1,2 MB, 30% economizam pelo menos 2,1 MB, e 10% economizam 3,7 MB ou mais.

O V8 v6.9 é fornecido com suporte para funções embutidas em plataformas x64. Outras plataformas seguirão em lançamentos futuros. Para mais detalhes, veja nosso [post dedicado no blog](/blog/embedded-builtins).

## Desempenho

### Liftoff, o novo compilador de primeiro nível do WebAssembly

O WebAssembly ganhou um novo compilador básico para inicialização muito mais rápida de sites complexos com grandes módulos WebAssembly (como Google Earth e AutoCAD). Dependendo do hardware, estamos observando acelerações superiores a 10×. Para mais detalhes, consulte [o post detalhado sobre o Liftoff](/blog/liftoff).

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logotipo do Liftoff, o compilador básico do V8 para WebAssembly</figcaption>
</figure>

### Operações mais rápidas do `DataView`

Os métodos do [`DataView`](https://tc39.es/ecma262/#sec-dataview-objects) foram reimplementados no V8 Torque, o que evita uma chamada custosa para C++ em comparação com a implementação anterior em runtime. Além disso, agora integramos chamadas aos métodos do `DataView` ao compilar código JavaScript no TurboFan, resultando em um desempenho ainda melhor em código quente. Usar `DataView`s agora é tão eficiente quanto usar `TypedArray`s, tornando finalmente os `DataView`s uma escolha viável em situações críticas de desempenho. Abordaremos isso em mais detalhes em um próximo post no blog sobre `DataView`s, então fique atento!

### Processamento mais rápido de `WeakMap`s durante a coleta de lixo

O V8 v6.9 reduz os tempos de pausa da coleta de lixo Mark-Compact melhorando o processamento de `WeakMap`s. A marcação concorrente e incremental agora é capaz de processar `WeakMap`s, enquanto anteriormente todo esse trabalho era realizado na pausa atômica final do Mark-Compact GC. Como nem todo o trabalho pode ser movido para fora da pausa, o GC agora também realiza mais trabalho em paralelo para reduzir ainda mais os tempos de pausa. Essas otimizações essencialmente reduziram pela metade o tempo médio de pausa para GCs Mark-Compact no [Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark).

`WeakMap` processa usando um algoritmo de iteração de ponto fixo que pode degradar para um comportamento de tempo de execução quadrático em certos casos. Com o novo lançamento, o V8 agora pode mudar para outro algoritmo que é garantido para terminar em tempo linear se o GC não terminar dentro de um certo número de iterações. Anteriormente, exemplos de pior caso podiam ser construídos que levavam o GC alguns segundos para concluir, mesmo com um heap relativamente pequeno, enquanto o algoritmo linear termina em poucos milissegundos.

## Recursos da linguagem JavaScript

O V8 v6.9 suporta [`Array.prototype.flat` e `Array.prototype.flatMap`](/features/array-flat-flatmap).

`Array.prototype.flat` achata um array dado recursivamente até a profundidade especificada, que por padrão é `1`:

```js
// Achatar um nível:
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// Achatar recursivamente até que o array não contenha mais arrays aninhados:
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` funciona como `Array.prototype.map`, mas achata o resultado em um novo array.

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

Para mais detalhes, veja [nossa explicação sobre `Array.prototype.{flat,flatMap}`](/features/array-flat-flatmap).

## API do V8

Por favor, use `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.9 -t branch-heads/6.9` para experimentar os novos recursos do V8 v6.9. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
