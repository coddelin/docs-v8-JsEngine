---
title: "V8 на конференции BlinkOn 6"
author: "команда V8"
date: "2016-07-21 13:33:37"
tags: 
  - презентации
description: "Обзор презентаций команды V8 на BlinkOn 6."
---
BlinkOn — это проходящая дважды в год встреча участников Blink, V8, и Chromium. BlinkOn 6 состоялся в Мюнхене 16 и 17 июня. Команда V8 представила несколько презентаций об архитектуре, дизайне, инициативах по повышению производительности и реализации языка.

<!--truncate-->
Презентации V8 на BlinkOn представлены ниже.

## Производительность JavaScript в реальных условиях

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Длительность: 31:41
- [Слайды](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

Излагает историю измерения производительности JavaScript в V8, различные этапы создания тестов и новую технику измерения загрузки страниц реальных популярных сайтов с подробным анализом времени на каждый компонент V8.

## Ignition: интерпретатор для V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Длительность: 36:39
- [Слайды](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

Представляет новый интерпретатор Ignition от V8, объясняя архитектуру движка в целом и влияние Ignition на использование памяти и производительность запуска.

## Как мы измеряем и оптимизируем RAIL в сборщике мусора V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Длительность: 27:11
- [Слайды](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

Объясняет, как V8 использует метрики Response, Animation, Idle, Loading (RAIL) для достижения низкой задержки при сборке мусора и последние оптимизации, направленные на уменьшение рывков на мобильных устройствах.

## ECMAScript 2015 и далее

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Длительность: 28:52
- [Слайды](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

Обновление о реализации новых функций языка в V8, их интеграции с веб-платформой и процессе стандартизации, который продолжает развивать язык ECMAScript.

## Трассировка оболочек от V8 к Blink (короткий доклад)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Длительность: 2:31
- [Слайды](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

Обозначает трассировку оболочек между объектами V8 и Blink и как это помогает предотвратить утечки памяти и уменьшить задержки.
