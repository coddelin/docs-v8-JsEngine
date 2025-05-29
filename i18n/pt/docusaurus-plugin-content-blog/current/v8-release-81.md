---
title: "Lançamento do V8 v8.1"
author: "Dominik Inführ, homem internacional(mistério da internacionalização)"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - lançamento
description: "O V8 v8.1 oferece suporte aprimorado à internacionalização por meio da nova API Intl.DisplayNames."
---

A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é originada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje temos o prazer de anunciar nosso mais novo ramo, [V8 versão 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), que está em beta até seu lançamento em coordenação com o Chrome 81 Stable em algumas semanas. O V8 v8.1 está repleto de vários recursos voltados para desenvolvedores. Este post fornece uma prévia de alguns dos destaques em antecipação ao lançamento.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

A nova API `Intl.DisplayNames` permite que os programadores exibam nomes traduzidos de idiomas, regiões, scripts e moedas com facilidade.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → 'Estados Unidos'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Iene Japonês'
```

Transfira hoje mesmo o ônus da manutenção dos dados de tradução para o runtime! Veja [nossa explicação sobre o recurso](https://v8.dev/features/intl-displaynames) para detalhes sobre a API completa e mais exemplos.

## API V8

Use `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` para obter uma lista das mudanças na API.

Desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 8.1 -t branch-heads/8.1` para experimentar os novos recursos no V8 v8.1. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos por conta própria em breve.
