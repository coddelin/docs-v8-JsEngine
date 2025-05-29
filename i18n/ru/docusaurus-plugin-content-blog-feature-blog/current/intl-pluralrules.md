---
title: "`Intl.PluralRules`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-04
tags:
  - Intl
description: "Работа с множественными числами — это одна из многих задач, которая может показаться простой, пока вы не осознаете, что в каждом языке свои правила множественного числа. API Intl.PluralRules может помочь!"
tweet: "915542989493202944"
---
Иñtërnâtiônàlizætiøn — это сложно. Работа с множественными числами — это одна из многих задач, которая может показаться простой, пока вы не осознаете, что каждый язык имеет свои правила множественного числа.

Для английского языка существует лишь два возможных результата множественного числа. Давайте возьмем слово «cat» в качестве примера:

- 1 cat, т.е. форма `'one'`, известная как единственное число в английском
- 2 cats, но также 42 cats, 0.5 cats и т.д., т.е. форма `'other'` (единственная другая), известная как множественное число в английском.

Совершенно новый [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) сообщает, какая форма применяется в выбранном вами языке на основе заданного числа.

```js
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other' (например, '0 cats')
pr.select(0.5); // 'other' (например, '0.5 cats')
pr.select(1);   // 'one'   (например, '1 cat')
pr.select(1.5); // 'other' (например, '1.5 cats')
pr.select(2);   // 'other' (например, '2 cats')
```

<!--truncate-->
В отличие от других API интернационализации, `Intl.PluralRules` — это API низкого уровня, который не выполняет никакого форматирования сам по себе. Вместо этого вы можете создать свой собственный форматтер на его основе:

```js
const suffixes = new Map([
  // Замечание: в реальных сценариях вы бы не захардкодили множественные формы
  // таким образом; они были бы частью ваших файлов переводов.
  ['one',   'cat'],
  ['other', 'cats'],
]);
const pr = new Intl.PluralRules('en-US');
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // '1 cat'
formatCats(0);   // '0 cats'
formatCats(0.5); // '0.5 cats'
formatCats(1.5); // '1.5 cats'
formatCats(2);   // '2 cats'
```

Для относительно простых правил множественного числа в английском это, возможно, выглядит избыточно; однако не все языки следуют одним и тем же правилам. Некоторые языки имеют только одну форму множественного числа, а некоторые — несколько. У [валлийского языка](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), например, шесть разных форм множественного числа!

```js
const suffixes = new Map([
  ['zero',  'cathod'],
  ['one',   'gath'],
  // Замечание: для данного слова форма `'two'` совпадает с формой `'one'`,
  // но это не так для всех слов в валлийском.
  ['two',   'gath'],
  ['few',   'cath'],
  ['many',  'chath'],
  ['other', 'cath'],
]);
const pr = new Intl.PluralRules('cy');
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // '0 cathod'
formatWelshCats(1);   // '1 gath'
formatWelshCats(1.5); // '1.5 cath'
formatWelshCats(2);   // '2 gath'
formatWelshCats(3);   // '3 cath'
formatWelshCats(6);   // '6 chath'
formatWelshCats(42);  // '42 cath'
```

Для корректной реализации множественного числа с поддержкой нескольких языков требуется база данных языков и их правил множественного числа. [Unicode CLDR](http://cldr.unicode.org/) включает в себя эти данные, но чтобы использовать их в JavaScript, их нужно встроить и поставлять вместе с вашим JavaScript-кодом, что увеличивает время загрузки, время разбора и использование памяти. API `Intl.PluralRules` перекладывает эту задачу на JavaScript-движок, позволяя более производительную интернационализацию множественных чисел.

:::note
**Примечание:** Хотя данные CLDR включают отображения форм в зависимости от языка, они не содержат списка форм для отдельных слов. Вам всё равно нужно переводить и предоставлять их самостоятельно, как и раньше.
:::

## Порядковые числа

API `Intl.PluralRules` поддерживает различные правила выбора через свойство `type` в необязательном аргументе `options`. Его неявное значение по умолчанию (используемое в приведённых выше примерах) — `'cardinal'`. Чтобы вместо этого определить порядковый индикатор для заданного числа (например, `1` → `1st`, `2` → `2nd` и т.д.), используйте `{ type: 'ordinal' }`:

```js
const pr = new Intl.PluralRules('en-US', {
  type: 'ordinal'
});
const suffixes = new Map([
  ['one',   'st'],
  ['two',   'nd'],
  ['few',   'rd'],
  ['other', 'th'],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // '0th'
formatOrdinals(1);   // '1st'
formatOrdinals(2);   // '2nd'
formatOrdinals(3);   // '3rd'
formatOrdinals(4);   // '4th'
formatOrdinals(11);  // '11th'
formatOrdinals(21);  // '21st'
formatOrdinals(42);  // '42nd'
formatOrdinals(103); // '103rd'
```

`Intl.PluralRules` — это низкоуровневый API, особенно по сравнению с другими функциями интернационализации. Таким образом, даже если вы не используете его напрямую, возможно, вы используете библиотеку или фреймворк, которые зависят от него.

По мере того, как этот API становится более доступным, вы найдете библиотеки, такие как [Globalize](https://github.com/globalizejs/globalize#plural-module), которые отказываются от зависимости от жестко заданных баз данных CLDR в пользу встроенной функциональности, тем самым улучшая производительность времени загрузки, парсинга, выполнения и использование памяти.

## Поддержка `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
