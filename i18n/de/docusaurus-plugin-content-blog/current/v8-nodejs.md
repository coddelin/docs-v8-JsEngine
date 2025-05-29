---
title: "V8 ❤️ Node.js"
author: "Franziska Hinkelmann, Node Monkey Patcher"
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: "Dieser Blogbeitrag hebt einige der jüngsten Bemühungen hervor, Node.js in V8 und Chrome DevTools besser zu unterstützen."
---
Die Beliebtheit von Node.js ist in den letzten Jahren stetig gewachsen, und wir haben daran gearbeitet, Node.js besser zu machen. Dieser Blogbeitrag beleuchtet einige der jüngsten Bemühungen in V8 und DevTools.

## Node.js in DevTools debuggen

Sie können jetzt [Node-Anwendungen mithilfe der Chrome-Entwicklertools debuggen](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t). Das Chrome DevTools-Team hat den Quellcode, der das Debugging-Protokoll implementiert, von Chromium nach V8 verlagert und dadurch Node Core erleichtert, die Debugger-Quellen und Abhängigkeiten auf dem neuesten Stand zu halten. Auch andere Browseranbieter und IDEs nutzen das Chrome-Debugging-Protokoll, um das Entwicklererlebnis bei der Arbeit mit Node insgesamt zu verbessern.

<!--truncate-->
## ES2015-Geschwindigkeitsverbesserungen

Wir arbeiten hart daran, V8 schneller denn je zu machen. [Ein Großteil unserer jüngsten Leistungsarbeit konzentriert sich auf ES6-Funktionen](/blog/v8-release-56), einschließlich Promises, Generatoren, Destruktoren und Rest/Spread-Operatoren. Da die Versionen von V8 in Node 6.2 und höher ES6 vollständig unterstützen, können Node-Entwickler neue Sprachfeatures "nativ" ohne Polyfills verwenden. Das bedeutet, dass Node-Entwickler oft die ersten sind, die von ES6-Leistungsverbesserungen profitieren. Ebenso sind sie häufig die ersten, die Leistungsregressionen erkennen. Dank einer aufmerksamen Node-Community haben wir eine Reihe von Regressionen entdeckt und behoben, darunter Leistungsprobleme bei [`instanceof`](https://github.com/nodejs/node/issues/9634), [`buffer.length`](https://github.com/nodejs/node/issues/9006), [langen Argumentlisten](https://github.com/nodejs/node/pull/9643) und [`let`/`const`](https://github.com/nodejs/node/issues/9729).

## Korrekturen für das `vm`-Modul und REPL in Node.js kommen

Das [`vm`-Modul](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html) hatte [einige langjährige Einschränkungen](https://github.com/nodejs/node/issues/6283). Um diese Probleme angemessen zu lösen, haben wir die V8-API erweitert, um ein intuitiveres Verhalten zu implementieren. Wir freuen uns, ankündigen zu können, dass die Verbesserungen des vm-Moduls eines der Projekte sind, die wir als Mentoren im Rahmen von [Outreachy für die Node Foundation](https://nodejs.org/en/foundation/outreachy/) unterstützen. Wir hoffen, in naher Zukunft weitere Fortschritte bei diesem und anderen Projekten zu sehen.

## `async`/`await`

Mit asynchronen Funktionen können Sie asynchronen Code drastisch vereinfachen, indem Sie den Programmfluss umschreiben, indem Promises sequentiell abgewartet werden. `async`/`await` wird in Node [mit dem nächsten V8-Update](https://github.com/nodejs/node/pull/9618) eingeführt. Unsere jüngsten Arbeiten zur Verbesserung der Leistung von Promises und Generatoren haben dazu beigetragen, dass asynchrone Funktionen schnell sind. In einem verwandten Hinweis arbeiten wir auch an der Bereitstellung von [Promise-Hooks](https://bugs.chromium.org/p/v8/issues/detail?id=4643), einer Reihe von Introspektions-APIs, die für die [Node Async Hook API](https://github.com/nodejs/node-eps/pull/18) erforderlich sind.

## Möchten Sie die neueste Node.js-Version ausprobieren?

Wenn Sie begeistert sind, die neuesten V8-Funktionen in Node zu testen und keine Angst davor haben, modernste, instabile Software zu verwenden, können Sie unseren Integrationszweig [hier](https://github.com/v8/node/tree/vee-eight-lkgr) ausprobieren. [V8 wird kontinuierlich in Node integriert](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration), bevor V8 Node.js erreicht, sodass wir Probleme frühzeitig erkennen können. Seien Sie jedoch gewarnt, dies ist experimenteller als der aktuelle Stand von Node.js.
