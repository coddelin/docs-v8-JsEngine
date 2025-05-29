---
title: "Lançamento do V8 v9.6"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-10-13
tags:
 - lançamento
description: "O V8 v9.6 traz suporte para Tipos de Referência no WebAssembly."
tweet: "1448262079476076548"
---
A cada quatro semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6), que está em beta até o lançamento em coordenação com o Chrome 96 Stable em algumas semanas. O V8 v9.6 está repleto de diversos recursos voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques na antecipação do lançamento.

<!--truncate-->
## WebAssembly

### Tipos de Referência

A [proposta de Tipos de Referência](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md), lançada no V8 v9.6, permite o uso de referências externas do JavaScript de forma opaca em módulos WebAssembly. O tipo de dados `externref` (anteriormente conhecido como `anyref`) fornece uma maneira segura de manter uma referência a um objeto JavaScript e está totalmente integrado ao coletor de lixo do V8.

Poucas ferramentas que já possuem suporte opcional para tipos de referência são [wasm-bindgen para Rust](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) e [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options).

## API do V8

Use `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h` para obter uma lista das mudanças na API.

Desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 9.6 -t branch-heads/9.6` para experimentar os novos recursos do V8 v9.6. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
