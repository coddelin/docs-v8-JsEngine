---
title: &apos;`Intl.DisplayNames`&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu)) и Frank Yung-Fong Tang&apos;
avatars:
  - &apos;shu-yu-guo&apos;
  - &apos;frank-tang&apos;
date: 2020-02-13
tags:
  - Intl
  - Node.js 14
description: &apos;API Intl.DisplayNames позволяет локализованно отображать название языков, регионов, скриптов и валют.&apos;
tweet: &apos;1232333889005334529&apos;
---
Веб-приложения, ориентированные на глобальную аудиторию, должны отображать названия языков, регионов, скриптов и валют на различных языках. Переводы этих названий требуют наличия данных, которые доступны в [Unicode CLDR](http://cldr.unicode.org/translation/). Включение этих данных в приложение требует затрат времени разработчика. Пользователи, скорее всего, предпочтут согласованные переводы названий языков и регионов, поддержание актуальности данных в связи с геополитическими изменениями мира требует постоянного обновления.

<!--truncate-->
К счастью, большинство JavaScript-рантаймов уже содержит и обновляет эти самые переводные данные. Новый API `Intl.DisplayNames` предоставляет JavaScript-разработчикам прямой доступ к этим переводам, облегчая локализованное отображение имен.

## Примеры использования

Следующий пример показывает, как создать объект `Intl.DisplayNames` для получения названий регионов на английском языке с использованием [ISO-3166 двухбуквенных кодов стран](https://www.iso.org/iso-3166-country-codes.html).

```js
const regionNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;region&apos; });
regionNames.of(&apos;US&apos;);
// → &apos;United States&apos;
regionNames.of(&apos;BA&apos;);
// → &apos;Bosnia & Herzegovina&apos;
regionNames.of(&apos;MM&apos;);
// → &apos;Myanmar (Burma)&apos;
```

Следующий пример получает названия языков на традиционном китайском языке с использованием [грамматики идентификаторов языков Unicode](http://unicode.org/reports/tr35/#Unicode_language_identifier).

```js
const languageNames = new Intl.DisplayNames([&apos;zh-Hant&apos;], { type: &apos;language&apos; });
languageNames.of(&apos;fr&apos;);
// → &apos;法文&apos;
languageNames.of(&apos;zh&apos;);
// → &apos;中文&apos;
languageNames.of(&apos;de&apos;);
// → &apos;德文&apos;
```

Следующий пример получает названия валют на упрощенном китайском языке с использованием [ISO-4217 трехбуквенных кодов валют](https://www.iso.org/iso-4217-currency-codes.html). В языках, где существуют различные формы единственного и множественного числа, названия валют представлены в единственном числе. Для множественных форм можно использовать [`Intl.NumberFormat`](https://v8.dev/features/intl-numberformat).

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

Следующий пример показывает последний поддерживаемый тип — скрипты — на английском языке, используя [ISO-15924 четырехбуквенные коды скриптов](http://unicode.org/iso15924/iso15924-codes.html).

```js
const scriptNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;script&apos; });
scriptNames.of(&apos;Latn&apos;);
// → &apos;Latin&apos;
scriptNames.of(&apos;Arab&apos;);
// → &apos;Arabic&apos;
scriptNames.of(&apos;Kana&apos;);
// → &apos;Katakana&apos;
```

Для более сложного использования второй параметр `options` поддерживает также свойство `style`. Свойство `style` соответствует ширине имени отображения и может быть либо `"long"`, `"short"`, либо `"narrow"`. Значения для разных стилей не всегда отличаются. По умолчанию используется `"long"`.

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

## Полное API

Полное API для `Intl.DisplayNames` выглядит следующим образом.

```js
Intl.DisplayNames(locales, options)
Intl.DisplayNames.prototype.of( code )
```

Конструктор соответствует другим API `Intl`. Его первый аргумент — список [локалей](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation), а второй параметр — параметр `options`, который принимает свойства `localeMatcher`, `type` и `style`.

Свойство `"localeMatcher"` обрабатывается так же, как в [других API `Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation). Свойство `type` может быть `"region"`, `"language"`, `"currency"` или `"script"`. Свойство `style` может быть `"long"`, `"short"` или `"narrow"`, а по умолчанию используется `"long"`.

`Intl.DisplayNames.prototype.of( code )` ожидает следующие форматы в зависимости от `type`, с которым создан экземпляр.

- Если `type` — `"region"`, `code` должен быть либо [ISO-3166 двухбуквенным кодом страны](https://www.iso.org/iso-3166-country-codes.html), либо [UN M49 трехзначным кодом региона](https://unstats.un.org/unsd/methodology/m49/).
- Когда `type` имеет значение `"language"`, `code` должен соответствовать [грамматике идентификатора языка Unicode](https://unicode.org/reports/tr35/#Unicode_language_identifier).
- Когда `type` имеет значение `"currency"`, `code` должен быть [трёхбуквенным кодом валюты ISO-4217](https://www.iso.org/iso-4217-currency-codes.html).
- Когда `type` имеет значение `"script"`, `code` должен быть [четырёхбуквенным кодом скрипта ISO-15924](https://unicode.org/iso15924/iso15924-codes.html).

## Заключение

Как и другие API `Intl`, с распространением доступности `Intl.DisplayNames` библиотеки и приложения предпочтут отказаться от упаковки и доставки собственных данных переводов в пользу использования встроенной функциональности.

## Поддержка `Intl.DisplayNames`

<feature-support chrome="81 /blog/v8-release-81#intl.displaynames"
                 firefox="86 https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/86#javascript"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=209779"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="no"></feature-support>
