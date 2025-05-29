---
title: &apos;`Intl.DisplayNames`&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu)) e Frank Yung-Fong Tang&apos;
avatars:
  - &apos;shu-yu-guo&apos;
  - &apos;frank-tang&apos;
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: &apos;A API Intl.DisplayNames permite nomes localizados de idiomas, regiões, scripts e moedas.&apos;
tweet: &apos;1232333889005334529&apos;
---
Aplicações web que alcançam uma audiência global precisam exibir os nomes de exibição de idiomas, regiões, scripts e moedas em muitos idiomas diferentes. As traduções desses nomes requerem dados, que estão disponíveis no [Unicode CLDR](http://cldr.unicode.org/translation/). Incluir esses dados como parte da aplicação implica em um custo no tempo de desenvolvimento. Os usuários provavelmente preferem traduções consistentes de nomes de idiomas e regiões, e manter esses dados atualizados com os acontecimentos geopolíticos do mundo exige manutenção constante.

<!--truncate-->
Felizmente, a maioria dos tempos de execução JavaScript já têm e mantêm esses mesmos dados de tradução atualizados. A nova API `Intl.DisplayNames` dá aos desenvolvedores JavaScript acesso direto a essas traduções, permitindo que as aplicações exibam nomes localizados mais facilmente.

## Exemplos de uso

O exemplo a seguir mostra como criar um objeto `Intl.DisplayNames` para obter nomes de regiões em inglês usando [códigos de países de 2 letras ISO-3166](https://www.iso.org/iso-3166-country-codes.html).

```js
const regionNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;region&apos; });
regionNames.of(&apos;US&apos;);
// → &apos;United States&apos;
regionNames.of(&apos;BA&apos;);
// → &apos;Bosnia & Herzegovina&apos;
regionNames.of(&apos;MM&apos;);
// → &apos;Myanmar (Burma)&apos;
```

O exemplo a seguir obtém nomes de idiomas em chinês tradicional usando a [gramática de identificador de idioma Unicode](http://unicode.org/reports/tr35/#Unicode_language_identifier).

```js
const languageNames = new Intl.DisplayNames([&apos;zh-Hant&apos;], { type: &apos;language&apos; });
languageNames.of(&apos;fr&apos;);
// → &apos;法文&apos;
languageNames.of(&apos;zh&apos;);
// → &apos;中文&apos;
languageNames.of(&apos;de&apos;);
// → &apos;德文&apos;
```

O exemplo a seguir obtém nomes de moedas em chinês simplificado usando [códigos de moedas de 3 letras ISO-4217](https://www.iso.org/iso-4217-currency-codes.html). Em idiomas que têm formas singulares e plurais distintas, os nomes das moedas estão no singular. Para formas plurais, [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat) pode ser usado.

```js
const currencyNames = new Intl.DisplayNames([&apos;zh-Hans&apos;], {type: &apos;currency&apos;});
currencyNames.of(&apos;USD&apos;);
// → &apos;美元&apos;
currencyNames.of(&apos;EUR&apos;);
// → &apos;欧元&apos;
currencyNames.of(&apos;JPY&apos;);
// → &apos;日元&apos;
currencyNames.of(&apos;CNY&apos;);
// → &apos;人民币&apos;
```

O exemplo a seguir mostra o tipo final suportado, scripts, em inglês, usando [códigos de scripts de 4 letras ISO-15924](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;script&apos; });
scriptNames.of(&apos;Latn&apos;);
// → &apos;Latin&apos;
scriptNames.of(&apos;Arab&apos;);
// → &apos;Arabic&apos;
scriptNames.of(&apos;Kana&apos;);
// → &apos;Katakana&apos;
```

Para usos mais avançados, o segundo parâmetro `options` também suporta a propriedade `style`. A propriedade `style` corresponde à largura do nome de exibição e pode ser `"long"`, `"short"` ou `"narrow"`. Os valores para diferentes estilos nem sempre diferem. O padrão é `"long"`.

```js
const longLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos; });
longLanguageNames.of(&apos;en-US&apos;);
// → &apos;American English&apos;
const shortLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;short&apos; });
shortLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
const narrowLanguageNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;language&apos;, style: &apos;narrow&apos; });
narrowLanguageNames.of(&apos;en-US&apos;);
// → &apos;US English&apos;
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
