---
title: "Решение проблем"
description: "Этот документ объясняет, как работать с проблемами в системе отслеживания ошибок V8."
---
Этот документ объясняет, как работать с проблемами в [системе отслеживания ошибок V8](/bugs).

## Как определить приоритет проблемы

- *Трекер V8*: Установите состояние `Untriaged`
- *Трекер Chromium*: Установите состояние `Untriaged` и добавьте компонент `Blink>JavaScript`

## Как назначить проблемы V8 в трекере Chromium

Пожалуйста, перенесите проблемы в очередь шерифов V8 по одной из следующих категорий:

- Память: `component:blink>javascript status=Untriaged label:Performance-Memory`
    - Будет отображаться в [этом](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles) запросе
- Стабильность: `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - Будет отображаться в [этом](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) запросе
    - Дополнительный CC не требуется, проблема будет автоматически обработана шерифом
- Производительность: `status=untriaged component:Blink>JavaScript label:Performance`
    - Будет отображаться в [этом](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2) запросе
    - Дополнительный CC не требуется, проблема будет автоматически обработана шерифом
- Clusterfuzz: Установите состояние бага следующим образом:
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - Будет отображаться в [этом](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) запросе.
    - Дополнительный CC не требуется, проблема будет автоматически обработана шерифом
- Безопасность: Все проблемы безопасности обрабатываются шерифами безопасности Chromium. Пожалуйста, ознакомьтесь с [документом о сообщении проблем безопасности](/docs/security-bugs) для получения дополнительной информации.

Если вам нужна помощь шерифа, пожалуйста, уточните информацию о ротации.

Используйте компонент `Blink>JavaScript` для всех проблем.

**Обратите внимание, что это применимо только к проблемам, отслеживаемым в трекере проблем Chromium.**
