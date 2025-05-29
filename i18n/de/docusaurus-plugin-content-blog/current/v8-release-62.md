---
title: "V8 Veröffentlichung v6.2"
author: "das V8 Team"
date: "2017-09-11 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v6.2 enthält Leistungsverbesserungen, weitere JavaScript-Sprachfunktionen, eine erhöhte maximale Zeichenfolgenlänge und mehr."
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 als Teil unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8's Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2), anzukündigen, der bis zur Veröffentlichung in Verbindung mit Chrome 62 Stable in einigen Wochen in der Beta-Phase ist. V8 v6.2 ist vollgepackt mit allerlei Entwicklertools und Funktionen. Dieser Beitrag gibt eine Vorschau auf einige Highlights, um die Veröffentlichung vorwegzunehmen.

<!--truncate-->
## Leistungsverbesserungen

Die Leistung von [`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) wurde zuvor bereits als potenzieller Engpass identifiziert, da sie oft von beliebten Bibliotheken wie [lodash](https://lodash.com/) und [underscore.js](http://underscorejs.org/) sowie von Frameworks wie [AngularJS](https://angularjs.org/) verwendet wird. Verschiedene Hilfsfunktionen wie [`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50), [`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25), [`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741) oder [`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689) werden häufig in Anwendung- und Bibliothekscode verwendet, um Laufzeittypprüfungen durchzuführen.

Mit der Einführung von ES2015 wurde `Object#toString` durch das neue [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)-Symbol modifizierbar, was `Object#toString` schwergewichtiger und schwierig zu beschleunigen machte. In dieser Version haben wir eine Optimierung portiert, die ursprünglich in der [SpiderMonkey JavaScript-Engine](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0) implementiert wurde, wodurch die Durchsatzleistung von `Object#toString` um den Faktor **6,5×** gesteigert wurde.

![](/_img/v8-release-62/perf.svg)

Dies wirkt sich auch auf den Speedometer-Browser-Benchmark aus, insbesondere auf den AngularJS-Untertest, bei dem wir eine solide Verbesserung von 3% gemessen haben. Lesen Sie den [detaillierten Blogbeitrag](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015) für weitere Informationen.

![](/_img/v8-release-62/speedometer.svg)

Wir haben auch die Leistung von [ES2015-Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) erheblich verbessert, wodurch das Aufrufen eines Proxy-Objekts über `someProxy(params)` oder `new SomeOtherProxy(params)` um bis zu **5×** beschleunigt wurde:

![](/_img/v8-release-62/proxy-call-construct.svg)

Ähnlich wurde die Leistung des Zugriffs auf eine Eigenschaft eines Proxy-Objekts über `someProxy.property` um fast **6,5×** verbessert:

![](/_img/v8-release-62/proxy-property.svg)

Dies ist Teil eines laufenden Praktikums. Bleiben Sie dran für einen detaillierten Blogbeitrag und die endgültigen Ergebnisse.

Wir freuen uns auch bekannt zu geben, dass dank [Beiträgen](https://chromium-review.googlesource.com/c/v8/v8/+/620150) von [Peter Wong](https://twitter.com/peterwmwong) die Leistung der [`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes)-Funktion gegenüber der vorherigen Version um mehr als **3×** verbessert wurde.

Hashcode-Abfragen für interne Hashtabellen wurden deutlich schneller, was zu einer verbesserten Leistung für `Map`, `Set`, `WeakMap` und `WeakSet` führt. Ein bevorstehender Blogbeitrag wird diese Optimierung detailliert erklären.

![](/_img/v8-release-62/hashcode-lookups.png)

Der Garbage Collector verwendet jetzt einen [Parallel Scavenger](https://bugs.chromium.org/p/chromium/issues/detail?id=738865) zur Sammlung der sogenannten Young Generation des Heaps.

## Verbesserter Niedrigspeichermodus

In den letzten Veröffentlichungen wurde der Niedrigspeichermodus von V8 optimiert (z. B. durch [Festlegen der anfänglichen Semi-Space-Größe auf 512 KB](https://chromium-review.googlesource.com/c/v8/v8/+/594387)). Geräte mit wenig Speicher stoßen jetzt seltener auf Out-of-Memory-Situationen. Dieses Verhalten bei niedrigem Speicherbedarf könnte jedoch negative Auswirkungen auf die Laufzeitleistung haben.

## Weitere reguläre Ausdrucksfunktionen

Die Unterstützung für [den `dotAll`-Modus](https://github.com/tc39/proposal-regexp-dotall-flag) für reguläre Ausdrücke, aktiviert durch das `s`-Flag, ist jetzt standardmäßig aktiviert. Im `dotAll`-Modus stimmt das `.`-Atom in regulären Ausdrücken auf jedes Zeichen zu, einschließlich Zeilenumbrüchen.

```js
/foo.bar/su.test('foo\nbar'); // true
```

[Lookbehind Assertions](https://github.com/tc39/proposal-regexp-lookbehind), ein weiteres neues Feature für reguläre Ausdrücke, sind jetzt standardmäßig verfügbar. Der Name beschreibt die Bedeutung bereits ziemlich gut. Lookbehind Assertions bieten eine Möglichkeit, ein Muster so einzuschränken, dass es nur dann übereinstimmt, wenn es von dem Muster in der Lookbehind-Gruppe vorangegangen wird. Sie sind sowohl in übereinstimmenden als auch in nicht übereinstimmenden Varianten verfügbar:

```js
/(?<=\$)\d+/.exec('$1 is worth about ¥123'); // ['1']
/(?<!\$)\d+/.exec('$1 is worth about ¥123'); // ['123']
```

Weitere Details zu diesen Features finden Sie in unserem Blogbeitrag mit dem Titel [Upcoming regular expression features](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

## Revision der Template-Literals

Die Einschränkung von Escape-Sequenzen in Template-Literals wurde [gemäß dem zugrunde liegenden Vorschlag](https://tc39.es/proposal-template-literal-revision/) gelockert. Dies ermöglicht neue Anwendungsfälle für Template-Tags, wie das Schreiben eines LaTeX-Prozessors.

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{Fun!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{King!}}
Breve über das h geht \u{h}er // Ungültiges Token!
`;
```

## Erhöhte maximale Zeichenkettenlänge

Die maximale Zeichenkettenlänge auf 64-Bit-Plattformen wurde von `2**28 - 16` auf `2**30 - 25` Zeichen erhöht.

## Full-codegen ist weg

In V8 v6.2 sind die letzten großen Teile der alten Pipeline entfernt worden. Mehr als 30.000 Codezeilen wurden in dieser Version gelöscht — ein klarer Gewinn zur Reduzierung der Komplexität des Codes.

## V8 API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig ein paar Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8 Checkout](/docs/source-code#using-git) können `git checkout -b 6.2 -t branch-heads/6.2` verwenden, um mit den neuen Funktionen in V8 v6.2 zu experimentieren. Alternativ können Sie [Chrome’s Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
