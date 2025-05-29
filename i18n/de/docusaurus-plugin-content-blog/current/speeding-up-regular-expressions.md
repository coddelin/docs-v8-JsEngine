---
title: &apos;Beschleunigung von V8-Regulären Ausdrücken&apos;
author: &apos;Jakob Gruber, Softwareingenieur für reguläre Ausdrücke&apos;
avatars:
  - &apos;jakob-gruber&apos;
date: 2017-01-10 13:33:37
tags:
  - internals
  - RegExp
description: &apos;V8 hat kürzlich die eingebauten Funktionen von regulären Ausdrücken von einer in sich gehosteten JavaScript-Implementierung auf eine umgestellt, die direkt in unsere neue Code-Generierungsarchitektur auf Basis von TurboFan integriert ist.&apos;
---
Dieser Blogbeitrag behandelt die jüngste Migration der eingebauten Funktionen von regulären Ausdrücken in V8 von einer in sich gehosteten JavaScript-Implementierung auf eine, die direkt in unsere neue Code-Generierungsarchitektur auf Basis von [TurboFan](/blog/v8-release-56) integriert ist.

<!--truncate-->
Die RegExp-Implementierung von V8 basiert auf [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html), das weithin als einer der schnellsten RegExp-Engines gilt. Während der Engine selbst die Low-Level-Logik für das Musterabgleich mit Zeichenketten kapselt, führen Funktionen auf dem RegExp-Prototyp wie [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) die zusätzliche Arbeit aus, die erforderlich ist, um seine Funktionalität für den Benutzer verfügbar zu machen.

Historisch gesehen wurden in V8 verschiedene Komponenten in JavaScript implementiert. Bis vor Kurzem war `regexp.js` eine davon und beherbergte die Implementierung des RegExp-Konstruktors, all seiner Eigenschaften sowie der Eigenschaften seines Prototyps.

Leider hat dieser Ansatz Nachteile, einschließlich unvorhersehbarer Leistung und teurer Übergänge zur C++-Laufzeit für Low-Level-Funktionalität. Die kürzliche Einführung von eingebautem Subclassing in ES6 (das es JavaScript-Entwicklern ermöglicht, ihre eigene angepasste RegExp-Implementierung bereitzustellen) hat zu weiteren Leistungseinbußen bei RegExp geführt, selbst wenn das eingebettete RegExp nicht unterklassiert wird. Diese Rückschritte konnten in der selbstgehosteten JavaScript-Implementierung nicht vollständig behoben werden.

Wir haben uns daher entschieden, die RegExp-Implementierung von JavaScript weg zu migrieren. Es stellte sich jedoch heraus, dass die Erhaltung der Leistung schwieriger war als erwartet. Eine anfängliche Migration zu einer vollständigen C++-Implementierung war deutlich langsamer und erreichte nur etwa 70% der Leistung der ursprünglichen Implementierung. Nach einigen Untersuchungen fanden wir mehrere Ursachen:

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) enthält einige extrem performancekritische Bereiche, insbesondere den Übergang zum zugrunde liegenden RegExp-Engine und die Konstruktion des RegExp-Ergebnisses mit den zugehörigen Unterstring-Aufrufen. Für diese stützte sich die JavaScript-Implementierung auf hochoptimierte Codeabschnitte, sogenannte „Stubs“, die entweder in nativer Assemblersprache geschrieben sind oder direkt in die Pipeline des Optimierungskompilers eingebunden sind. Von C++ aus ist der Zugriff auf diese Stubs nicht möglich, und ihre Laufzeitäquivalente sind deutlich langsamer.
- Zugriffe auf Eigenschaften wie `lastIndex` von RegExp können teuer sein und erfordern möglicherweise Namenssuchen und das Durchqueren der Prototypenkette. Der Optimierungskompiler von V8 kann solche Zugriffe oft automatisch durch effizientere Operationen ersetzen, während diese Fälle in C++ explizit behandelt werden müssten.
- In C++ müssen Referenzen auf JavaScript-Objekte in sogenannten `Handle`s eingeschlossen werden, um mit der Speicherbereinigung zusammenzuarbeiten. Das Handle-Management erzeugt im Vergleich zur reinen JavaScript-Implementierung zusätzlichen Overhead.

Unser neues Design für die RegExp-Migration basiert auf dem [CodeStubAssembler](/blog/csa), einem Mechanismus, der es V8-Entwicklern ermöglicht, plattformunabhängigen Code zu schreiben, der später vom selben Backend, das auch für den neuen Optimierungskompiler TurboFan verwendet wird, in schnellen, plattformspezifischen Code übersetzt wird. Die Verwendung des CodeStubAssemblers ermöglicht es uns, alle Schwächen der anfänglichen C++-Implementierung anzugehen. Stubs (wie der Einstiegspunkt in die RegExp-Engine) können problemlos aus dem CodeStubAssembler aufgerufen werden. Während schnelle Zugriffe auf Eigenschaften immer noch explizit auf sogenannten schnellen Pfaden implementiert werden müssen, sind solche Zugriffe im CodeStubAssembler äußerst effizient. Handles existieren einfach außerhalb von C++ nicht. Und da die Implementierung jetzt auf einer sehr niedrigen Ebene operiert, können wir zusätzliche Abkürzungen machen, wie das Überspringen von teuren Ergebniskonstruktionen, wenn diese nicht benötigt werden.

Die Ergebnisse waren äußerst positiv. Unsere Punktzahl bei [einem erheblichen RegExp-Arbeitslast](https://github.com/chromium/octane/blob/master/regexp.js) hat sich um 15 % verbessert und damit unsere kürzlichen Leistungseinbußen durch Subklassen mehr als wettgemacht. Mikrobenchmarks (Abbildung 1) zeigen Verbesserungen auf breiter Basis, von 7 % für [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) bis zu 102 % für [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split).

![Abbildung 1: RegExp-Geschwindigkeitssteigerung aufgeschlüsselt nach Funktionen](/_img/speeding-up-regular-expressions/perf.png)

Wie können Sie als JavaScript-Entwickler sicherstellen, dass Ihre RegExps schnell sind? Wenn Sie nicht daran interessiert sind, in RegExp-Interna einzuhaken, stellen Sie sicher, dass weder die RegExp-Instanz noch deren Prototyp modifiziert wird, um die beste Leistung zu erzielen:

```js
const re = /./g;
re.exec(&apos;&apos;);  // Schneller Weg.
re.new_property = &apos;langsam&apos;;
RegExp.prototype.new_property = &apos;ebenfalls langsam&apos;;
re.exec(&apos;&apos;);  // Langsamer Weg.
```

Und obwohl das Subklassieren von RegExps manchmal recht nützlich sein kann, sollten Sie sich bewusst sein, dass subklassierte RegExp-Instanzen eine allgemeinere Handhabung erfordern und daher den langsamen Weg nehmen:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec(&apos;&apos;);  // Langsamer Weg.
```

Die vollständige RegExp-Migration wird in V8 v5.7 verfügbar sein.
