---
title: &apos;Descontinuando postagens de blog de lançamento&apos;
author: &apos;Shu-yu Guo ([@shu_](https://twitter.com/_shu))&apos;
avatars:
 - &apos;shu-yu-guo&apos;
date: 2022-06-17
tags:
 - lançamento
description: &apos;V8 descontinuará postagens de blog de lançamento em favor do cronograma de lançamento do Chrome e postagens de blog sobre recursos.&apos;
tweet: &apos;1537857497825824768&apos;
---

Historicamente, houve uma postagem no blog para cada novo ramo de lançamento do V8. Você pode ter notado que não houve uma postagem de blog de lançamento desde o v9.9. A partir do v10.0, estamos descontinuando as postagens de blog de lançamento para cada novo ramo. Mas não se preocupe, todas as informações que você estava acostumado a receber através das postagens de blog de lançamento ainda estão disponíveis! Continue lendo para ver onde encontrar essas informações daqui para frente.

<!--truncate-->
## Cronograma de lançamentos e versão atual

Você estava lendo as postagens de blog de lançamento para determinar a versão mais atual do V8?

O V8 segue o cronograma de lançamento do Chrome. Para a versão mais estável e atual do V8, consulte o [roteiro de lançamento do Chrome](https://chromestatus.com/roadmap).

A cada quatro semanas, criamos um novo ramo do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do ramo principal do Git do V8 imediatamente antes de uma etapa Beta do Chrome. Esses ramos estão em beta e se tornam versões em coordenação com o [roteiro de lançamento do Chrome](https://chromestatus.com/roadmap).

Para encontrar um ramo específico do V8 para uma versão do Chrome:

1. Pegue a versão do Chrome e divida por 10 para obter a versão do V8. Por exemplo, o Chrome 102 é o V8 10.2.
1. Para um número de versão X.Y, seu ramo pode ser encontrado no URL do seguinte formato:

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

Por exemplo, o ramo 10.2 pode ser encontrado em https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2.

Para mais informações sobre números de versão e ramos, veja [nosso artigo detalhado](https://v8.dev/docs/version-numbers).

Para uma versão do V8 X.Y, desenvolvedores com uma cópia ativa do V8 podem usar `git checkout -b X.Y -t branch-heads/X.Y` para experimentar os novos recursos dessa versão.

## Novos recursos de JavaScript ou WebAssembly

Você estava lendo as postagens de blog de lançamento para descobrir quais novos recursos de JavaScript ou WebAssembly foram implementados por trás de uma flag ou ativados por padrão?

Consulte o [roteiro de lançamento do Chrome](https://chromestatus.com/roadmap), que lista novos recursos e seus marcos para cada lançamento.

Observe que [os artigos separados e detalhados sobre recursos](/features) podem ser publicados antes ou depois de o recurso ter sido implementado no V8.

## Melhorias notáveis de desempenho

Você estava lendo as postagens de blog de lançamento para saber sobre melhorias notáveis de desempenho?

No futuro, escreveremos postagens de blog independentes para melhorias de desempenho que desejamos destacar, como fizemos no passado para melhorias como o [Sparkplug](https://v8.dev/blog/sparkplug).

## Mudanças na API

Você estava lendo as postagens de blog de lançamento para saber sobre mudanças na API?

Para ver a lista de commits que modificaram a API do V8 entre uma versão anterior A.B e uma versão posterior X.Y, use `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h` em uma cópia ativa do V8.
