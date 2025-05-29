---
title: 'Über die Hash-Flooding-Sicherheitslücke in Node.js…'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed))'
avatars:
  - 'yang-guo'
date: 2017-08-11 13:33:37
tags:
  - sicherheit
description: 'Node.js litt unter einer Hash-Flooding-Sicherheitslücke. Dieser Beitrag liefert Hintergrundinformationen und erklärt die Lösung in V8.'
---
Anfang Juli dieses Jahres hat Node.js ein [Sicherheitsupdate](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/) für alle derzeit gepflegten Zweige veröffentlicht, um eine Hash-Flooding-Sicherheitslücke zu beheben. Dieser Zwischenfix geht jedoch auf Kosten einer signifikanten Verschlechterung der Startleistung. In der Zwischenzeit hat V8 eine Lösung implementiert, die die Leistungseinbußen vermeidet.

<!--truncate-->
In diesem Beitrag möchten wir Hintergrundinformationen und die Geschichte der Sicherheitslücke sowie die endgültige Lösung geben.

## Hash-Flooding-Angriff

Hash-Tabellen gehören zu den wichtigsten Datenstrukturen in der Informatik. Sie werden in V8 häufig verwendet, zum Beispiel zum Speichern der Eigenschaften eines Objekts. Im Durchschnitt ist das Einfügen eines neuen Eintrags sehr effizient mit [𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation). Hash-Kollisionen könnten jedoch zu einem Worst-Case von 𝒪(n) führen. Das bedeutet, dass das Einfügen von n Einträgen bis zu 𝒪(n²) dauern kann.

In Node.js werden [HTTP-Header](https://nodejs.org/api/http.html#http_response_getheaders) als JavaScript-Objekte dargestellt. Paare von Header-Namen und -Werten werden als Objekteigenschaften gespeichert. Mit geschickt vorbereiteten HTTP-Anfragen könnte ein Angreifer eine Denial-of-Service-Attacke ausführen. Ein Node.js-Prozess würde nicht mehr reagieren, da er damit beschäftigt wäre, die Hash-Tabellen im Worst-Case einzufügen.

Dieser Angriff wurde bereits [im Dezember 2011](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html) offengelegt und es wurde gezeigt, dass er eine breite Palette von Programmiersprachen betrifft. Warum hat es so lange gedauert, bis V8 und Node.js dieses Problem endlich angesprochen haben?

Tatsächlich haben V8-Ingenieure sehr bald nach der Offenlegung zusammen mit der Node.js-Community an einer [Abschwächung](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) gearbeitet. Seit Node.js v0.11.8 wurde dieses Problem angesprochen. Der Fix führte einen sogenannten _Hash-Seed-Wert_ ein. Der Hash-Seed wird zufällig beim Start ausgewählt und bei jedem Hash-Wert in einer bestimmten V8-Instanz verwendet. Ohne Kenntnis des Hash-Seeds hat ein Angreifer es schwer, den Worst-Case zu treffen, geschweige denn einen Angriff zu entwickeln, der auf alle Node.js-Instanzen abzielt.

Dies ist Teil der [Commit-Message](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) des Fixes:

> Diese Version löst das Problem nur für diejenigen, die V8 selbst kompilieren oder diejenigen, die keine Snapshots verwenden. Ein auf Snapshot basierendes vorkompiliertes V8 wird weiterhin vorhersehbare String-Hash-Codes haben.

Diese Version löst das Problem nur für diejenigen, die V8 selbst kompilieren oder diejenigen, die keine Snapshots verwenden. Ein auf Snapshot basierendes vorkompiliertes V8 wird weiterhin vorhersehbare String-Hash-Codes haben.

## Start-Snapshot

Start-Snapshots sind ein Mechanismus in V8, um sowohl den Start der Engine als auch das Erstellen neuer Kontexte (z. B. über das [vm-Modul](https://nodejs.org/api/vm.html) in Node.js) erheblich zu beschleunigen. Anstatt initiale Objekte und interne Datenstrukturen von Grund auf einzurichten, deserialisiert V8 aus einem vorhandenen Snapshot. Ein aktueller Build von V8 mit Snapshots startet in weniger als 3ms und benötigt einen Bruchteil einer Millisekunde, um einen neuen Kontext zu erstellen. Ohne Snapshot dauert der Start mehr als 200ms, und ein neuer Kontext mehr als 10ms. Das ist ein Unterschied von zwei Größenordnungen.

Wir haben bereits erklärt, wie jeder V8-Embedder Start-Snapshots in [einem früheren Beitrag](/blog/custom-startup-snapshots) nutzen kann.

Ein vorkompilierter Snapshot enthält Hash-Tabellen und andere auf Hash-Werten basierende Datenstrukturen. Einmal vom Snapshot initialisiert, kann der Hash-Seed nicht mehr geändert werden, ohne diese Datenstrukturen zu beschädigen. Ein Node.js-Release, das den Snapshot bündelt, hat einen festen Hash-Seed, was die Abschwächung unwirksam macht.

Das ist die explizite Warnung in der Commit-Message.

## Fast gelöst, aber noch nicht ganz

Spulen wir bis 2015 vor, meldet ein Node.js-[Issue](https://github.com/nodejs/node/issues/1631), dass das Erstellen eines neuen Kontexts in der Leistung zurückgegangen ist. Wenig überraschend liegt dies daran, dass der Start-Snapshot als Teil der Abschwächung deaktiviert wurde. Aber zu diesem Zeitpunkt war sich nicht jeder Teilnehmer der Diskussion des [Grundes](https://github.com/nodejs/node/issues/528#issuecomment-71009086) bewusst.

Wie in diesem [Beitrag](/blog/math-random) erklärt, verwendet V8 einen Pseudo-Zufallszahlengenerator, um Math.random-Ergebnisse zu erzeugen. Jeder V8-Kontext hat eine eigene Kopie des Zustands des Zufallszahlengenerators. Dies dient dazu, vorhersehbare Math.random-Ergebnisse zwischen den Kontexten zu verhindern.

Der Zustand des Zufallszahlengenerators wird unmittelbar nach der Erstellung des Kontexts von einer externen Quelle initialisiert. Es spielt keine Rolle, ob der Kontext neu erstellt oder aus einem Snapshot deserialisiert wird.

Der Zustand des Zufallszahlengenerators wurde irgendwie [verwechselt](https://github.com/nodejs/node/issues/1631#issuecomment-100044148) mit dem Hash-Seed. Infolgedessen wurde ab [io.js v2.0.2](https://github.com/nodejs/node/pull/1679) ein vorgefertigter Snapshot Teil der offiziellen Veröffentlichung.

## Zweiter Versuch

Erst im Mai 2017, während interner Diskussionen zwischen V8, [Google’s Project Zero](https://googleprojectzero.blogspot.com/) und Google’s Cloud Platform, stellten wir fest, dass Node.js noch immer anfällig für Hash-Flooding-Angriffe war.

Die erste Reaktion kam von unseren Kollegen [Ali](https://twitter.com/ofrobots) und [Myles](https://twitter.com/MylesBorins) aus dem Team hinter den [Node.js-Angeboten der Google Cloud Platform](https://cloud.google.com/nodejs/). Sie arbeiteten mit der Node.js-Community zusammen, um den [Startup-Snapshot standardmäßig zu deaktivieren](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d). Dieses Mal fügten sie auch einen [Testfall](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a) hinzu.

Aber wir wollten es nicht dabei belassen. Das Deaktivieren des Startup-Snapshots hat [erhebliche](https://github.com/nodejs/node/issues/14229) Leistungseinbußen zur Folge. Im Laufe der Jahre haben wir viele neue [Sprach-](/blog/high-performance-es2015) [features](/blog/webassembly-browser-preview) und [anspruchsvolle](/blog/launching-ignition-and-turbofan) [Optimierungen](/blog/speeding-up-regular-expressions) zu V8 hinzugefügt. Einige dieser Ergänzungen machten den Neuaufbau von Grund auf noch teurer. Unmittelbar nach der Sicherheitsveröffentlichung begannen wir mit der Arbeit an einer langfristigen Lösung. Ziel ist es, den [Startup-Snapshot wieder zu aktivieren](https://github.com/nodejs/node/issues/14171), ohne anfällig für Hash-Flooding zu werden.

Unter den [vorgeschlagenen Lösungen](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit) wählten und implementierten wir die pragmatischste. Nach der Deserialisierung aus dem Snapshot wählen wir einen neuen Hash-Seed. Betroffene Datenstrukturen werden dann neu gehasht, um die Konsistenz sicherzustellen.

Es stellte sich heraus, dass im normalen Startup-Snapshot tatsächlich nur wenige Datenstrukturen betroffen sind. Und zu unserer Freude wurde das [Neue-Hash-Tabellen-Hashing](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69) inzwischen in V8 erleichtert. Der damit verbundene Overhead ist unerheblich.

Der Patch zur Wiederaktivierung des Startup-Snapshots wurde [in](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) [Node.js zusammengeführt](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d). Er ist Teil der aktuellen Node.js v8.3.0 [Veröffentlichung](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367).
