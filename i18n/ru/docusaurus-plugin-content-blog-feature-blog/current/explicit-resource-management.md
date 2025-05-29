---
title: "Новая суперспособность JavaScript: явное управление ресурсами"
author: "Резван Махдави Хезавех"
avatars:
  - "rezvan-mahdavi-hezaveh"
date: 2025-05-09
tags:
  - ECMAScript
description: "Предложение о явном управлении ресурсами дает разработчикам возможность явно управлять жизненным циклом ресурсов."
tweet: ""
---

Предложение *Явного управления ресурсами* вводит детерминированный подход для явного управления жизненным циклом ресурсов, таких как файловые дескрипторы, сетевые подключения и других. Это предложение вносит следующие дополнения в язык: объявления `using` и `await using`, которые автоматически вызывают метод dispose, когда ресурс выходит из области видимости; символы `[Symbol.dispose]()` и `[Symbol.asyncDispose]()` для операций очистки; два новых глобальных объекта `DisposableStack` и `AsyncDisposableStack` как контейнеры для агрегирования освобождаемых ресурсов; и `SuppressedError` как новый тип ошибки (содержащий как недавно вызванную ошибку, так и подавленную ошибку), чтобы решить ситуацию, когда ошибка возникает во время освобождения ресурса, что может скрыть существующую ошибку, вызванную основным телом операции или освобождением другого ресурса. Эти дополнения позволяют разработчикам писать более надежный, производительный и поддерживаемый код, предоставляя тонкий контроль над освобождением ресурсов.

<!--truncate-->
## Объявления `using` и `await using`

Основной частью предложения Явного управления ресурсами являются объявления `using` и `await using`. Объявление `using` предназначено для синхронных ресурсов, гарантируя, что метод `[Symbol.dispose]()` освобождаемого ресурса вызывается, когда область видимости, в которой он объявлен, завершается. Для асинхронных ресурсов объявление `await using` работает аналогично, но гарантирует, что метод `[Symbol.asyncDispose]()` вызывается, а результат вызова ожидается, позволяя выполнять операции очистки асинхронно. Такое различие позволяет разработчикам надежно управлять как синхронными, так и асинхронными ресурсами, предотвращая утечки и улучшая общее качество кода. Ключевые слова `using` и `await using` могут быть использованы внутри фигурных скобок `{}` (таких как блоки, циклы for и тела функций) и не могут быть использованы на верхнем уровне.

Например, при работе с [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader) необходимо вызывать `reader.releaseLock()` для разблокировки потока и возможности его использования в другом месте. Тем не менее, обработка ошибок создаёт распространённую проблему: если ошибка возникает в процессе чтения и вы забываете вызвать `releaseLock()` до того, как ошибка распространится, поток остаётся заблокированным. Начнём с простого примера:

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // Только выполнять запрос, если у нас ещё нет обещания
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP ошибка! статус: ${response.status}`);
    }
    const processedData = await processData(response);

    // Выполнить действие с processedData
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Обработать данные и сохранить результат в processedData
            ...
            // Здесь выбрасывается ошибка!
        }
    }
    
    // Из-за того, что ошибка выбрасывается перед этой строкой, поток остаётся заблокированным.
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Следовательно, разработчикам крайне важно использовать блок `try...finally` при работе с потоками и помещать `reader.releaseLock()` в `finally`. Этот шаблон гарантирует, что `reader.releaseLock()` всегда будет вызван.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // Обработать данные и сохранить результат в processedData
                ...
                // Здесь выбрасывается ошибка!
            }
        }
    } finally {
        // Блокировка потока на reader всегда будет снята.
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

Альтернативный способ написания этого кода заключается в создании временного объекта `readerResource`, который содержит ридер (`response.body.getReader()`) и метод `[Symbol.dispose]()`, вызывающий `this.reader.releaseLock()`. Декларация `using` гарантирует, что `readerResource[Symbol.dispose]()` будет вызван при выходе из блока кода, и необходимость запоминать вызов `releaseLock` больше не требуется, так как за это отвечает декларация `using`. Возможно, в будущем `[Symbol.dispose]` и `[Symbol.asyncDispose]` будут интегрированы в веб-API, такие как streams, чтобы разработчикам не приходилось писать ручной оберточный объект.

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // Оберните ридер в ресурс, поддерживающий утилиту удаления
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // Обработка данных и сохранение результата в processedData
            ...
            // Ошибка произошла здесь!
        }
    }
    return processedData;
}
// readerResource[Symbol.dispose]() вызывается автоматически.

readFile('https://example.com/largefile.dat');
```

## `DisposableStack` и `AsyncDisposableStack`

Для упрощения управления несколькими ресурсами, подлежащими удалению, предложение вводит `DisposableStack` и `AsyncDisposableStack`. Эти структуры, основанные на стеке, позволяют разработчикам группировать и удалять несколько ресурсов скоординированным образом. Ресурсы добавляются в стек, и при удалении стека, синхронно или асинхронно, ресурсы удаляются в обратном порядке их добавления, что гарантирует правильную обработку любых зависимостей между ними. Это упрощает процесс очистки в сложных сценариях, связанных с несколькими связанными ресурсами. Оба объекта предоставляют методы, такие как `use()`, `adopt()` и `defer()` для добавления ресурсов или действий по удалению, а также метод `dispose()` или `asyncDispose()` для запуска очистки. `DisposableStack` и `AsyncDisposableStack` имеют `[Symbol.dispose]()` и `[Symbol.asyncDispose]()`, соответственно, поэтому они могут использоваться с ключевыми словами `using` и `await using`. Они предлагают надежный способ управления удалением нескольких ресурсов в пределах определенной области.

Давайте рассмотрим каждый метод и пример его использования:

`use(value)` добавляет ресурс на верхний уровень стека.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Блокировка ридера снята.');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// Блокировка ридера снята.
```

`adopt(value, onDispose)` добавляет не удаляемый ресурс и функцию обратного вызова для его удаления на верхний уровень стека.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Блокировка ридера снята.');
      });
}
// Блокировка ридера снята.
```

`defer(onDispose)` добавляет функцию обратного вызова для удаления на верхний уровень стека. Это полезно для добавления действий по очистке, не связанных с ресурсом.

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("готово."));
}
// готово.
```

`move()` перемещает все текущие ресурсы из этого стека в новый `DisposableStack`. Это может быть полезным, если вам нужно передать владение ресурсами в другую часть кода.

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader => {
        reader.releaseLock();
        console.log('Блокировка ридера снята.');
      });
    using newStack = stack.move();
}
// Теперь существует только newStack, и ресурс внутри него будет удален.
// Блокировка ридера снята.
```

`dispose()` в DisposableStack и `disposeAsync()` в AsyncDisposableStack удаляют ресурсы, содержащиеся в этом объекте.

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('Блокировка ридера снята.');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// Блокировка ридера снята.
```

## Доступность

Явное управление ресурсами доступно в Chromium 134 и V8 v13.8.

## Поддержка явного управления ресурсами

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="нет https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="нет"
                 babel="да https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
