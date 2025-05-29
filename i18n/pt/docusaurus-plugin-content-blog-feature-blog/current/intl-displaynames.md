---
title: "`Intl.DisplayNames`"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu)) e Frank Yung-Fong Tang"
avatars: 
  - "shu-yu-guo"
  - "frank-tang"
date: 2020-02-13
tags: 
  - Intl
  - Node.js 14
description: "A API Intl.DisplayNames permite nomes localizados de idiomas, regiões, scripts e moedas."
tweet: "1232333889005334529"
---
Aplicações web que alcançam uma audiência global precisam exibir os nomes de exibição de idiomas, regiões, scripts e moedas em muitos idiomas diferentes. As traduções desses nomes requerem dados, que estão disponíveis no [Unicode CLDR](http://cldr.unicode.org/translation/). Incluir esses dados como parte da aplicação implica em um custo no tempo de desenvolvimento. Os usuários provavelmente preferem traduções consistentes de nomes de idiomas e regiões, e manter esses dados atualizados com os acontecimentos geopolíticos do mundo exige manutenção constante.

<!--truncate-->
Felizmente, a maioria dos tempos de execução JavaScript já têm e mantêm esses mesmos dados de tradução atualizados. A nova API `Intl.DisplayNames` dá aos desenvolvedores JavaScript acesso direto a essas traduções, permitindo que as aplicações exibam nomes localizados mais facilmente.

## Exemplos de uso

O exemplo a seguir mostra como criar um objeto `Intl.DisplayNames` para obter nomes de regiões em inglês usando [códigos de países de 2 letras ISO-3166](https://www.iso.org/iso-3166-country-codes.html).

```js
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
regionNames.of('US');
// → 'United States'
regionNames.of('BA');
// → 'Bosnia & Herzegovina'
regionNames.of('MM');
// → 'Myanmar (Burma)'
```

O exemplo a seguir obtém nomes de idiomas em chinês tradicional usando a [gramática de identificador de idioma Unicode](http://unicode.org/reports/tr35/#Unicode_language_identifier).

```js
const languageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
languageNames.of('fr');
// → '法文'
languageNames.of('zh');
// → '中文'
languageNames.of('de');
// → '德文'
```

O exemplo a seguir obtém nomes de moedas em chinês simplificado usando [códigos de moedas de 3 letras ISO-4217](https://www.iso.org/iso-4217-currency-codes.html). Em idiomas que têm formas singulares e plurais distintas, os nomes das moedas estão no singular. Para formas plurais, [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat) pode ser usado.

```js
const currencyNames = new Intl.DisplayNames(['zh-Hans'], {type: 'currency'});
currencyNames.of('USD');
// → '美元'
currencyNames.of('EUR');
// → '欧元'
currencyNames.of('JPY');
// → '日元'
currencyNames.of('CNY');
// → '人民币'
```

O exemplo a seguir mostra o tipo final suportado, scripts, em inglês, usando [códigos de scripts de 4 letras ISO-15924](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames(['en'], { type: 'script' });
scriptNames.of('Latn');
// → 'Latin'
scriptNames.of('Arab');
// → 'Arabic'
scriptNames.of('Kana');
// → 'Katakana'
```

Para usos mais avançados, o segundo parâmetro `options` também suporta a propriedade `style`. A propriedade `style` corresponde à largura do nome de exibição e pode ser `"long"`, `"short"` ou `"narrow"`. Os valores para diferentes estilos nem sempre diferem. O padrão é `"long"`.

```js
const longLanguageNames = new Intl.DisplayNames(['en'], { type: 'language' });
longLanguageNames.of('en-US');
// → 'American English'
const shortLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'short' });
shortLanguageNames.of('en-US');
// → 'US English'
const narrowLanguageNames = new Intl.DisplayNames(['en'], { type: 'language', style: 'narrow' });
narrowLanguageNames.of('en-US');
// → 'US English'
```

## API Completa

A API completa para `Intl.DisplayNames` é a seguinte.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

O construtor é consistente com outras APIs `Intl`. Seu primeiro argumento é uma [lista de locais](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation), e seu segundo parâmetro é um parâmetro `options` que aceita as propriedades `localeMatcher`, `type` e `style`.

A propriedade `"localeMatcher"` é tratada da mesma forma que em [outras APIs `Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation). A propriedade `type` pode ser `"region"`, `"language"`, `"currency"` ou `"script"`. A propriedade `style` pode ser `"long"`, `"short"` ou `"narrow"`, sendo `"long"` o padrão.

`Intl.DisplayNames.prototype.of( code )` espera os seguintes formatos, dependendo do `type` de como a instância é construída.

- Quando `type` é `"region"`, `code` deve estar no formato de um [código de país de 2 letras ISO-3166](https://www.iso.org/iso-3166-country-codes.html) ou um [código de região de 3 dígitos UN M49](https://unstats.un.org/unsd/methodology/m49/).
- Quando `type` for `"language"`, `code` deve estar conforme a [gramática do identificador de idioma do Unicode](https://unicode.org/reports/tr35/#Unicode_language_identifier).
- Quando `type` for `"currency"`, `code` deve ser um [código de moeda de 3 letras da ISO-4217](https://www.iso.org/iso-4217-currency-codes.html).
- Quando `type` for `"script"`, `code` deve ser um [código de script de 4 letras da ISO-15924](https://unicode.org/iso15924/iso15924-codes.html).

## Conclusão

Como outras APIs `Intl`, à medida que `Intl.DisplayNames` se tornam mais amplamente disponíveis, bibliotecas e aplicativos optarão por deixar de empacotar e enviar seus próprios dados de tradução em favor de usar a funcionalidade nativa.

## Suporte a `Intl.DisplayNames`

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
