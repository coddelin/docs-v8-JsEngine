---
title: "Релиз V8 версии v8.1"
author: "Доминик Инфюэр, международный человек-загадка"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - выпуск
description: "V8 v8.1 включает улучшенную поддержку интернационализации благодаря новому API Intl.DisplayNames."
---

Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса выпуска](https://v8.dev/docs/release-process). Каждая версия создаётся из основной ветки Git V8 непосредственно перед стадией бета-версии Chrome. Сегодня мы рады представить нашу новую ветку, [V8 версии 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), которая будет находиться в стадии бета-тестирования до её выпуска в стабильной версии Chrome 81 через несколько недель. V8 v8.1 наполнена разнообразными функциями для разработчиков. В этом посте представлен предварительный обзор некоторых ключевых моментов, ожидаемых в выпуске.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

Новое API `Intl.DisplayNames` позволяет программистам легко отображать переведённые названия языков, регионов, систем письма и валют.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → '法文'
enRegionNames.of('US');
// → 'United States'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Japanischer Yen'
```

Снимите бремя поддержания данных переводов с себя уже сегодня, поручив это выполнение на стороне рантайма! Ознакомьтесь с [нашим пояснением функции](https://v8.dev/features/intl-displaynames) для получения подробной информации о полном API и более обширных примерах.

## API V8

Используйте `git log branch-heads/8.0..branch-heads/8.1 include/v8.h`, чтобы получить список изменений в API.

Разработчики с [активным репозиторием V8](/docs/source-code#using-git) могут использовать `git checkout -b 8.1 -t branch-heads/8.1`, чтобы поэкспериментировать с новыми функциями V8 v8.1. Или же вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре опробовать новые функции самостоятельно.
