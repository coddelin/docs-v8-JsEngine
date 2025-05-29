---
title: "Die Einführung des Web Tooling Benchmark"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), JavaScript Performance Juggler"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - Benchmarks
  - Node.js
description: "Die brandneuen Web Tooling Benchmark hilft dabei, V8-Leistungsengpässe in Babel, TypeScript und anderen realen Projekten zu identifizieren und zu beheben."
tweet: "927572065598824448"
---
Die JavaScript-Leistung war für das V8-Team schon immer wichtig, und in diesem Beitrag möchten wir einen neuen JavaScript [Web Tooling Benchmark](https://v8.github.io/web-tooling-benchmark) vorstellen, den wir kürzlich verwendet haben, um einige Leistungsengpässe in V8 zu identifizieren und zu beheben. Sie wissen möglicherweise bereits über V8s [starkes Engagement für Node.js](/blog/v8-nodejs) Bescheid, und dieses Benchmark erweitert dieses Engagement, indem es speziell Leistungstests mit gängigen Entwickler-Tools durchführt, die auf Node.js basieren. Die Tools im Web Tooling Benchmark sind dieselben, die von Entwicklern und Designern heute verwendet werden, um moderne Websites und Cloud-basierte Anwendungen zu erstellen. In Fortsetzung unserer laufenden Bemühungen, den Fokus auf [realistische Leistung](/blog/real-world-performance/) statt auf künstliche Benchmarks zu richten, haben wir das Benchmark mit tatsächlichem Code erstellt, den Entwickler jeden Tag ausführen.

<!--truncate-->
Die Web Tooling Benchmark-Suite wurde von Anfang an so gestaltet, dass sie wichtige [Entwickler-Tooling-Anwendungsfälle](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling) für Node.js abdeckt. Da sich das V8-Team auf die Kern-JavaScript-Leistung konzentriert, haben wir das Benchmark so entwickelt, dass es sich auf die JavaScript-Arbeitslasten fokussiert und die Messung von Node.js-spezifischen I/O- oder externen Interaktionen ausschließt. Dadurch sind Benchmarks in Node.js, in allen Browsern und in allen wichtigen JavaScript-Engine-Shells wie `ch` (ChakraCore), `d8` (V8), `jsc` (JavaScriptCore) und `jsshell` (SpiderMonkey) möglich. Obwohl das Benchmark nicht auf Node.js beschränkt ist, freuen wir uns darüber, dass die [Node.js-Benchmarking-Arbeitsgruppe](https://github.com/nodejs/benchmarking) erwägt, das Tooling-Benchmark als Standard für Node-Leistung zu verwenden ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138)).

Die einzelnen Tests im Tooling-Benchmark decken eine Vielzahl von Tools ab, die Entwickler häufig zur Erstellung JavaScript-basierter Anwendungen verwenden, beispielsweise:

- Der [Babel](https://github.com/babel/babel)-Transpiler mit der `es2015`-Voreinstellung.
- Der Parser, der von Babel verwendet wird – namens [Babylon](https://github.com/babel/babylon) – ausgeführt auf mehreren beliebten Eingaben (einschließlich der [lodash](https://lodash.com/) und [Preact](https://github.com/developit/preact)-Bundles).
- Der [acorn](https://github.com/ternjs/acorn)-Parser, der von [webpack](http://webpack.js.org/) verwendet wird.
- Der [TypeScript](http://www.typescriptlang.org/)-Compiler, der auf dem [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular)-Beispielprojekt aus dem [TodoMVC](https://github.com/tastejs/todomvc)-Projekt ausgeführt wird.

Details zu allen enthaltenen Tests finden Sie in der [detaillierten Analyse](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md).

Basierend auf früheren Erfahrungen mit anderen Benchmarks wie [Speedometer](http://browserbench.org/Speedometer), bei denen Tests schnell veraltet sind, sobald neue Versionen von Frameworks verfügbar werden, haben wir dafür gesorgt, dass es einfach ist, jedes der Tools im Benchmark auf neuere Versionen zu aktualisieren, sobald sie veröffentlicht werden. Durch die Basis der Benchmark-Suite auf die npm-Infrastruktur können wir sie leicht aktualisieren, um sicherzustellen, dass sie immer den Stand der Technik in JavaScript-Entwicklungstools testet. Das Aktualisieren eines Testfalls ist einfach eine Frage des Erhöhens der Version in der `package.json`-Manifestdatei.

Wir haben einen [Nachverfolgungsfehler](http://crbug.com/v8/6936) und eine [Tabelle](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw) erstellt, um alle relevanten Informationen zu enthalten, die wir bis zu diesem Zeitpunkt über die Leistung von V8 beim neuen Benchmark gesammelt haben. Unsere Untersuchungen haben bereits einige interessante Ergebnisse gebracht. Beispielsweise haben wir festgestellt, dass V8 häufig den langsamen Weg für `instanceof` ([v8:6971](http://crbug.com/v8/6971)) verwendete, was zu einer etwa 3–4×-Verringerung der Geschwindigkeit führte. Wir haben auch Leistungsengpässe in bestimmten Fällen von Eigenschaftszuweisungen der Form `obj[name] = val` gefunden und behoben, bei denen `obj` über `Object.create(null)` erstellt wurde. In diesen Fällen würde V8 trotz der Tatsache, dass `obj` ein `null`-Prototyp hat, vom schnellen Weg abweichen ([v8:6985](http://crbug.com/v8/6985)). Diese und andere Entdeckungen, die mit Hilfe dieses Benchmarks gemacht wurden, verbessern V8 nicht nur in Node.js, sondern auch in Chrome.

Wir haben nicht nur darauf geachtet, V8 schneller zu machen, sondern auch Performance-Bugs in den Tools und Bibliotheken des Benchmarks behoben und upstream weitergegeben, wann immer wir sie gefunden haben. Zum Beispiel entdeckten wir mehrere Performance-Bugs in [Babel](https://github.com/babel/babel), bei denen Code-Muster wie

```js
value = items[items.length - 1];
```

dazu führten, dass auf die Eigenschaft `"-1"` zugegriffen wurde, weil der Code nicht überprüfte, ob `items` vorher leer ist. Dieses Code-Muster führt dazu, dass V8 einen langsamen Pfad durchläuft, bedingt durch die `"-1"`-Abfrage, obwohl eine leicht geänderte, äquivalente Version des JavaScripts viel schneller ist. Wir halfen, diese Probleme in Babel zu beheben ([babel/babel#6582](https://github.com/babel/babel/pull/6582), [babel/babel#6581](https://github.com/babel/babel/pull/6581) und [babel/babel#6580](https://github.com/babel/babel/pull/6580)). Außerdem entdeckten und behoben wir einen Fehler, bei dem Babel über die Länge eines Strings hinaus zugriff ([babel/babel#6589](https://github.com/babel/babel/pull/6589)), was ebenfalls einen langsamen Pfad in V8 auslöste. Zusätzlich haben wir [Lesezugriffe außerhalb des definierten Bereichs von Arrays und Strings](https://twitter.com/bmeurer/status/926357262318305280) in V8 optimiert. Wir freuen uns darauf, [weiter mit der Community zusammenzuarbeiten](https://twitter.com/rauchg/status/924349334346276864), um die Performance dieses wichtigen Anwendungsfalls zu verbessern, nicht nur, wenn er auf V8 ausgeführt wird, sondern auch bei anderen JavaScript-Engines wie ChakraCore.

Unser starker Fokus auf die reale Performance und insbesondere auf die Verbesserung beliebter Node.js-Workloads zeigt sich in den kontinuierlichen Verbesserungen der V8-Punktzahl im Benchmark über die letzten Releases hinweg:

![](/_img/web-tooling-benchmark/chart.svg)

Seit V8 v5.8, dem letzten V8-Release vor dem [Wechsel zur Ignition+TurboFan-Architektur](/blog/launching-ignition-and-turbofan), hat sich die V8-Punktzahl im Tooling-Benchmark um rund **60%** verbessert.

In den letzten Jahren hat das V8-Team erkannt, dass kein einzelner JavaScript-Benchmark – selbst ein gut gemeinter und sorgfältig erstellter – als alleiniger Indikator für die Gesamtleistung einer JavaScript-Engine verwendet werden sollte. Dennoch glauben wir, dass der neue **Web Tooling Benchmark** Bereiche der JavaScript-Leistung hervorhebt, auf die es sich zu konzentrieren lohnt. Trotz des Namens und der anfänglichen Motivation haben wir festgestellt, dass die Web Tooling Benchmark-Suite nicht nur für Tooling-Workloads repräsentativ ist, sondern auch für eine große Bandbreite komplexerer JavaScript-Anwendungen, die durch front-end-fokussierte Benchmarks wie Speedometer nicht gut getestet werden. Es ist keineswegs ein Ersatz für Speedometer, sondern vielmehr eine ergänzende Testsammlung.

Die beste Nachricht ist, dass wir erwarten können, dass unsere jüngsten Verbesserungen bei den Benchmark-Punktzahlen, da der Web Tooling Benchmark auf realen Workloads basiert, direkt in eine höhere Produktivität der Entwickler übersetzt werden, indem [weniger Zeit für das Warten auf Builds verloren geht](https://xkcd.com/303/). Viele dieser Verbesserungen sind bereits in Node.js verfügbar: Zum Zeitpunkt des Schreibens verwendet Node 8 LTS V8 v6.1 und Node 9 V8 v6.2.

Die neueste Version des Benchmarks ist unter [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/) verfügbar.
