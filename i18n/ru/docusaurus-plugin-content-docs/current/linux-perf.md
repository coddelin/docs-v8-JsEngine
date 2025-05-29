---
title: &apos;Интеграция V8 с инструментом Linux `perf`&apos;
description: &apos;Этот документ объясняет, как анализировать производительность JIT-кода V8 с помощью инструмента Linux `perf`.&apos;
---
V8 имеет встроенную поддержку инструмента Linux `perf`. Она активируется с помощью опции командной строки `--perf-prof`.
V8 записывает данные о производительности во время выполнения в файл, который можно использовать для анализа производительности JIT-кода V8 (включая имена JS-функций) с помощью инструмента Linux `perf`.

## Требования

- Версия `linux-perf` 5 или выше (предыдущие версии не поддерживают JIT). (См. инструкцию в [конце](#build-perf))
- Сборка V8/Chrome с использованием `enable_profiling=true` для более точных символов C++.

## Сборка V8

Чтобы использовать интеграцию V8 с Linux perf, вам нужно собрать его с флагом gn `enable_profiling = true`:

```bash
echo &apos;enable_profiling = true&apos; >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## Профилирование `d8` с помощью [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

После сборки `d8` вы можете начать использовать Linux perf:

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

Более полный пример:

```bash
echo &apos;(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();&apos; > test.js;

# Используйте пользовательские флаги V8 и отдельную директорию для вывода для уменьшения беспорядка:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# Красивый пользовательский интерфейс (`-flame` доступен только для Google, используйте `-web` как публичную альтернативу):
pprof -flame perf_results/XXX_perf.data.jitted;
# Инструмент для терминала:
perf report -i perf_results/XXX_perf.data.jitted;
```

Просмотрите `linux-perf-d8.py --help` для получения дополнительных деталей. Обратите внимание, что вы можете использовать все флаги `d8` после аргумента бинарного файла `d8`.


## Профилирование Chrome или content_shell с помощью [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. Вы можете использовать скрипт [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) для профилирования Chrome. Убедитесь, что вы добавили [необходимые флаги gn для Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup), чтобы получить корректные символы C++.

1. После завершения сборки вы можете профилировать веб-сайт с полными символами для C++ и JS-кода.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. Перейдите на свой веб-сайт и затем закройте браузер (или подождите завершения `--timeout`)
1. После выхода из браузера `linux-perf.py` выполнит постобработку файлов и покажет список с результатами для каждого процесса рендерера:

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## Исследование результатов linux-perf

Наконец, вы можете использовать инструмент Linux `perf` для исследования профиля процесса рендерера d8 или Chrome:

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

Вы также можете использовать [pprof](https://github.com/google/pprof) для генерации дополнительных визуализаций:

```bash
# Примечание: `-flame` доступно только для Google, используйте `-web` как публичную альтернативу:
pprof -flame perf_results/XXX_perf.data.jitted;
```

## Низкоуровневое использование linux-perf

### Использование linux-perf напрямую с `d8`

В зависимости от вашего сценария использования, возможно, вам потребуется использовать linux-perf напрямую с `d8`.
Это требует двухэтапного процесса: сначала `perf record` создает файл `perf.data`, который должен быть обработан с помощью `perf inject` для добавления JS-символов.

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### Флаги linux-perf для V8

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) используется в командной строке V8 для записи выборок производительности в JIT-коде.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) требуется для отключения защиты записи в памяти кода. Это необходимо, потому что `perf` отбрасывает информацию о страницах кода при событии удаления бита записи из страницы кода. Вот пример, который записывает выборки из тестового файла JavaScript:

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) используется для создания различных точек входа (скопированных версий InterpreterEntryTrampoline) для интерпретируемых функций, чтобы их можно было различать с помощью `perf` только по адресу. Поскольку InterpreterEntryTrampoline должен быть скопирован, это приводит к небольшому снижению производительности и увеличению использования памяти.


### Использование linux-perf с chrome напрямую

1. Вы можете использовать те же флаги V8 для профилирования самого chrome. Следуйте инструкциям выше для правильных флагов V8 и добавьте [требуемые флаги gn для chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) в вашу сборку chrome.

1. После того как сборка будет готова, вы можете профилировать веб-сайт с полными символами для C++ и JS кода.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags=&apos;--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack&apos;
    ```

1. После запуска chrome найдите id процесса рендерера с помощью диспетчера задач, и используйте его для начала профилирования:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. Перейдите на ваш веб-сайт, а затем продолжайте следовать следующему разделу о том, как оценить вывод perf.

1. После завершения выполнения объедините статическую информацию, собранную инструментом `perf`, с образцами производительности, выведенными V8 для JIT-кода:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. Наконец, вы можете использовать инструмент Linux `perf` [для исследования](#Explore-linux-perf-results)

## Сборка `perf`

Если у вас устаревшее ядро Linux, вы можете локально собрать linux-perf с поддержкой jit.

- Установите новое ядро Linux, а затем перезагрузите компьютер:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- Установите зависимости:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- Скачайте исходные коды ядра, включающие последние исходные коды инструмента `perf`:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

На следующих этапах вызывайте `perf` как `some/director/tip/tools/perf/perf`.
