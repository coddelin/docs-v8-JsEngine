---
title: "V8 выпуск v9.5"
author: "Ингвар Степанян ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-09-21
tags: 
 - выпуск
description: "V8 выпуск v9.5 представляет обновленные API интернационализации и поддержку обработки исключений WebAssembly."
tweet: "1440296019623759872"
---
Каждые четыре недели мы создаем новую ветку V8 в рамках [процесса выпуска](https://v8.dev/docs/release-process). Каждая версия основывается на Git-репозитории V8 непосредственно перед этапом Beta для Chrome. Сегодня мы рады представить нашу новую ветку, [V8 версия 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5), которая находится в стадии бета-теста и будет выпущена вместе со стабильной версией Chrome 95 через несколько недель. V8 v9.5 наполнен разнообразными улучшениями для разработчиков. В этом посте представлен обзор некоторых ключевых моментов в ожидании выпуска.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

В версии v8.1 мы запустили API [`Intl.DisplayNames`](https://v8.dev/features/intl-displaynames) в Chrome 81 с поддержкой типов “language”, “region”, “script” и “currency”. С версией v9.5 мы добавили два новых типа: “calendar” и “dateTimeField”. Они возвращают отображаемые имена различных типов календарей и полей даты/времени соответственно:

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

Мы также улучшили поддержку типа “language” с опцией languageDisplay, которая может быть “standard” или “dialect” (по умолчанию используется, если не указано):

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### Расширенная опция `timeZoneName`

`Intl.DateTimeFormat API` в v9.5 теперь поддерживает четыре новых значения для опции `timeZoneName`:

- “shortGeneric” для отображения имени часового пояса в коротком общем формате без указания, действует ли летнее время, например, “PT”, “ET”.
- “longGeneric” для отображения имени часового пояса в длинном общем формате без указания, действует ли летнее время, например, “Pacific Time”, “Mountain Time”.
- “shortOffset” для отображения имени часового пояса в коротком локализованном формате GMT, например, “GMT-8”.
- “longOffset” для отображения имени часового пояса в длинном локализованном формате GMT, например, “GMT-0800”.

## WebAssembly

### Обработка исключений

V8 теперь поддерживает [предложение обработки исключений WebAssembly (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md), позволяя модулям, скомпилированным с совместимым инструментарием (например, [Emscripten](https://emscripten.org/docs/porting/exceptions.html)), работать в V8. Предложение разработано для минимизации накладных расходов в сравнении с предыдущими методами обхода с использованием JavaScript.

Например, мы скомпилировали оптимизатор [Binaryen](https://github.com/WebAssembly/binaryen/) в WebAssembly с использованием старой и новой реализации обработки исключений.

Когда включена обработка исключений, увеличение размера кода уменьшается [с примерно 43% для старой реализации на основе JavaScript до только 9% для новой функции Wasm EH](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

При запуске `wasm-opt.wasm -O3` на нескольких больших тестовых файлах версия Wasm EH не показала потери производительности по сравнению с базовым вариантом без исключений, тогда как версия с JavaScript обработкой заняла примерно на 30% больше времени.

Тем не менее Binaryen использует проверку исключений редко. В задачах с высокой нагрузкой на исключения ожидается еще большая разница в производительности.

## API V8

Главный заголовочный файл v8.h был разделен на несколько частей, которые теперь можно включать отдельно. Например, `v8-isolate.h` теперь содержит `v8::Isolate class`. Многие заголовочные файлы, содержащие методы, передающие `v8::Local<T>`, теперь могут импортировать `v8-forward.h` для получения определения `v8::Local` и всех типов объектов кучи v8.

Пожалуйста, используйте `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h`, чтобы получить список изменений API.
