---
title: &apos;Кросс-компиляция и отладка для ARM/Android&apos;
description: &apos;Этот документ объясняет, как выполнять кросс-компиляцию V8 для ARM/Android и как его отлаживать.&apos;
---
Сначала убедитесь, что вы можете [собирать с GN](/docs/build-gn).

Затем добавьте `android` в ваш файл конфигурации `.gclient`.

```python
target_os = [&apos;android&apos;]  # Добавьте это, чтобы проверить Android.
```

Поле `target_os` является списком, поэтому, если вы также собираете на unix, оно будет выглядеть так:

```python
target_os = [&apos;android&apos;, &apos;unix&apos;]  # Несколько целевых ОС.
```

Запустите `gclient sync`, и вы получите большую проверку в каталоге `./third_party/android_tools`.

Включите режим разработчика на вашем телефоне или планшете и включите отладку через USB, следуя инструкциям [здесь](https://developer.android.com/studio/run/device.html). Также убедитесь, что инструмент [`adb`](https://developer.android.com/studio/command-line/adb.html) находится в вашем пути. Он находится в `./third_party/android_sdk/public/platform-tools` в вашей проверке.

## Использование `gm`

Используйте [скрипт `tools/dev/gm.py`](/docs/build-gn#gm), чтобы автоматически создавать тесты V8 и запускать их на устройстве.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

Эта команда загружает бинарные файлы и тесты в каталог `/data/local/tmp/v8` на устройстве.

## Ручная сборка

Используйте `v8gen.py`, чтобы создать выпускную или отладочную сборку для ARM:

```bash
tools/dev/v8gen.py arm.release
```

Затем запустите `gn args out.gn/arm.release` и убедитесь, что у вас есть следующие ключи:

```python
target_os = "android"      # Эти строки необходимо изменить вручную
target_cpu = "arm"         # так как v8gen.py предполагает сборку симулятора.
v8_target_cpu = "arm"
is_component_build = false
```

Ключи должны быть одинаковыми для отладочных сборок. Если вы собираете для устройства с arm64, такого как Pixel C, поддерживающего 32-битные и 64-битные бинарные файлы, ключи должны выглядеть так:

```python
target_os = "android"      # Эти строки необходимо изменить вручную
target_cpu = "arm64"       # так как v8gen.py предполагает сборку симулятора.
v8_target_cpu = "arm64"
is_component_build = false
```

Теперь соберите:

```bash
ninja -C out.gn/arm.release d8
```

Используйте `adb`, чтобы скопировать бинарный файл и файлы снапшотов на телефон:

```bash
adb shell &apos;mkdir -p /data/local/tmp/v8/bin&apos;
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
Версия V8 5.8.0 (кандидат)
d8> &apos;w00t!&apos;
"w00t!"
d8>
```

## Отладка

### d8

Удаленная отладка `d8` на устройстве Android относительно проста. Сначала запустите `gdbserver` на устройстве Android:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

Затем подключитесь к серверу на устройстве хоста.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` и `gdbserver` должны быть совместимы друг с другом, если есть сомнения, используйте бинарные файлы из [Android NDK](https://developer.android.com/ndk). Обратите внимание, что по умолчанию бинарный файл `d8` очищен (информация для отладки удалена), но `$OUT_DIR/exe.unstripped/d8` содержит бинарный файл без удаления.

### Логирование

По умолчанию часть отладочного вывода `d8` оказывается в системном логе Android, который можно вывести с помощью [`logcat`](https://developer.android.com/studio/command-line/logcat). К сожалению, иногда часть конкретного отладочного вывода распределяется между системным журналом и `adb`, а иногда некоторая часть полностью отсутствует. Чтобы избежать этих проблем, рекомендуется добавить следующее настройку в `gn args`:

```python
v8_android_log_stdout = true
```

### Проблемы с плавающей точкой

Настройка `arm_float_abi = "hard"` в `gn args`, которая используется ботом V8 Arm GC Stress, может привести к полностью бессмысленному поведению программы на оборудовании, отличном от того, которое использует бот GC stress (например, на Nexus 7).

## Использование Sourcery G++ Lite

Пакет кросс-компилятора Sourcery G++ Lite является бесплатной версией Sourcery G++ от [CodeSourcery](http://www.codesourcery.com/). Существует страница для [GNU Toolchain for ARM Processors](http://www.codesourcery.com/sgpp/lite/arm). Определите, какая версия нужна для вашей комбинации хоста/целевого устройства.

Следующие инструкции используют [2009q1-203 для ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858), и если используется другая версия, измените ниже URL-адреса и `TOOL_PREFIX` соответственно.

### Установка на хосте и целевом устройстве

Самый простой способ настройки — установить полный пакет Sourcery G++ Lite как на хосте, так и на целевом устройстве в одном месте. Это обеспечит доступность всех необходимых библиотек на обеих сторонах. Если вы хотите использовать библиотеки по умолчанию на хосте, нет необходимости ничего устанавливать на целевом устройстве.

Следующий скрипт устанавливается в `/opt/codesourcery`:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## Профилирование

- Скомпилировать бинарный файл, загрузить его на устройство, сохранить копию на хосте:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- Получить журнал профилирования и скопировать его на хост:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- Откройте `v8.log` в вашем любимом редакторе и измените первую строку так, чтобы она соответствовала полному пути к бинарному файлу `d8-version.under.test` на вашем рабочем компьютере (вместо пути `/data/local/tmp/v8/bin/`, который был на устройстве)

- Запустите обработчик тиков с использованием хостовой версии `d8` и подходящего бинарного файла `nm`:

    ```bash
    cp out/x64.release/d8 .  # необходимо только один раз
    cp out/x64.release/natives_blob.bin .  # необходимо только один раз
    cp out/x64.release/snapshot_blob.bin .  # необходимо только один раз
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
