---
title: 'Code-Caching'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), Software Engineer'
avatars:
  - 'yang-guo'
date: 2015-07-27 13:33:37
tags:
  - internals
description: 'V8 unterstützt jetzt das (Byte-)Code-Caching, d.h. das Zwischenspeichern des Ergebnisses der JavaScript-Analyse und -Kompilierung.'
---
V8 verwendet die [Just-in-Time-Kompilierung](https://de.wikipedia.org/wiki/Just-in-time-Kompilierung) (JIT), um JavaScript-Code auszuführen. Das bedeutet, dass ein Skript unmittelbar vor seiner Ausführung analysiert und kompiliert werden muss — was zu erheblichem Aufwand führen kann. Wie wir [kürzlich angekündigt haben](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html), ist Code-Caching eine Technik, die diesen Aufwand verringert. Wenn ein Skript zum ersten Mal kompiliert wird, werden Cache-Daten erzeugt und gespeichert. Das nächste Mal, wenn V8 dasselbe Skript kompiliert, auch in einer anderen V8-Instanz, kann es die Cache-Daten nutzen, um das Kompilierungsergebnis erneut zu erstellen, anstatt von Grund auf zu kompilieren. Dadurch wird das Skript deutlich schneller ausgeführt.

<!--truncate-->
Code-Caching ist seit Version 4.2 von V8 verfügbar und nicht nur auf Chrome beschränkt. Es wird über die API von V8 bereitgestellt, sodass jeder V8-Einbettungskontext davon profitieren kann. Der [Testfall](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090), der verwendet wird, um dieses Feature zu testen, dient als Beispiel für die Nutzung dieser API.

Wenn ein Skript von V8 kompiliert wird, können Cache-Daten erzeugt werden, um spätere Kompilierungen zu beschleunigen, indem `v8::ScriptCompiler::kProduceCodeCache` als Option übergeben wird. Wenn die Kompilierung erfolgreich ist, werden die Cache-Daten an das Quellobjekt angehängt und können über `v8::ScriptCompiler::Source::GetCachedData` abgerufen werden. Diese können dann für später, beispielsweise durch Speichern auf der Festplatte, aufbewahrt werden.

Bei späteren Kompilierungen können die zuvor erzeugten Cache-Daten an das Quellobjekt angehängt und `v8::ScriptCompiler::kConsumeCodeCache` als Option übergeben werden. Diesmal wird der Code viel schneller erzeugt, da V8 das Kompilieren des Codes überspringt und ihn aus den bereitgestellten Cache-Daten deserialisiert.

Die Erzeugung von Cache-Daten verursacht bestimmte Rechen- und Speicheraufwände. Aus diesem Grund erzeugt Chrome Cache-Daten nur, wenn dasselbe Skript innerhalb weniger Tage mindestens zweimal aufgerufen wird. Auf diese Weise kann Chrome Skriptdateien durchschnittlich doppelt so schnell in ausführbaren Code umwandeln und den Benutzern bei jedem nachfolgenden Seitenaufruf wertvolle Zeit sparen.
