---
title: 'Что делать, если ваш CL сломал сборку интеграции Node.js'
description: 'Этот документ объясняет, что делать, если ваш CL сломал сборку интеграции Node.js.'
---
[Node.js](https://github.com/nodejs/node) использует стабильную или бета-версию V8. Для дополнительной интеграции команда V8 собирает Node с [основной веткой](https://chromium.googlesource.com/v8/v8/+/refs/heads/main) V8, то есть с версией V8 на сегодняшний день. Мы предоставляем интеграционного бота для [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64), в то время как [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) и [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) находятся в процессе разработки.

Если бот [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) терпит неудачу в очереди коммитов V8, то либо существует реальная проблема с вашим CL (исправьте ее), либо необходимо внести изменения в [Node](https://github.com/v8/node/). Если тесты Node не прошли, найдите «Not OK» в лог-файлах. **Этот документ описывает, как воспроизвести проблему локально и как внести изменения в [форк Node V8](https://github.com/v8/node/), если ваш CL для V8 вызывает сбой сборки.**

## Исходный код

Выполните [инструкции](https://chromium.googlesource.com/v8/node-ci) в репозитории node-ci, чтобы извлечь исходный код.

## Тестирование изменений в V8

V8 настроен как зависимость DEPS в node-ci. Возможно, вы захотите применить изменения в V8 для тестирования или воспроизведения ошибок. Чтобы сделать это, добавьте основной каталог V8 как удаленный репозиторий:

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

Не забудьте запустить gclient hooks перед компиляцией.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Изменение Node.js

Node.js также настроен как зависимость `DEPS` в node-ci. Возможно, вы захотите внести изменения в Node.js, чтобы исправить сбои, вызванные изменениями в V8. Тесты V8 выполняются против [форка Node.js](https://github.com/v8/node). Вам потребуется учетная запись GitHub, чтобы внести изменения в этот форк.

### Получение исходного кода Node

Создайте форк [репозитория Node.js V8 на GitHub](https://github.com/v8/node/) (нажмите кнопку Fork), если вы ранее этого не сделали.

Добавьте ваши форк и форк V8 как удаленные репозитории к существующему местному клону:

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **Примечание** `<sync-date>` — это дата синхронизации с основным репозиторием Node.js. Выберите последнюю дату.

Внесите изменения в исходный код Node.js и зафиксируйте их. Затем отправьте изменения в GitHub:

```bash
git push <your-user-name> $BRANCH_NAME
```

И создайте запрос на включение изменений для ветки `node-ci-<sync-date>`.


После того как запрос на включение изменений будет объединен в форк Node.js для V8, вам необходимо обновить файл `DEPS` в node-ci и создать CL.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Обновить Node'
git cl upload
```
