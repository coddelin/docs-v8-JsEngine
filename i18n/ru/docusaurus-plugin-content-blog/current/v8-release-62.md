---
title: &apos;Релиз V8 v6.2&apos;
author: &apos;команда V8&apos;
date: 2017-09-11 13:33:37
tags:
  - релиз
description: &apos;V8 v6.2 включает улучшения производительности, новые функции языка JavaScript, увеличенную максимальную длину строки и многое другое.&apos;
---
Каждые шесть недель мы создаем новую ветвь V8 в рамках нашего [процесса релиза](/docs/release-process). Каждая версия создается на основе основной ветки Git V8 непосредственно перед этапом Chrome Beta. Сегодня мы с радостью объявляем о нашей новой ветке, [V8 версии 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2), которая находится в бета-тестировании до ее выпуска в стабильной версии Chrome 62 через несколько недель. V8 v6.2 наполнен всем спектром полезных новшеств для разработчиков. Этот пост предоставляет предварительный обзор некоторых ключевых особенностей в преддверии релиза.

<!--truncate-->
## Улучшения производительности

Производительность [`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) ранее уже была выявлена как возможное узкое место, так как эта функция часто используется такими популярными библиотеками, как [lodash](https://lodash.com/) и [underscore.js](http://underscorejs.org/), а также такими фреймворками, как [AngularJS](https://angularjs.org/). Различные вспомогательные функции, такие как [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) или [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) часто используются в коде приложений и библиотек для выполнения проверок типов во время выполнения.

С появлением ES2015 функция `Object#toString` стала доступна для изменения с использованием нового символа [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag), что также сделало функцию `Object#toString` более тяжеловесной и более сложной для ускорения. В этом выпуске мы портировали оптимизацию, изначально реализованную в [JavaScript-движке SpiderMonkey](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0), в V8, увеличив производительность `Object#toString` в **6,5×** раз.

![](/_img/v8-release-62/perf.svg)

Это также повлияло на тест Speedometer для браузеров, особенно на подзадачу AngularJS, где мы измерили улучшение на 3%. Прочитайте [подробный пост в блоге](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) для получения дополнительной информации.

![](/_img/v8-release-62/speedometer.svg)

Мы также значительно улучшили производительность [прокси ES2015](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), ускорив вызовы прокси-объектов через `someProxy(params)` или `new SomeOtherProxy(params)` до **5×** раз:

![](/_img/v8-release-62/proxy-call-construct.svg)

Аналогично была улучшена производительность доступа к свойству прокси-объекта через `someProxy.property` почти на **6,5×** раз:

![](/_img/v8-release-62/proxy-property.svg)

Это часть продолжающейся стажировки. Следите за дальнейшими публикациями в блоге и итоговыми результатами.

Мы также рады сообщить, что благодаря [вкладам](https://chromium-review.googlesource.com/c/v8/v8/+/620150) от [Peter Wong](https://twitter.com/peterwmwong), производительность встроенной функции [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) улучшилась более чем в **3×** раза по сравнению с предыдущим выпуском.

Поиски по хэш-кодам для внутренних хэш-таблиц стали значительно быстрее, что привело к улучшению производительности `Map`, `Set`, `WeakMap` и `WeakSet`. Предстоящий пост в блоге объяснит эту оптимизацию подробно.

![](/_img/v8-release-62/hashcode-lookups.png)

Сборщик мусора теперь использует [параллельный механизм очистки](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) для сбора так называемого молодого поколения кучи.

## Улучшенный режим работы с низкой памятью

За последние несколько выпусков режим работы V8 с низкой памятью был улучшен (например, путем [установки начального размера полу-пространства в 512 КБ](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). Устройства с низким объемом памяти теперь реже сталкиваются с ситуациями нехватки памяти. Однако это поведение при низком объеме памяти может негативно повлиять на производительность во время выполнения.

## Новые функции регулярных выражений

Поддержка [режима `dotAll`](https://github.com/tc39/proposal-regexp-dotall-flag) для регулярных выражений, включенного через флаг `s`, теперь включена по умолчанию. В режиме `dotAll` символ `.` в регулярных выражениях соответствует любому символу, включая разделители строк.

```js
/foo.bar/su.test(&apos;foo\nbar&apos;); // true
```

[Утверждения с обратным просмотром](https://github.com/tc39/proposal-regexp-lookbehind), еще одна новая возможность регулярных выражений, теперь доступны по умолчанию. Название уже довольно точно описывает их смысл. Утверждения с обратным просмотром позволяют ограничить шаблон так, чтобы он совпадал только в том случае, если перед ним стоит шаблон в группе обратного просмотра. Существуют варианты как для совпадений, так и для несоответствий:

```js
/(?<=\$)\d+/.exec(&apos;$1 стоит около ¥123&apos;); // [&apos;1&apos;]
/(?<!\$)\d+/.exec(&apos;$1 стоит около ¥123&apos;); // [&apos;123&apos;]
```

Более подробную информацию о этих функциях можно найти в нашей публикации [Предстоящие функции регулярных выражений](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

## Ревизия литералов шаблона

Ограничение на escape-последовательности в литералах шаблона было ослаблено [в соответствии с соответствующим предложением](https://tc39.es/proposal-template-literal-revision/). Это открывает новые возможности для использования тегов шаблонов, такие как создание процессора LaTeX.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Увлекательно!}}
\newcommand{\unicode}{\textbf{Юникод!}}
\newcommand{\xerxes}{\textbf{Король!}}
Краткая над &apos;h&apos; идет \u{h}ер // Недопустимый токен!
`;
```

## Увеличена максимальная длина строки

Максимальная длина строки на 64-битных платформах увеличилась с `2**28 - 16` до `2**30 - 25` символов.

## Удален Full-codegen

В V8 v6.2 окончательные крупные части старого пайплайна были удалены. В этом выпуске было удалено более 30 тысяч строк кода — серьезное упрощение сложности кода.

## API V8

Пожалуйста, ознакомьтесь с нашим [резюме изменений API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого основного выпуска.

Разработчики с [активной проверкой V8](/docs/source-code#using-git) могут использовать `git checkout -b 6.2 -t branch-heads/6.2`, чтобы поэкспериментировать с новыми функциями в V8 v6.2. В качестве альтернативы можно [подписаться на Бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и самостоятельно скоро попробовать новые функции.
