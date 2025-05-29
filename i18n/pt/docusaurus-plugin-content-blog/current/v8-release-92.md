---
title: "Lançamento do V8 v9.2"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-07-16
tags:
 - release
description: "O lançamento do V8 v9.2 traz um método `at` para indexação relativa e melhorias na compressão de ponteiros."
tweet: ""
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2), que está em beta até seu lançamento em coordenação com o Chrome 92 Stable nas próximas semanas. O V8 v9.2 está repleto de recursos interessantes voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques na expectativa do lançamento.

<!--truncate-->
## JavaScript

### Método `at`

O novo método `at` agora está disponível para Arrays, TypedArrays e Strings. Quando passado um valor negativo, ele realiza a indexação relativa a partir do final do indexável. Quando passado um valor positivo, ele se comporta identicamente ao acesso a propriedades. Por exemplo, `[1,2,3].at(-1)` é `3`. Veja mais no [nosso explicativo](https://v8.dev/features/at-method).

## Cage de Compressão de Ponteiros Compartilhada

O V8 suporta [compressão de ponteiros](https://v8.dev/blog/pointer-compression) em plataformas de 64 bits, incluindo x64 e arm64. Isso é alcançado dividindo um ponteiro de 64 bits em duas metades. Os 32 bits superiores podem ser vistos como uma base enquanto os 32 bits inferiores podem ser considerados como um índice nessa base.

```
            |----- 32 bits -----|----- 32 bits -----|
Ponteiro:   |________base_______|_______índice_______|
```

Atualmente, um Isolate realiza todas as alocações no heap do GC dentro de uma "cage" de memória virtual de 4GB, o que garante que todos os ponteiros tenham o mesmo endereço base de 32 bits superior. Com o endereço base mantido constante, ponteiros de 64 bits podem ser passados usando apenas o índice de 32 bits, já que o ponteiro completo pode ser reconstruído.

Com o v9.2, o padrão foi alterado de forma que todos os Isolates dentro de um processo compartilhem o mesmo cage de memória virtual de 4GB. Isso foi feito em antecipação à prototipagem de recursos experimentais de memória compartilhada no JS. Com cada thread de trabalhador tendo seu próprio Isolate e, portanto, sua própria cage de memória virtual de 4GB, os ponteiros não poderiam ser passados entre Isolates com uma cage por Isolate, já que eles não compartilhavam o mesmo endereço base. Essa mudança tem o benefício adicional de reduzir a pressão de memória virtual ao iniciar threads de trabalhadores.

O tradeoff dessa mudança é que o tamanho total do heap do V8 em todas as threads de um processo é limitado a um máximo de 4GB. Essa limitação pode ser indesejável para cargas de trabalho de servidores que criam muitas threads por processo, pois isso fará com que a memória virtual acabe mais rapidamente do que antes. Integradores podem desativar o compartilhamento da cage de compressão de ponteiros com o argumento GN `v8_enable_pointer_compression_shared_cage = false`.

## API do V8

Use `git log branch-heads/9.1..branch-heads/9.2 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 9.2 -t branch-heads/9.2` para experimentar os novos recursos no V8 v9.2. Alternativamente, você pode [se inscrever no canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
