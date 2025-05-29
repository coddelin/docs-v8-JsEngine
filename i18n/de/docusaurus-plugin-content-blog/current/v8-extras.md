---
title: "V8-Extras"
author: "Domenic Denicola ([@domenic](https://twitter.com/domenic)), Streams-Zauberer"
avatars:
  - "domenic-denicola"
date: 2016-02-04 13:33:37
tags:
  - internals
description: "V8 v4.8 umfasst „V8-Extras“, eine einfache Schnittstelle, die es Embedding-Anwendungen ermöglicht, hochleistungsfähige, selbst gehostete APIs zu schreiben."
---
V8 implementiert eine große Teilmenge der eingebauten Objekte und Funktionen der JavaScript-Sprache in JavaScript selbst. Beispielsweise ist unsere [Promises-Implementierung](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js) in JavaScript geschrieben. Solche eingebauten Objekte nennt man _self-hosted_. Diese Implementierungen sind in unserem [Startup-Snapshot](/blog/custom-startup-snapshots) enthalten, sodass neue Kontexte schnell erstellt werden können, ohne die selbst gehosteten Built-ins zur Laufzeit einrichten und initialisieren zu müssen.

<!--truncate-->
Embedding-Anwendungen von V8, wie etwa Chromium, wünschen manchmal ebenfalls, APIs in JavaScript zu schreiben. Dies funktioniert besonders gut für Plattform-Funktionen, die in sich abgeschlossen sind, wie [Streams](https://streams.spec.whatwg.org/), oder für Funktionen, die Teil einer „geschichteten Plattform“ von höherwertigen Fähigkeiten sind, die auf bestehenden niedrigeren Ebenen aufbauen. Obwohl es immer möglich ist, zusätzlichen Code zur Startzeit auszuführen, um die embedder APIs zu bootstrappen (wie z. B. in Node.js), sollten Embedding-Anwendungen idealerweise dieselben Geschwindigkeitsvorteile für ihre selbst gehosteten APIs erhalten können, die V8 genießt.

V8-Extras sind eine neue Funktion von V8, ab unserer [v4.8-Veröffentlichung](/blog/v8-release-48), die darauf abzielt, Embedding-Anwendungen zu ermöglichen, hochleistungsfähige, selbst gehostete APIs über eine einfache Schnittstelle zu schreiben. Extras sind von Embedding-Anwendungen bereitgestellte JavaScript-Dateien, die direkt in den V8-Snapshot kompiliert werden. Sie haben auch Zugang zu einigen Hilfsprogrammen, die das Schreiben sicherer APIs in JavaScript erleichtern.

## Ein Beispiel

Eine zusätzliche V8-Datei ist einfach eine JavaScript-Datei mit einer bestimmten Struktur:

```js
(function(global, binding, v8) {
  'use strict';
  const Object = global.Object;
  const x = v8.createPrivateSymbol('x');
  const y = v8.createPrivateSymbol('y');

  class Vec2 {
    constructor(theX, theY) {
      this[x] = theX;
      this[y] = theY;
    }

    norm() {
      return binding.computeNorm(this[x], this[y]);
    }
  }

  Object.defineProperty(global, 'Vec2', {
    value: Vec2,
    enumerable: false,
    configurable: true,
    writable: true
  });

  binding.Vec2 = Vec2;
});
```

Hier sind ein paar Dinge zu beachten:

- Das `global`-Objekt ist nicht in der Scope-Kette vorhanden, sodass jeglicher Zugriff darauf (wie der auf `Object`) explizit durch das bereitgestellte `global`-Argument erfolgen muss.
- Das `binding`-Objekt dient dazu, Werte für den Embedder zu speichern oder Werte aus ihm abzurufen. Eine C++-API `v8::Context::GetExtrasBindingObject()` ermöglicht den Zugriff auf das `binding`-Objekt von der Seite des Embedders. In unserem Beispiel führen wir die Normberechnung durch den Embedder aus; in einem realen Beispiel könnten Sie den Embedder mit etwas Schwierigerem wie der URL-Auflösung beauftragen. Wir fügen dem `binding`-Objekt auch den `Vec2`-Konstruktor hinzu, damit Embedder-Code `Vec2`-Instanzen erstellen kann, ohne über das möglicherweise veränderliche `global`-Objekt zu gehen.
- Das `v8`-Objekt stellt eine kleine Anzahl von APIs bereit, damit Sie sicheren Code schreiben können. Hier erstellen wir private Symbole, um unseren internen Zustand auf eine Weise zu speichern, die von außen nicht beeinflusst werden kann. (Private Symbole sind ein V8-internes Konzept und haben in Standard-JavaScript-Code keinen Sinn.) Die eingebauten Funktionen von V8 verwenden oft „%-Funktionsaufrufe“ für solche Dinge, aber V8-Extras können keine %-Funktionen verwenden, da sie ein internes Implementierungsdetail von V8 sind und nicht geeignet für Embedder, sich darauf zu verlassen.

Sie fragen sich vielleicht, woher diese Objekte kommen. Alle drei werden im [V8-Bootstrapper](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/bootstrapper.cc) initialisiert, der einige grundlegende Eigenschaften installiert, aber den größten Teil der Initialisierung V8s selbst gehostetem JavaScript überlässt. Zum Beispiel installiert fast jede .js-Datei in V8 etwas auf `global`; siehe z. B. [promise.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/promise.js&sq=package:chromium&l=439) oder [uri.js](https://code.google.com/p/chromium/codesearch#chromium/src/v8/src/js/uri.js&sq=package:chromium&l=371). Und wir installieren APIs auf dem `v8`-Objekt an [mehreren Stellen](https://code.google.com/p/chromium/codesearch#search/&q=extrasUtils&sq=package:chromium&type=cs). (Das `binding`-Objekt ist leer, bis es von einem Extra oder Embedder manipuliert wird, sodass der einzige relevante Code innerhalb von V8 derjenige ist, bei dem der Bootstrapper es erstellt.)

Schließlich, um V8 mitzuteilen, dass wir ein Extra kompilieren werden, fügen wir unserer Projekt-gypfile eine Zeile hinzu:

```js
'v8_extra_library_files': ['./Vec2.js']
```

(Sie können ein Beispiel aus der Praxis [in der Gyp-Datei von V8 sehen](https://code.google.com/p/chromium/codesearch#chromium/src/v8/build/standalone.gypi&sq=package:chromium&type=cs&l=170).)

## V8-Extras in der Praxis

V8-Extras bieten Embedders eine neue und leichte Möglichkeit, Funktionen zu implementieren. JavaScript-Code kann JavaScript-Built-ins wie Arrays, Maps oder Promises einfacher manipulieren; er kann andere JavaScript-Funktionen unkompliziert aufrufen; und er kann mit Ausnahmen auf idiomatische Weise umgehen. Im Gegensatz zu C++-Implementierungen profitieren Funktionen, die über V8-Extras in JavaScript implementiert wurden, von Inlining, und das Aufrufen dieser Funktionen verursacht keine Kosten durch das Überqueren von Grenzen. Diese Vorteile sind besonders bemerkenswert, wenn man sie mit traditionellen Bindungssystemen wie Chromium’s Web IDL Bindings vergleicht.

V8-Extras wurden im letzten Jahr eingeführt und verfeinert, und Chromium nutzt sie derzeit, um [Streams zu implementieren](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/core/streams/ReadableStream.js). Chromium erwägt auch den Einsatz von V8-Extras für die Implementierung von [Scroll-Anpassungen](https://codereview.chromium.org/1333323003) und [effizienten Geometrie-APIs](https://groups.google.com/a/chromium.org/d/msg/blink-dev/V_bJNtOg0oM/VKbbYs-aAgAJ).

V8-Extras sind noch ein laufendes Projekt, und die Schnittstelle weist einige Unebenheiten und Nachteile auf, die wir im Laufe der Zeit beheben möchten. Der primäre Bereich mit Verbesserungsmöglichkeiten ist die Debugging-Story: Fehler sind nicht leicht zu lokalisieren, und Runtime-Debugging wird meist mit Print-Ausgaben durchgeführt. In Zukunft hoffen wir, V8-Extras in die Entwicklerwerkzeuge und das Tracing-Framework von Chromium zu integrieren, sowohl für Chromium selbst als auch für jede andere Einbettung, die das gleiche Protokoll verwendet.

Ein weiterer Grund zur Vorsicht bei der Verwendung von V8-Extras ist der zusätzliche Entwickleraufwand, der erforderlich ist, um sicheren und robusten Code zu schreiben. V8-Extras-Code arbeitet direkt am Snapshot, genauso wie der Code für die selbstgehosteten Built-ins von V8. Er greift auf die gleichen Objekte wie Userland-JavaScript zu, ohne Bindungsschicht oder separaten Kontext, der solchen Zugriff verhindern könnte. Beispielsweise gibt es bei etwas scheinbar Einfachem wie `global.Object.prototype.hasOwnProperty.call(obj, 5)` sechs mögliche Wege, wie es aufgrund von Benutzercode, der die Built-ins modifiziert, fehlschlagen könnte (zählen Sie sie!). Embedders wie Chromium müssen gegen jeglichen Benutzercode robust sein, unabhängig von seinem Verhalten, und in solchen Umgebungen ist beim Schreiben von Extras mehr Sorgfalt erforderlich als beim Schreiben von traditionell in C++ implementierten Funktionen.

Wenn Sie mehr über V8-Extras erfahren möchten, schauen Sie sich unser [Design-Dokument](https://docs.google.com/document/d/1AT5-T0aHGp7Lt29vPWFr2-qG8r3l9CByyvKwEuA8Ec0/edit#heading=h.32abkvzeioyz) an, das viel detaillierter auf das Thema eingeht. Wir freuen uns darauf, V8-Extras zu verbessern und weitere Funktionen hinzuzufügen, die es Entwicklern und Embedders ermöglichen, ausdrucksstarke und leistungsstarke Erweiterungen des V8-Runtime zu schreiben.
