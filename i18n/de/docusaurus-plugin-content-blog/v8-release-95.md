---
title: "V8-Version v9.5"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-09-21
tags: 
 - release
description: "Die V8-Version v9.5 bringt aktualisierte APIs zur Internationalisierung und Unterstützung für die Behandlung von WebAssembly-Ausnahmen."
tweet: "1440296019623759872"
---
Alle vier Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome Beta-Meilenstein aus V8s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5), anzukündigen, der sich bis zur Veröffentlichung in Koordination mit Chrome 95 Stable in einigen Wochen in der Beta-Phase befindet. V8 v9.5 ist mit allerlei Entwickler-Tools ausgestattet. Dieser Beitrag bietet eine Vorschau auf einige Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

In v8.1 haben wir die [`Intl.DisplayNames` API](https://v8.dev/features/intl-displaynames) API in Chrome 81 eingeführt, mit den unterstützten Typen „language“, „region“, „script“ und „currency“. Mit v9.5 haben wir nun zwei neue unterstützte Typen hinzugefügt: „calendar“ und „dateTimeField“. Diese geben die Anzeige-Namen verschiedener Kalenderarten und Datums-/Zeit-Felder entsprechend zurück:

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

Wir haben auch die Unterstützung für den Typ „language“ mit einer neuen languageDisplay-Option erweitert, die entweder „standard“ oder „dialect“ sein kann (als Standardwert, falls nicht angegeben):

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### Erweiterte `timeZoneName`-Option

`Intl.DateTimeFormat API` in v9.5 unterstützt nun vier neue Werte für die `timeZoneName`-Option:

- „shortGeneric“, um den Namen der Zeitzone in einem kurzen generischen Nicht-Standort-Format auszugeben, wie „PT“, „ET“, ohne anzugeben, ob es sich um Sommerzeit handelt.
- „longGeneric“, um den Namen der Zeitzone in einem langen generischen Nicht-Standort-Format auszugeben, wie „Pacific Time“, „Mountain Time“, ohne anzugeben, ob es sich um Sommerzeit handelt.
- „shortOffset“, um den Namen der Zeitzone im kurzen lokalisierten GMT-Format auszugeben, wie „GMT-8“.
- „longOffset“, um den Namen der Zeitzone im langen lokalisierten GMT-Format auszugeben, wie „GMT-0800“.

## WebAssembly

### Ausnahmebehandlung

V8 unterstützt jetzt den [Vorschlag zur Ausnahmebehandlung für WebAssembly (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md), sodass Module, die mit einer kompatiblen Toolchain kompiliert wurden (z. B. [Emscripten](https://emscripten.org/docs/porting/exceptions.html)), in V8 ausgeführt werden können. Der Vorschlag wurde entwickelt, um den Overhead im Vergleich zu den vorherigen Workarounds unter Verwendung von JavaScript gering zu halten.

Zum Beispiel haben wir den [Binaryen](https://github.com/WebAssembly/binaryen/) Optimierer zu WebAssembly mit alten und neuen Ausnahmebehandlungs-Implementierungen kompiliert.

Wenn die Ausnahmebehandlung aktiviert ist, verringert sich die Codegrößen-Erhöhung [von etwa 43 % für die alte JavaScript-basierte Ausnahmebehandlung auf nur 9 % für die neue Wasm EH-Funktion](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

Als wir `wasm-opt.wasm -O3` auf einigen großen Testdateien ausführten, zeigte die Wasm EH-Version keinen Leistungsabfall im Vergleich zur Basisversion ohne Ausnahmen, während die JavaScript-basierte EH-Version etwa 30 % länger benötigte.

Binaryen verwendet jedoch die Ausnahmeprüfung nur spärlich. Bei ausnahmeintensiven Arbeitslasten wird die Leistungsdifferenz voraussichtlich noch größer sein.

## V8 API

Die Haupt-Headerdatei v8.h wurde in mehrere Teile aufgeteilt, die separat eingebunden werden können. Beispielsweise enthält `v8-isolate.h` nun die Klasse `v8::Isolate`. Viele Header-Dateien, die Methoden deklarieren, die `v8::Local<T>` übergeben, können jetzt `v8-forward.h` importieren, um die Definition von `v8::Local` und alle v8-Heap-Objekttypen zu erhalten.

Bitte verwenden Sie `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h`, um eine Liste der API-Änderungen zu erhalten.
