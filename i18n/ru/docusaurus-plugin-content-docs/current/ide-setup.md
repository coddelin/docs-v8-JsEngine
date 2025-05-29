---
title: "Настройка GUI и IDE"
description: "Этот документ содержит советы, специфичные для GUI и IDE, по работе с базой кода V8."
---
Исходный код V8 можно просмотреть онлайн с помощью [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/).

К Git-репозиторию этого проекта можно получить доступ, используя множество других клиентских программ и плагинов. Для получения дополнительной информации обратитесь к документации клиента.

## Visual Studio Code и clangd

Инструкции по настройке VSCode для V8 можно найти в этом [документе](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/). Это текущая рекомендуемая конфигурация (2021).

## Eclipse

Инструкции по настройке Eclipse для V8 можно найти в этом [документе](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/). Замечание: начиная с 2020 года, индексирование V8 с помощью Eclipse работает плохо.

## Visual Studio Code и cquery

VSCode и cquery предоставляют хорошие возможности для навигации по коду. Они предлагают «перейти к определению», а также «найти все ссылки» для символов C++ и работают довольно хорошо. В этом разделе описывается, как получить базовую настройку в системе *nix.

### Установить VSCode

Установите VSCode удобным для вас способом. Во всем этом руководстве предполагается, что вы можете запустить VSCode из командной строки с помощью команды `code`.

### Установить cquery

Клонируйте cquery из [cquery](https://github.com/cquery-project/cquery) в выбранный вами каталог. В этом руководстве мы используем `CQUERY_DIR="$HOME/cquery"`.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

Если что-то пошло не так, обязательно ознакомьтесь с [руководством по началу работы cquery](https://github.com/cquery-project/cquery/wiki).

Вы можете использовать `git pull && git submodule update`, чтобы обновить cquery позже (не забудьте выполнить сборку снова через `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`).

### Установить и настроить плагин cquery для VSCode

Установите расширение cquery из Marketplace в VSCode. Откройте VSCode в вашем каталоге V8:

```bash
cd v8
code .
```

Перейдите к настройкам в VSCode, например, с помощью сочетания клавиш <kbd>Ctrl</kbd> + <kbd>,</kbd>.

Добавьте следующее в конфигурацию рабочего пространства, заменив `YOURUSERNAME` и `YOURV8CHECKOUTDIR` на соответствующие значения.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### Предоставить `compile_commands.json` для cquery

Последним шагом является генерация compile_commands.json для cquery. Этот файл будет содержать конкретные строки команд компилятора, используемые при сборке V8 для cquery. Выполните следующую команду в каталоге V8:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

Этот процесс нужно периодически повторять, чтобы сообщить cquery о новых исходных файлах. В частности, команду следует выполнять после изменения файла `BUILD.gn`.

### Другие полезные настройки

Автоматическое закрытие скобок в Visual Studio Code работает не очень хорошо. Его можно отключить следующим образом:

```json
"editor.autoClosingBrackets": false
```

в пользовательских настройках.

Следующие маски исключения помогут избежать нежелательных результатов при использовании поиска (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>):

```js
"files.exclude": {
  "**/.vscode": true,  // это значение по умолчанию
},
"search.exclude": {
  "**/out*": true,     // это значение по умолчанию
  "**/build*": true    // это значение по умолчанию
},
```
