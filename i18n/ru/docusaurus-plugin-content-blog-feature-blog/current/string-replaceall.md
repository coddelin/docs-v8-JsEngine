---
title: &apos;`String.prototype.replaceAll`&apos;
author: &apos;Матиас Байненс ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: &apos;Теперь JavaScript поддерживает замену всех совпадений подстрок благодаря новому API `String.prototype.replaceAll`.&apos;
tweet: &apos;1193917549060280320&apos;
---
Если вы когда-либо работали со строками в JavaScript, то, скорее всего, сталкивались с методом `String#replace`. `String.prototype.replace(searchValue, replacement)` возвращает строку с некоторыми заменёнными совпадениями в зависимости от указанных параметров:

<!--truncate-->
```js
&apos;abc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;a_c&apos;

&apos;🍏🍋🍊🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍋🍊🍓&apos;
```

Распространённым случаем использования является замена _всех_ экземпляров заданной подстроки. Однако `String#replace` напрямую не решает эту задачу. Когда `searchValue` является строкой, заменяется только первое вхождение подстроки:

```js
&apos;aabbcc&apos;.replace(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa_bcc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🍏🍋🍋🍊🍊🍓🍓&apos;
```

Чтобы обойти это ограничение, разработчики часто преобразуют строку поиска в регулярное выражение с глобальным флагом (`g`). Таким образом, метод `String#replace` заменяет _все_ совпадения:

```js
&apos;aabbcc&apos;.replace(/b/g, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replace(/🍏/g, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;
```

Для разработчиков это неприятно, когда приходится делать преобразование строки в регулярное выражение, если вы действительно хотите выполнить замену всех совпадений подстроки. Более того, это преобразование может привести к ошибкам, и часто становится причиной багов! Рассмотрим следующий пример:

```js
const queryString = &apos;q=query+string+parameters&apos;;

queryString.replace(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// Только первое вхождение будет заменено.

queryString.replace(/+/, &apos; &apos;);
// → SyntaxError: invalid regular expression ❌
// Оказывается, `+` — это специальный символ в шаблонах регулярных выражений.

queryString.replace(/\+/, &apos; &apos;);
// → &apos;q=query string+parameters&apos; ❌
// Экранирование специальных символов делает регулярное выражение допустимым, но
// при этом всё ещё заменяется только первое вхождение `+` в строке.

queryString.replace(/\+/g, &apos; &apos;);
// → &apos;q=query string parameters&apos; ✅
// Экранирование специальных символов И использование флага `g` делает замену рабочей.
```

Преобразование строкового литерала вроде `&apos;+&apos;` в глобальное регулярное выражение — это не просто вопрос избавления от кавычек `&apos;`, оборачивания в наклонные слэш `/` и добавления флага `g`, — необходимо экранировать любые символы, которые имеют специальное значение в регулярных выражениях. Это легко забыть и тяжело реализовать правильно, так как JavaScript не предоставляет встроенного механизма для экранирования шаблонов регулярных выражений.

Другой способ обхода — это использование сочетания методов `String#split` и `Array#join`:

```js
const queryString = &apos;q=query+string+parameters&apos;;
queryString.split(&apos;+&apos;).join(&apos; &apos;);
// → &apos;q=query string parameters&apos;
```

Этот подход избегает необходимости экранирования, но сопровождается дополнительной нагрузкой — разделением строки на массив частей только для её обратного склеивания.

Очевидно, что ни один из этих обходных путей не является идеальным. Разве не было бы здорово, если бы такая базовая операция, как глобальная замена подстроки, была простой в JavaScript?

## `String.prototype.replaceAll`

Новый метод `String#replaceAll` решает эти проблемы и предоставляет простой механизм для выполнения глобальной замены подстроки:

```js
&apos;aabbcc&apos;.replaceAll(&apos;b&apos;, &apos;_&apos;);
// → &apos;aa__cc&apos;

&apos;🍏🍏🍋🍋🍊🍊🍓🍓&apos;.replaceAll(&apos;🍏&apos;, &apos;🥭&apos;);
// → &apos;🥭🥭🍋🍋🍊🍊🍓🍓&apos;

const queryString = &apos;q=query+string+parameters&apos;;
queryString.replaceAll(&apos;+&apos;, &apos; &apos;);
// → &apos;q=query string parameters&apos;
```

Для согласованности с ранее представленными API в языке, `String.prototype.replaceAll(searchValue, replacement)` ведёт себя точно так же, как `String.prototype.replace(searchValue, replacement)`, за исключением следующих двух особенностей:

1. Если `searchValue` является строкой, то `String#replace` заменяет только первое вхождение подстроки, тогда как `String#replaceAll` заменяет _все_ вхождения.
1. Если `searchValue` является не глобальным регулярным выражением, то `String#replace` заменяет только одно совпадение, аналогично тому, как он работает для строк. `String#replaceAll`, с другой стороны, генерирует исключение в этом случае, так как это, вероятно, ошибка: если вы действительно хотите «заменить все» совпадения, вам следует использовать глобальное регулярное выражение; если вы хотите заменить только одно совпадение, можно использовать `String#replace`.

Ключевая новая функциональность заключается в первом пункте. `String.prototype.replaceAll` обогащает JavaScript поддержкой глобальной замены подстрок первого класса без необходимости использовать регулярные выражения или другие обходные пути.

## Заметка о специальных шаблонах замены

Стоит отметить: и `replace`, и `replaceAll` поддерживают [специальные шаблоны замены](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement). Хотя они наиболее полезны в сочетании с регулярными выражениями, некоторые из них (`$$`, `$&`, ``$` ``, и `$&apos;`) также используются при простой замене строк, что может быть неожиданным:

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, &apos;$$&apos;);
// → &apos;x$z&apos; (не &apos;x$$z&apos;)
```

Если строка замены содержит один из этих шаблонов, а вы хотите использовать их как есть, вы можете отключить волшебное поведение замены, используя функцию-заменитель, которая возвращает строку:

```js
&apos;xyz&apos;.replaceAll(&apos;y&apos;, () => &apos;$$&apos;);
// → &apos;x$$z&apos;
```

## Поддержка `String.prototype.replaceAll`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
