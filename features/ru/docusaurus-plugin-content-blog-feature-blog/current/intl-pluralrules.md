---
title: &apos;`Intl.PluralRules`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-10-04
tags:
  - Intl
description: &apos;Работа с множественными числами — это одна из многих задач, которая может показаться простой, пока вы не осознаете, что в каждом языке свои правила множественного числа. API Intl.PluralRules может помочь!&apos;
tweet: &apos;915542989493202944&apos;
---
Иñtërnâtiônàlizætiøn — это сложно. Работа с множественными числами — это одна из многих задач, которая может показаться простой, пока вы не осознаете, что каждый язык имеет свои правила множественного числа.

Для английского языка существует лишь два возможных результата множественного числа. Давайте возьмем слово «cat» в качестве примера:

- 1 cat, т.е. форма `&apos;one&apos;`, известная как единственное число в английском
- 2 cats, но также 42 cats, 0.5 cats и т.д., т.е. форма `&apos;other&apos;` (единственная другая), известная как множественное число в английском.

Совершенно новый [`Intl.PluralRules` API](https://github.com/tc39/proposal-intl-plural-rules) сообщает, какая форма применяется в выбранном вами языке на основе заданного числа.

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;);
pr.select(0);   // &apos;other&apos; (например, &apos;0 cats&apos;)
pr.select(0.5); // &apos;other&apos; (например, &apos;0.5 cats&apos;)
pr.select(1);   // &apos;one&apos;   (например, &apos;1 cat&apos;)
pr.select(1.5); // &apos;other&apos; (например, &apos;1.5 cats&apos;)
pr.select(2);   // &apos;other&apos; (например, &apos;2 cats&apos;)
```

<!--truncate-->
В отличие от других API интернационализации, `Intl.PluralRules` — это API низкого уровня, который не выполняет никакого форматирования сам по себе. Вместо этого вы можете создать свой собственный форматтер на его основе:

```js
const suffixes = new Map([
  // Замечание: в реальных сценариях вы бы не захардкодили множественные формы
  // таким образом; они были бы частью ваших файлов переводов.
  [&apos;one&apos;,   &apos;cat&apos;],
  [&apos;other&apos;, &apos;cats&apos;],
]);
const pr = new Intl.PluralRules(&apos;en-US&apos;);
const formatCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatCats(1);   // &apos;1 cat&apos;
formatCats(0);   // &apos;0 cats&apos;
formatCats(0.5); // &apos;0.5 cats&apos;
formatCats(1.5); // &apos;1.5 cats&apos;
formatCats(2);   // &apos;2 cats&apos;
```

Для относительно простых правил множественного числа в английском это, возможно, выглядит избыточно; однако не все языки следуют одним и тем же правилам. Некоторые языки имеют только одну форму множественного числа, а некоторые — несколько. У [валлийского языка](http://unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#rules), например, шесть разных форм множественного числа!

```js
const suffixes = new Map([
  [&apos;zero&apos;,  &apos;cathod&apos;],
  [&apos;one&apos;,   &apos;gath&apos;],
  // Замечание: для данного слова форма `&apos;two&apos;` совпадает с формой `&apos;one&apos;`,
  // но это не так для всех слов в валлийском.
  [&apos;two&apos;,   &apos;gath&apos;],
  [&apos;few&apos;,   &apos;cath&apos;],
  [&apos;many&apos;,  &apos;chath&apos;],
  [&apos;other&apos;, &apos;cath&apos;],
]);
const pr = new Intl.PluralRules(&apos;cy&apos;);
const formatWelshCats = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n} ${suffix}`;
};

formatWelshCats(0);   // &apos;0 cathod&apos;
formatWelshCats(1);   // &apos;1 gath&apos;
formatWelshCats(1.5); // &apos;1.5 cath&apos;
formatWelshCats(2);   // &apos;2 gath&apos;
formatWelshCats(3);   // &apos;3 cath&apos;
formatWelshCats(6);   // &apos;6 chath&apos;
formatWelshCats(42);  // &apos;42 cath&apos;
```

Для корректной реализации множественного числа с поддержкой нескольких языков требуется база данных языков и их правил множественного числа. [Unicode CLDR](http://cldr.unicode.org/) включает в себя эти данные, но чтобы использовать их в JavaScript, их нужно встроить и поставлять вместе с вашим JavaScript-кодом, что увеличивает время загрузки, время разбора и использование памяти. API `Intl.PluralRules` перекладывает эту задачу на JavaScript-движок, позволяя более производительную интернационализацию множественных чисел.

:::note
**Примечание:** Хотя данные CLDR включают отображения форм в зависимости от языка, они не содержат списка форм для отдельных слов. Вам всё равно нужно переводить и предоставлять их самостоятельно, как и раньше.
:::

## Порядковые числа

API `Intl.PluralRules` поддерживает различные правила выбора через свойство `type` в необязательном аргументе `options`. Его неявное значение по умолчанию (используемое в приведённых выше примерах) — `&apos;cardinal&apos;`. Чтобы вместо этого определить порядковый индикатор для заданного числа (например, `1` → `1st`, `2` → `2nd` и т.д.), используйте `{ type: &apos;ordinal&apos; }`:

```js
const pr = new Intl.PluralRules(&apos;en-US&apos;, {
  type: &apos;ordinal&apos;
});
const suffixes = new Map([
  [&apos;one&apos;,   &apos;st&apos;],
  [&apos;two&apos;,   &apos;nd&apos;],
  [&apos;few&apos;,   &apos;rd&apos;],
  [&apos;other&apos;, &apos;th&apos;],
]);
const formatOrdinals = (n) => {
  const rule = pr.select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
};

formatOrdinals(0);   // &apos;0th&apos;
formatOrdinals(1);   // &apos;1st&apos;
formatOrdinals(2);   // &apos;2nd&apos;
formatOrdinals(3);   // &apos;3rd&apos;
formatOrdinals(4);   // &apos;4th&apos;
formatOrdinals(11);  // &apos;11th&apos;
formatOrdinals(21);  // &apos;21st&apos;
formatOrdinals(42);  // &apos;42nd&apos;
formatOrdinals(103); // &apos;103rd&apos;
```

`Intl.PluralRules` — это низкоуровневый API, особенно по сравнению с другими функциями интернационализации. Таким образом, даже если вы не используете его напрямую, возможно, вы используете библиотеку или фреймворк, которые зависят от него.

По мере того, как этот API становится более доступным, вы найдете библиотеки, такие как [Globalize](https://github.com/globalizejs/globalize#plural-module), которые отказываются от зависимости от жестко заданных баз данных CLDR в пользу встроенной функциональности, тем самым улучшая производительность времени загрузки, парсинга, выполнения и использование памяти.

## Поддержка `Intl.PluralRules`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="13"
                 nodejs="10"
                 babel="no"></feature-support>
