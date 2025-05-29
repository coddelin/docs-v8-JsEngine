---
title: 'Тестирование'
description: 'Этот документ объясняет платформу тестирования, которая является частью репозитория V8.'
---
V8 включает платформу тестирования, которая позволяет вам тестировать движок. Платформа дает возможность запускать как наши собственные тестовые пакеты, включенные в исходный код, так и другие, такие как [тестовый пакет Test262](https://github.com/tc39/test262).

## Запуск тестов V8

[Используя `gm`](/docs/build-gn#gm), вы можете просто добавить `.check` к любой цели сборки, чтобы запустить тесты, например:

```bash
gm x64.release.check
gm x64.optdebug.check  # рекомендуется: достаточно быстро, с включёнными DCHECKs.
gm ia32.check
gm release.check
gm check  # собирает и тестирует все платформы по умолчанию.
```

`gm` автоматически собирает все необходимые цели перед запуском тестов. Вы также можете ограничить набор запускаемых тестов:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

Если вы уже собрали V8, вы можете вручную запустить тесты:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

Кроме того, вы можете указать, какие тесты запускать:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

Запустите скрипт с ключом `--help`, чтобы узнать о других его параметрах.

## Запуск дополнительных тестов

Набор тестов, запускаемых по умолчанию, не включает все доступные тесты. Вы можете указать дополнительные тестовые пакеты в командной строке, используя `gm` или `run-tests.py`:

- `benchmarks` (только для проверки корректности; не предоставляет результаты производительности!)
- `mozilla`
- `test262`
- `webkit`

## Запуск микробенчмарков

В разделе `test/js-perf-test` мы располагаем микробенчмарками для отслеживания производительности функций. Для них есть специальный скрипт: `tools/run_perf.py`. Запустите их следующим образом:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

Если вы не хотите запускать все `JSTests`, вы можете указать аргумент `filter`:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## Обновление ожидаемых результатов для тестов инспектора

После обновления вашего теста может понадобиться пересоздать файл с ожидаемыми результатами для него. Вы можете сделать это, запустив:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

Это также полезно, если вы хотите узнать, насколько изменился вывод вашего теста. Сначала пересоздайте файл ожиданий, используя команду выше, затем проверьте изменения с помощью:

```bash
git diff
```

## Обновление ожиданий байткода (перебазирование)

Иногда ожидания байткода могут измениться, что приведет к сбоям в `cctest`. Чтобы обновить файлы с «золотыми» ожиданиями, соберите `test/cctest/generate-bytecode-expectations`, выполнив:

```bash
gm x64.release generate-bytecode-expectations
```

…а затем обновите набор входных данных по умолчанию, передав флаг `--rebaseline` созданному бинарному файлу:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

Обновленные файлы ожиданий теперь находятся в `test/cctest/interpreter/bytecode_expectations/`.

## Добавление нового теста ожиданий байткода

1. Добавьте новый тест в `cctest/interpreter/test-bytecode-generator.cc` и укажите файл с «золотыми» ожиданиями с тем же названием теста.

1. Соберите `generate-bytecode-expectations`:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. Запустите

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    где `testcase.js` содержит JavaScript тестовый пример, добавленный в `test-bytecode-generator.cc`, а `testname` — это название теста, определенное в `test-bytecode-generator.cc`.
