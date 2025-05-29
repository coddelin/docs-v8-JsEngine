---
title: 'Lançamento do V8 v6.7'
author: 'a equipe do V8'
date: 2018-05-04 13:33:37
tags:
  - lançamento
tweet: '992506342391742465'
description: 'O V8 v6.7 adiciona mais mitigações de código não confiável e suporta BigInt.'
---
A cada seis semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](/docs/release-process). Cada versão é ramificada a partir do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nosso mais novo branch, [V8 versão 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7), que está em beta até seu lançamento em coordenação com o Chrome 67 estável em algumas semanas. O V8 v6.7 está cheio de novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## Recursos da linguagem JavaScript

O V8 v6.7 traz suporte ao BigInt habilitado por padrão. BigInts são um novo primitivo numérico no JavaScript que pode representar inteiros com precisão arbitrária. Leia [nosso explicador sobre o recurso BigInt](/features/bigint) para mais informações sobre como usar BigInts no JavaScript e confira [nossa explicação detalhada sobre a implementação no V8](/blog/bigint).

## Mitigações de código não confiável

No V8 v6.7, implementamos [mais mitigações para vulnerabilidades de canal lateral](/docs/untrusted-code-mitigations) para evitar vazamentos de informações para códigos JavaScript e WebAssembly não confiáveis.

## API do V8

Por favor, use `git log branch-heads/6.6..branch-heads/6.7 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 6.7 -t branch-heads/6.7` para experimentar os novos recursos do V8 v6.7. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
