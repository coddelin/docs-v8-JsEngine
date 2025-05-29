---
title: "Lançamento do V8 v9.4"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-06
tags:
 - lançamento
description: "O lançamento do V8 v9.4 traz blocos de inicialização estática de classes para o JavaScript."
tweet: "1434915404418277381"
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é ramificada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nosso mais novo branch, [V8 versão 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4), que está em beta até seu lançamento em coordenação com o Chrome 94 Stable em algumas semanas. O V8 v9.4 está cheio de várias melhorias voltadas para desenvolvedores. Esta postagem fornece uma prévia de alguns dos destaques na antecipação do lançamento.

<!--truncate-->
## JavaScript

### Blocos de inicialização estática de classes

Classes agora podem agrupar código que deve ser executado uma vez por avaliação da classe através de blocos de inicialização estática.

```javascript
class C {
  // Este bloco será executado quando a própria classe for avaliada
  static { console.log("Bloco estático de C"); }
}
```

A partir da versão 9.4, os blocos de inicialização estática de classes estarão disponíveis sem a necessidade da flag `--harmony-class-static-blocks`. Para todos os detalhes semânticos sobre o escopo desses blocos, consulte [nosso explicador](https://v8.dev/features/class-static-initializer-blocks).

## API do V8

Por favor, use `git log branch-heads/9.3..branch-heads/9.4 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com uma cópia ativa do V8 podem usar `git checkout -b 9.4 -t branch-heads/9.4` para experimentar os novos recursos no V8 v9.4. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos você mesmo em breve.
