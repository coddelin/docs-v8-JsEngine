---
title: &apos;Lançamento do V8 v9.5&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-09-21
tags:
 - lançamento
description: &apos;O lançamento do V8 v9.5 traz APIs de internacionalização atualizadas e suporte para manipulação de exceções em WebAssembly.&apos;
tweet: &apos;1440296019623759872&apos;
---
A cada quatro semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje, temos o prazer de anunciar nosso mais novo branch, [V8 versão 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5), que está em beta até seu lançamento em coordenação com o Chrome 95 Stable em algumas semanas. O V8 v9.5 está repleto de várias novidades voltadas para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

No v8.1 lançamos a API [`Intl.DisplayNames`](https://v8.dev/features/intl-displaynames) no Chrome 81, com tipos suportados “language” (idioma), “region” (região), “script” (escrita) e “currency” (moeda). Com o v9.5, agora adicionamos dois novos tipos suportados: “calendar” (calendário) e “dateTimeField” (campo de data e hora). Eles retornam os nomes visíveis dos diferentes tipos de calendários e campos de data e hora correspondentes:

```js
const esCalendarNames = new Intl.DisplayNames([&apos;es&apos;], { type: &apos;calendar&apos; });
const frDateTimeFieldNames = new Intl.DisplayNames([&apos;fr&apos;], { type: &apos;dateTimeField&apos; });
esCalendarNames.of(&apos;roc&apos;);  // "calendario de la República de China"
frDateTimeFieldNames.of(&apos;month&apos;); // "mois"
```

Também aprimoramos o suporte para o tipo “language” com uma nova opção languageDisplay, que pode ser “standard” (padrão) ou “dialect” (dialeto) (como valor padrão se não especificado):

```js
const jaDialectLanguageNames = new Intl.DisplayNames([&apos;ja&apos;], { type: &apos;language&apos; });
const jaStandardLanguageNames = new Intl.DisplayNames([&apos;ja&apos;], { type: &apos;language&apos; , languageDisplay: &apos;standard&apos;});
jaDialectLanguageNames.of(&apos;en-US&apos;)  // "アメリカ英語"
jaDialectLanguageNames.of(&apos;en-AU&apos;)  // "オーストラリア英語"
jaDialectLanguageNames.of(&apos;en-GB&apos;)  // "イギリス英語"

jaStandardLanguageNames.of(&apos;en-US&apos;) // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of(&apos;en-AU&apos;) // "英語 (オーストラリア)"
jaStandardLanguageNames.of(&apos;en-GB&apos;) // "英語 (イギリス)"
```

### Opção estendida `timeZoneName`

A `Intl.DateTimeFormat API` no v9.5 agora suporta quatro novos valores para a opção `timeZoneName`:

- “shortGeneric” para exibir o nome do fuso horário em um formato genérico abreviado sem local, como “PT” ou “ET”, sem indicar se está em horário de verão.
- “longGeneric” para exibir o nome do fuso horário em um formato genérico longo sem local, como “Pacific Time” ou “Mountain Time”, sem indicar se está em horário de verão.
- “shortOffset” para exibir o nome do fuso horário no formato GMT local curto, como “GMT-8”.
- “longOffset” para exibir o nome do fuso horário no formato GMT local longo, como “GMT-0800”.

## WebAssembly

### Tratamento de Exceções

O V8 agora suporta a [proposta de Tratamento de Exceções do WebAssembly (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md) para que módulos compilados com uma toolchain compatível (por exemplo, [Emscripten](https://emscripten.org/docs/porting/exceptions.html)) possam ser executados no V8. A proposta foi projetada para manter o overhead baixo em comparação com os workarounds anteriores usando JavaScript.

Por exemplo, compilamos o otimizador [Binaryen](https://github.com/WebAssembly/binaryen/) para WebAssembly com implementações antigas e novas de tratamento de exceções.

Quando o tratamento de exceções está habilitado, o aumento no tamanho do código [cai de cerca de 43% para a implementação antiga baseada em JavaScript para apenas 9% para o novo recurso Wasm EH](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

Quando executamos `wasm-opt.wasm -O3` em alguns arquivos grandes de teste, a versão Wasm EH não mostrou perda de desempenho em comparação com a linha de base sem exceções, enquanto a versão baseada em JavaScript levou cerca de 30% mais tempo.

No entanto, o Binaryen usa verificações de exceções esparsamente. Em cargas de trabalho com muitas exceções, espera-se que a diferença de desempenho seja ainda maior.

## API do V8

O arquivo de cabeçalho principal v8.h foi dividido em várias partes que podem ser incluídas separadamente. Por exemplo, `v8-isolate.h` agora contém a classe `v8::Isolate`. Muitos arquivos de cabeçalho que declaram métodos passando `v8::Local<T>` agora podem importar `v8-forward.h` para obter a definição de `v8::Local` e todos os tipos de objetos de heap do V8.

Por favor, use `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h` para obter uma lista das alterações de API.
