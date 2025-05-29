---
title: "Контрольный список для постановки и выпуска функций WebAssembly"
description: "Этот документ предоставляет контрольные списки инженерных требований по постановке и выпуску функции WebAssembly в V8."
---
Этот документ предоставляет контрольные списки инженерных требований для постановки и выпуска функций WebAssembly в V8. Эти контрольные списки предназначены в качестве руководства и могут быть неприменимы ко всем функциям. Фактический процесс запуска описан в [V8 Launch process](https://v8.dev/docs/feature-launch-process).

# Постановка

## Когда ставить функцию WebAssembly

[Постановка](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) функции WebAssembly определяет конец её фазы реализации. Фаза реализации завершается, когда выполнено следующее:

- Реализация в V8 завершена. Это включает:
    - Реализацию в TurboFan (если применимо)
    - Реализацию в Liftoff (если применимо)
    - Реализацию в интерпретаторе (если применимо)
- Тесты в V8 доступны
- Тесты спецификации перенесены в V8 с помощью запуска [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)
- Все существующие тесты спецификации предложения проходят. Отсутствие тестов спецификации нежелательно, но не должно блокировать постановку.

Обратите внимание, что этап предложения функции в процессе стандартизации не важен для постановки функции в V8. Однако предложение должно быть в основном стабильным.

## Как ставить функцию WebAssembly

- В [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h) переместите флаг функции из списка макросов `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` в список макросов `FOREACH_WASM_STAGING_FEATURE_FLAG`.
- В [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) добавьте имя репозитория предложения в список репозиториев `repos`.
- Запустите [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) для создания и загрузки тестов спецификации нового предложения.
- В [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py) добавьте имя репозитория предложения и флаг функции в список `proposal_flags`.
- В [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py) добавьте имя репозитория предложения и флаг функции в список `proposal_flags`.

Смотрите [постановку отражения типа](https://crrev.com/c/1771791) в качестве примера.

# Выпуск

## Когда функция WebAssembly готова к выпуску

- Выполнен процесс [V8 Launch process](https://v8.dev/docs/feature-launch-process).
- Реализация покрыта тестировщиком (если применимо).
- Функция была поставлена на несколько недель для получения покрытия тестировщиком.
- Предложение функции находится на [этапе 4](https://github.com/WebAssembly/proposals).
- Все [тесты спецификации](https://github.com/WebAssembly/spec/tree/master/test) проходят.
- Выполнен [контрольный список Chromium DevTools для новых функций WebAssembly](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview).

## Как выпустить функцию WebAssembly

- В [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h) переместите флаг функции из списка макросов `FOREACH_WASM_STAGING_FEATURE_FLAG` в список макросов `FOREACH_WASM_SHIPPED_FEATURE_FLAG`.
    - Убедитесь, что на CL добавлен бот для CQ для проверки [тестов web blink](https://v8.dev/docs/blink-layout-tests), которые могут быть вызваны включением функции (добавьте эту строку в нижний колонтитул описания CL: `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- Кроме того, включите функцию по умолчанию, изменив третий параметр в `FOREACH_WASM_SHIPPED_FEATURE_FLAG` на `true`.
- Установите напоминание о необходимости удалить флаг функции через два выпуска.
