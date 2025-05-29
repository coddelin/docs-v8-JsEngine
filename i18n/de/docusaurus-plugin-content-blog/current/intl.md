---
title: "Schnellere und funktionsreichere Internationalisierungs-APIs"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2019-04-25 16:45:37
avatars:
  - "sathya-gunasekaran"
tags:
  - ECMAScript
  - Intl
description: "Die JavaScript Internationalization API wächst und ihre V8-Implementierung wird schneller!"
tweet: "1121424877142122500"
---
[Die ECMAScript Internationalization API-Spezifikation](https://tc39.es/ecma402/) (ECMA-402, oder `Intl`) bietet wichtige lokalisierungsspezifische Funktionen wie Datumsformatierung, Zahlenformatierung, Pluralformauswahl und Sortierung. Die Chrome-V8- und Google-Internationalisierungsteams haben an der Erweiterung der Funktionen der ECMA-402-Implementierung von V8 gearbeitet, während sie technischen Schulden abbauen und die Leistung sowie die Interoperabilität mit anderen Browsern verbessern.

<!--truncate-->
## Grundlegende architektonische Verbesserungen

Anfangs wurde die ECMA-402-Spezifikation hauptsächlich in JavaScript mithilfe von V8-Erweiterungen implementiert und lag außerhalb des V8-Codebestands. Die Verwendung der externen Extension-API bedeutete, dass mehrere der intern verwendeten V8-APIs für die Typprüfung, Lebensdauerverwaltung externer C++-Objekte und die interne Speicherung privater Daten nicht verwendet werden konnten. Zur Verbesserung der Startleistung wurde diese Implementierung später in den V8-Codebestand verschoben, um [Snapshots](/blog/custom-startup-snapshots) dieser Builtins zu ermöglichen.

V8 verwendet spezialisierte `JSObject`s mit benutzerdefinierten [Formen (hidden classes)](https://mathiasbynens.be/notes/shapes-ics), um eingebaute JavaScript-Objekte wie `Promise`s, `Map`s, `Set`s usw. zu beschreiben, wie sie von ECMAScript spezifiziert sind. Mit diesem Ansatz kann V8 die erforderliche Anzahl interner Slots vorab zuweisen und schnellen Zugriff auf diese ermöglichen, anstatt das Objekt langsam Eigenschaft für Eigenschaft zu erweitern, was zu schlechterer Leistung und erhöhtem Speicherverbrauch führen würde.

Die `Intl`-Implementierung war als Folge der historischen Trennung nicht nach einer solchen Architektur modelliert. Stattdessen waren alle eingebauten JavaScript-Objekte, wie sie von der Internationalisierungs-Spezifikation spezifiziert wurden (z.B. `NumberFormat`, `DateTimeFormat`), generische `JSObject`s, die mehrere Eigenschaftserweiterungen für ihre internen Slots durchlaufen mussten.

Ein weiteres Artefakt des Fehlens spezialisierter `JSObject`s war, dass die Typprüfung jetzt komplexer war. Die Typinformationen wurden unter einem privaten Symbol gespeichert und sowohl auf der JS- als auch auf der C++-Seite mittels teuren Eigenschaftszugriffen geprüft, anstatt einfach ihre Form nachzuschlagen.

### Modernisierung des Codebestands

Mit dem aktuellen Übergang weg von selbstgehosteten Builtins in V8 war es sinnvoll, diese Gelegenheit zu nutzen, um die ECMA-402-Implementierung zu modernisieren.

### Abkehr von selbstgehostetem JS

Obwohl das Selbsthosting zu prägnantem und leserlichem Code führt, führte die häufige Nutzung langsamer Laufzeitaufrufe zum Zugriff auf ICU-APIs zu Leistungsproblemen. Infolgedessen wurde viel ICU-Funktionalität in JavaScript dupliziert, um die Anzahl solcher Laufzeitaufrufe zu reduzieren.

Durch das Umschreiben der Builtins in C++ wurde der Zugriff auf die ICU-APIs erheblich beschleunigt, da nun keine Laufzeitkosten mehr anfallen.

### Verbesserung von ICU

ICU ist eine Sammlung von C/C++-Bibliotheken, die von vielen Anwendungen, einschließlich aller großen JavaScript-Engines, zur Bereitstellung von Unicode- und Globalisierungsunterstützung verwendet wird. Im Rahmen der Umstellung von `Intl` auf ICU in der V8-Implementierung haben wir [mehrere](https://unicode-org.atlassian.net/browse/ICU-20140) [Bugs](https://unicode-org.atlassian.net/browse/ICU-9562) [gefunden](https://unicode-org.atlassian.net/browse/ICU-20098) und behoben.

Im Rahmen der Implementierung neuer Vorschläge wie [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), [`Intl.ListFormat`](/features/intl-listformat) und `Intl.Locale` haben wir ICU durch das Hinzufügen [mehrerer](https://unicode-org.atlassian.net/browse/ICU-13256) [neuer](https://unicode-org.atlassian.net/browse/ICU-20121) [APIs](https://unicode-org.atlassian.net/browse/ICU-20342) erweitert, um diese neuen ECMAScript-Vorschläge zu unterstützen.

All diese Ergänzungen helfen anderen JavaScript-Engines, diese Vorschläge jetzt schneller zu implementieren und treiben das Web voran! Zum Beispiel arbeiten Entwickler in Firefox daran, basierend auf unserer ICU-Arbeit mehrere neue `Intl`-APIs zu implementieren.

## Leistung

Durch diese Arbeiten haben wir die Leistung der Internationalisierungs-API verbessert, indem wir mehrere schnelle Zugriffswege optimiert und die Initialisierung der verschiedenen `Intl`-Objekte sowie der Methoden `toLocaleString` in `Number.prototype`, `Date.prototype` und `String.prototype` zwischengespeichert haben.

Zum Beispiel wurde das Erstellen eines neuen `Intl.NumberFormat`-Objekts um etwa das 24-Fache schneller.

![[Microbenchmarks](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js), die die Leistung bei der Erstellung verschiedener `Intl`-Objekte testen](/_img/intl/performance.svg)

Bitte beachten Sie, dass es für eine bessere Leistung empfohlen wird, explizit ein `Intl.NumberFormat`-, `Intl.DateTimeFormat`- oder `Intl.Collator`-Objekt zu erstellen *und wiederzuverwenden*, anstatt Methoden wie `toLocaleString` oder `localeCompare` aufzurufen.

## Neue `Intl`-Funktionen

All diese Arbeiten haben eine großartige Grundlage geschaffen, um neue Funktionen darauf aufzubauen, und wir setzen die Implementierung aller neuen Internationalisierungs-Vorschläge fort, die sich in der Phase 3 befinden.

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) wurde in Chrome 71 ausgeliefert, [`Intl.ListFormat`](/features/intl-listformat) in Chrome 72, [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) in Chrome 74, und [`dateStyle` und `timeStyle` Optionen für `Intl.DateTimeFormat`](https://github.com/tc39/proposal-intl-datetime-style) sowie [BigInt-Unterstützung für `Intl.DateTimeFormat`](https://github.com/tc39/ecma402/pull/236) werden in Chrome 76 ausgeliefert. [`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange), [`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/) und [zusätzliche Optionen für `Intl.NumberFormat`](https://github.com/tc39/proposal-unified-intl-numberformat/) befinden sich derzeit in der Entwicklung in V8, und wir hoffen, sie bald auszuliefern!

Viele dieser neuen APIs und weitere, die sich in der Pipeline befinden, sind das Ergebnis unserer Arbeit zur Standardisierung neuer Funktionen, um Entwicklern bei der Internationalisierung zu helfen. [`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) ist ein Vorschlag der Phase 1, der es Benutzern ermöglicht, die Anzeigennamen von Sprache, Region oder Skript zu lokalisieren. [`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) ist ein Vorschlag der Phase 3, der eine Möglichkeit spezifiziert, Datumsbereiche auf eine prägnante und lokalbewusste Weise zu formatieren. [Der vereinheitlichte `Intl.NumberFormat`-API-Vorschlag](https://github.com/tc39/proposal-unified-intl-numberformat) ist ein Vorschlag der Phase 3, der `Intl.NumberFormat` durch Unterstützung für Maßeinheiten, Währungs- und Anzeigevorschriften sowie wissenschaftliche und kompakte Notationen verbessert. Sie können sich auch an der Zukunft von ECMA-402 beteiligen, indem Sie [im zugehörigen GitHub-Repository](https://github.com/tc39/ecma402) beitragen.

## Fazit

`Intl` bietet eine funktionsreiche API für mehrere Operationen, die zur Internationalisierung Ihrer Web-App erforderlich sind, und überlässt dem Browser die schwere Arbeit, ohne so viele Daten oder Code über die Leitung übertragen zu müssen. Durch die gründliche Nutzung dieser APIs kann Ihre Benutzeroberfläche in verschiedenen Regionen besser funktionieren. Dank der Arbeit von Googles V8- und i18n-Teams in Zusammenarbeit mit TC39 und seiner ECMA-402-Untergruppe können Sie jetzt auf mehr Funktionen mit besserer Leistung zugreifen und im Laufe der Zeit weitere Verbesserungen erwarten.
