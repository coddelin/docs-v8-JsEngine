---
title: &apos;Blitzschnelles Parsen, Teil 2: Lazy Parsing&apos;
author: &apos;Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)) und Marja Hölttä ([@marjakh](https://twitter.com/marjakh)), effizientere Parser&apos;
avatars:
  - &apos;toon-verwaest&apos;
  - &apos;marja-holtta&apos;
date: 2019-04-15 17:03:37
tags:
  - internals
  - parsing
tweet: &apos;1117807107972243456&apos;
description: &apos;Dies ist der zweite Teil unserer Artikelreihe, die erklärt, wie V8 JavaScript so schnell wie möglich parst.&apos;
---
Dies ist der zweite Teil unserer Serie, die erklärt, wie V8 JavaScript so schnell wie möglich parst. Der erste Teil erklärte, wie wir den [Scanner](/blog/scanner) von V8 beschleunigt haben.

Das Parsen ist der Schritt, bei dem Quellcode in eine Zwischenrepräsentation umgewandelt wird, die von einem Compiler (in V8 der Bytecode-Compiler [Ignition](/blog/ignition-interpreter)) verwendet wird. Parsen und Kompilieren erfolgen auf dem kritischen Pfad des Webseitenstarts, und nicht alle Funktionen, die an den Browser übermittelt werden, werden während des Starts sofort benötigt. Auch wenn Entwickler solchen Code mit asynchronen und verzögerten Skripten zurückstellen können, ist das nicht immer machbar. Darüber hinaus liefern viele Webseiten Code, der nur von bestimmten Funktionen verwendet wird, die ein Benutzer während eines einzelnen Durchlaufs der Seite möglicherweise überhaupt nicht aufruft.

<!--truncate-->
Das unnötige frühzeitige Kompilieren von Code bringt tatsächliche Ressourcenaufwände mit sich:

- CPU-Zyklen werden benötigt, um den Code zu erstellen, was die Verfügbarkeit von tatsächlich für den Start benötigtem Code verzögert.
- Codeobjekte beanspruchen Speicher, zumindest bis [Bytecode-Flushing](/blog/v8-release-74#bytecode-flushing) entscheidet, dass der Code derzeit nicht benötigt wird und ihn zur Garbage Collection freigibt.
- Code, der bis zum Abschluss der Ausführung des Top-Level-Skripts kompiliert wird, wird auf der Festplatte zwischengespeichert und beansprucht Speicherplatz.

Aus diesen Gründen implementieren alle großen Browser _Lazy Parsing_. Anstatt einen abstrakten Syntaxbaum (AST) für jede Funktion zu erstellen und ihn dann in Bytecode zu kompilieren, kann der Parser entscheiden, Funktionen „vorzuparsen“, die er findet, anstatt sie vollständig zu parsen. Dazu wechselt er zu [dem Vorparser](https://cs.chromium.org/chromium/src/v8/src/parsing/preparser.h?l=921&rcl=e3b2feb3aade83c02e4bd2fa46965a69215cd821), einer Kopie des Parsers, der das absolute Minimum ausführt, das erforderlich ist, um die Funktion zu überspringen. Der Vorparser überprüft, dass die Funktionen, die er überspringt, syntaktisch gültig sind, und liefert alle Informationen, die erforderlich sind, damit die äußeren Funktionen korrekt kompiliert werden können. Wenn später eine vorgeparste Funktion aufgerufen wird, wird sie vollständig geparst und bei Bedarf kompiliert.

## Variablenzuweisung

Die Hauptsache, die das Vorparsen erschwert, ist die Zuordnung von Variablen.

Aus Leistungsgründen werden Funktionsaktivierungen auf dem Maschinenstack verwaltet. Z. B. wenn eine Funktion `g` eine Funktion `f` mit den Argumenten `1` und `2` aufruft:

```js
function f(a, b) {
  const c = a + b;
  return c;
}

function g() {
  return f(1, 2);
  // Der Rücksprungzeiger von `f` zeigt jetzt hierher
  // (weil `f` beim `return` hierher zurückkehrt).
}
```

Zuerst wird der Empfänger (d. h. der `this`-Wert für `f`, der `globalThis` ist, da es sich um einen nicht strikten Funktionsaufruf handelt) auf den Stapel gelegt, gefolgt von der aufgerufenen Funktion `f`. Dann werden die Argumente `1` und `2` auf den Stapel gelegt. An diesem Punkt wird die Funktion `f` aufgerufen. Um den Aufruf auszuführen, speichern wir zunächst den Zustand von `g` auf dem Stapel: den „Rücksprungzeiger“ (`rip`; welcher Code benötigt wird, um zurückzukehren) von `f` sowie den „Frame-Zeiger“ (`fp`; wie der Stapel beim Zurückkehren aussehen soll). Dann treten wir in `f` ein, das Speicherplatz für die lokale Variable `c` sowie jeden temporären Speicherplatz, den es möglicherweise benötigt, zuweist. Dies stellt sicher, dass alle von der Funktion verwendeten Daten verschwinden, wenn die Funktionsaktivierung außer Gültigkeitsbereich gerät: Sie wird einfach vom Stapel entfernt.

![Stapelanordnung eines Aufrufs der Funktion `f` mit den Argumenten `a`, `b` und der lokalen Variable `c`, die auf dem Stapel zugewiesen sind.](/_img/preparser/stack-1.svg)

Das Problem bei diesem Aufbau ist, dass Funktionen Variablen referenzieren können, die in äußeren Funktionen deklariert wurden. Innere Funktionen können die Aktivierung überdauern, in der sie erstellt wurden:

```js
function make_f(d) { // ← Deklaration von `d`
  return function inner(a, b) {
    const c = a + b + d; // ← Referenz auf `d`
    return c;
  };
}

const f = make_f(10);

function g() {
  return f(1, 2);
}
```

Im obigen Beispiel wird die Referenz von `inner` auf die lokale Variable `d`, die in `make_f` deklariert wurde, ausgewertet, nachdem `make_f` zurückgegeben hat. Um dies zu implementieren, weisen VMs für Sprachen mit lexikalischen Abschlüssen Variablen, die von inneren Funktionen referenziert werden, auf dem Heap in einer Struktur zu, die als „Kontext“ bezeichnet wird.

![Stapelanordnung eines Aufrufs von `make_f` mit dem Argument, das in einem Kontext auf dem Heap kopiert wird, der später von `inner` verwendet wird und `d` erfasst.](/_img/preparser/stack-2.svg)

Das bedeutet, dass wir für jede in einer Funktion deklarierte Variable wissen müssen, ob eine innere Funktion die Variable referenziert, damit wir entscheiden können, ob die Variable im Stack oder in einem heap-zugewiesenen Kontext gespeichert werden soll. Wenn wir ein Funktionsliteral auswerten, erzeugen wir eine Closure, die sowohl auf den Code der Funktion als auch auf den aktuellen Kontext verweist: das Objekt, das die Werte der Variablen enthält, auf die sie möglicherweise zugreifen muss.

Kurz gesagt, wir müssen im Preparser zumindest die Variablenreferenzen verfolgen.

Würden wir jedoch nur die Referenzen verfolgen, würden wir überschätzen, welche Variablen referenziert werden. Eine in einer äußeren Funktion deklarierte Variable könnte durch eine Neudeklaration in einer inneren Funktion überschattet werden, sodass eine Referenz aus dieser inneren Funktion auf die innere Deklaration und nicht auf die äußere Deklaration zeigt. Würden wir die äußere Variable bedingungslos im Kontext speichern, würde die Leistung leiden. Um sicherzustellen, dass die Zuweisung von Variablen in Verbindung mit dem Preparsing ordnungsgemäß funktioniert, müssen wir daher sicherstellen, dass präparierte Funktionen sowohl Variablenreferenzen als auch Deklarationen korrekt verfolgen.

Code auf oberster Ebene ist eine Ausnahme von dieser Regel. Das oberste Level eines Skripts wird immer im Heap gespeichert, da Variablen skriptübergreifend sichtbar sind. Ein einfacher Weg, um einer gut funktionierenden Architektur nahe zu kommen, besteht darin, den Preparser ohne Variablenverfolgung auszuführen, um Top-Level-Funktionen schnell zu parsen, und den vollständigen Parser für innere Funktionen zu verwenden, diese jedoch nicht zu kompilieren. Dies ist kostspieliger als das Preparsing, da wir unnötigerweise einen gesamten AST aufbauen, aber es bringt uns ans Ziel. Genau dies machte V8 bis V8 v6.3 / Chrome 63.

## Dem Preparser Variablen beibringen

Das Verfolgen von Variablendeklarationen und Referenzen im Preparser ist kompliziert, da in JavaScript nicht immer von Anfang an klar ist, welche Bedeutung ein Teil-Ausdruck hat. Zum Beispiel, nehmen wir an, wir haben eine Funktion `f` mit einem Parameter `d`, die eine innere Funktion `g` hat, mit einem Ausdruck, der so aussieht, als könnte er `d` referenzieren.

```js
function f(d) {
  function g() {
    const a = ({ d }
```

Dieser könnte tatsächlich auf `d` verweisen, weil die Token, die wir gesehen haben, Teil eines Destrukturierungszuweisungsausdrucks sind.

```js
function f(d) {
  function g() {
    const a = ({ d } = { d: 42 });
    return a;
  }
  return g;
}
```

Es könnte sich auch um eine Pfeilfunktion mit einem Destrukturierungsparameter `d` handeln, in diesem Fall würde `d` in `f` nicht von `g` referenziert werden.

```js
function f(d) {
  function g() {
    const a = ({ d }) => d;
    return a;
  }
  return [d, g];
}
```

Unser ursprünglicher Preparser war zunächst als eigenständige Kopie des Parsers implementiert, ohne viel Teilen zu ermöglichen, was dazu führte, dass sich die beiden Parser im Laufe der Zeit auseinander entwickelten. Durch die Neuschreibung des Parsers und Präparsers basierend auf einer `ParserBase`, die das [seltsam wiederkehrende Template-Muster](https://de.wikipedia.org/wiki/Curiously_recurring_template_pattern) implementiert, konnten wir das Teilen maximieren und gleichzeitig die Leistungsvorteile separater Kopien beibehalten. Dadurch wurde das Hinzufügen einer vollständigen Variablenverfolgung zum Preparser erheblich vereinfacht, da ein Großteil der Implementierung zwischen Parser und Preparser geteilt werden kann.

Tatsächlich war es falsch, Variablendeklarationen und Referenzen selbst für Funktionen auf oberster Ebene zu ignorieren. Die ECMAScript-Spezifikation erfordert, dass verschiedene Typen von Variablenkonflikten bereits beim ersten Parsen des Skripts erkannt werden. Zum Beispiel wird eine Variable, die im selben Scope zweimal als lexikalische Variable deklariert wird, als [früher `SyntaxError`](https://tc39.es/ecma262/#early-error) betrachtet. Da unser Preparser Variablendeklarationen einfach übersprang, würde der Code während des Preparsings fälschlicherweise erlaubt. Damals hielten wir den Leistungsgewinn für gerechtfertigt, die Spezifikation zu verletzen. Jetzt, da der Preparser Variablen korrekt verfolgt, haben wir jedoch diese gesamte Klasse von spekulationsbezogenen Spezifikationsverletzungen ohne signifikante Leistungskosten ausgerottet.

## Innere Funktionen überspringen

Wie bereits erwähnt, wird eine präparierte Funktion beim ersten Aufruf vollständig geparst und der resultierende AST in Bytecode kompiliert.

```js
// Dies ist der oberste Scope.
function outer() {
  // präpariert
  function inner() {
    // präpariert
  }
}

outer(); // Parsiert und kompiliert `outer` vollständig, jedoch nicht `inner`.
```

Die Funktion verweist direkt auf den äußeren Kontext, der die Werte der Variablendeklarationen enthält, die inneren Funktionen verfügbar sein müssen. Um das träge Kompilieren von Funktionen zu ermöglichen (und um den Debugger zu unterstützen), verweist der Kontext auf ein Metadatenobjekt namens [`ScopeInfo`](https://cs.chromium.org/chromium/src/v8/src/objects/scope-info.h?rcl=ce2242080787636827dd629ed5ee4e11a4368b9e&l=36). `ScopeInfo`-Objekte beschreiben, welche Variablen in einem Kontext aufgelistet sind. Dies bedeutet, dass wir beim Kompilieren innerer Funktionen berechnen können, wo Variablen in der Kontextkette leben.

Um zu berechnen, ob die lazy compilierte Funktion selbst einen Kontext benötigt, müssen wir jedoch erneut eine Bereichsauflösung durchführen: Wir müssen wissen, ob Funktionen, die in der lazy-compilierten Funktion verschachtelt sind, auf die von der lazy-Funktion deklarierten Variablen verweisen. Dies können wir herausfinden, indem wir diese Funktionen erneut vorparsen. Genau das hat V8 bis V8 v6.3 / Chrome 63 getan. Dies ist jedoch leistungstechnisch nicht ideal, da es die Beziehung zwischen Quellcodegröße und Parsing-Kosten nicht linear macht: Wir würden Funktionen so oft vorparse, wie sie verschachtelt sind. Zusätzlich zur natürlichen Verschachtelung dynamischer Programme packen JavaScript-Packer häufig Code in „[sofort ausgeführte Funktionsausdrücke](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression)” (IIFEs), wodurch die meisten JavaScript-Programme mehrere Verschachtelungsebenen haben.

![Jedes erneute Parsen fügt mindestens die Kosten für das Parsen der Funktion hinzu.](/_img/preparser/parse-complexity-before.svg)

Um den nichtlinearen Leistungsaufwand zu vermeiden, führen wir eine vollständige Bereichsauflösung sogar während des Vorparsen durch. Wir speichern ausreichend Metadaten, sodass wir später einfach _innere Funktionen überspringen_ können, statt sie erneut vorparsen zu müssen. Eine Möglichkeit wäre, die von inneren Funktionen referenzierten Variablennamen zu speichern. Das ist teuer zu speichern und erfordert trotzdem eine Duplizierung der Arbeit: wir haben die Variablenauflösung bereits während des Vorparsen durchgeführt.

Stattdessen serialisieren wir, wo Variablen als dichte Array von Flags pro Variable zugeordnet werden. Wenn wir eine Funktion lazy-parsen, werden Variablen in derselben Reihenfolge wie vom Vorparser gesehen, neu erstellt, und wir können die Metadaten einfach auf die Variablen anwenden. Jetzt, da die Funktion compiliert ist, werden die Variablenzuordnungsmetadaten nicht mehr benötigt und können durch Garbage-Collection entfernt werden. Da wir diese Metadaten nur für Funktionen benötigen, die tatsächlich innere Funktionen enthalten, benötigt ein großer Teil aller Funktionen diese Metadaten überhaupt nicht, was den Speicheraufwand erheblich reduziert.

![Indem wir Metadaten für vorgeparste Funktionen verfolgen, können wir innere Funktionen vollständig überspringen.](/_img/preparser/parse-complexity-after.svg)

Die Leistungswirkung des Überspringens innerer Funktionen ist, wie der Aufwand des erneuten Vorparsen innerer Funktionen, nichtlinear. Es gibt Seiten, die alle ihre Funktionen auf den obersten Bereich anheben. Da ihre Verschachtelungsebene immer 0 ist, ist der Overhead immer 0. Viele moderne Seiten verschachteln Funktionen jedoch tatsächlich tief. Auf diesen Seiten sahen wir erhebliche Verbesserungen, als diese Funktion in V8 v6.3 / Chrome 63 eingeführt wurde. Der Hauptvorteil besteht darin, dass es jetzt nicht mehr darauf ankommt, wie tief der Code verschachtelt ist: jede Funktion wird höchstens einmal vorgeparst und einmal vollständig geparst[^1].

![Parsing-Zeiten auf dem Haupt-Thread und außerhalb des Haupt-Threads, vor und nach der Einführung der „innere Funktionen überspringen“-Optimierung.](/_img/preparser/skipping-inner-functions.svg)

[^1]: Aus Speichergründen [löscht V8 Bytecode](/blog/v8-release-74#bytecode-flushing), wenn er eine Zeit lang nicht genutzt wird. Wenn der Code später wieder benötigt wird, parsen und compilieren wir ihn erneut. Da wir die Variablenmetadaten während der Compilation sterben lassen, führt das bei lazy-neukompilation zu einem erneuten Parsen innerer Funktionen. An diesem Punkt erstellen wir jedoch die Metadaten für deren innere Funktionen neu, sodass wir die inneren Funktionen ihrer inneren Funktionen nicht erneut vorparsen müssen.

## Möglicherweise ausgeführte Funktionsausdrücke

Wie bereits erwähnt, kombinieren Packer oft mehrere Module in einer einzigen Datei, indem sie Modulkode in ein Closure einfügen, das sie sofort aufrufen. Dies bietet Isolation für die Module und ermöglicht es ihnen, so zu laufen, als ob sie der einzige Code im Skript wären. Diese Funktionen sind im Wesentlichen verschachtelte Skripte; die Funktionen werden bei Skriptausführung sofort aufgerufen. Packer liefern häufig _sofort ausgeführte Funktionsausdrücke_ (IIFEs; ausgesprochen „iffies“) als eingeklammerten Funktionen: `(function(){…})()`.

Da diese Funktionen während der Skriptausführung sofort benötigt werden, ist es nicht ideal, solche Funktionen vorzuparsen. Während der obersten Ausführung des Skripts benötigen wir die Funktion sofort compiliert, und wir parsen und compilieren die Funktion vollständig. Dies bedeutet, dass das schnellere Parsen, das wir zuvor durchgeführt haben, um die Startzeit zu beschleunigen, garantiert eine unnötige zusätzliche Startkosten ist.

Warum compiliert ihr nicht einfach aufgerufene Funktionen, könnten Sie fragen? Während es für einen Entwickler typischerweise einfach zu erkennen ist, wann eine Funktion aufgerufen wird, ist dies nicht der Fall für den Parser. Der Parser muss entscheiden – bevor er überhaupt beginnt, eine Funktion zu parsen! – ob er die Funktion eifrig compilieren oder das Compilation verzögern möchte. Mehrdeutigkeiten in der Syntax machen es schwierig, einfach schnell bis zum Ende der Funktion zu scannen, und die Kosten ähneln schnell den Kosten des regulären Vorparsen.

Aus diesem Grund erkennt V8 zwei einfache Muster, die als _möglicherweise ausgeführte Funktionsausdrücke_ (PIFEs; ausgesprochen „piffies“) bezeichnet werden, bei denen es eifrig eine Funktion parst und compiliert:

- Wenn eine Funktion ein eingeklammertes Funktionsausdruck ist, d.h. `(function(){…})`, gehen wir davon aus, dass sie aufgerufen wird. Wir machen diese Annahme, sobald wir den Beginn dieses Musters sehen, d.h. `(function`.
- Seit V8 v5.7 / Chrome 57 erkennen wir auch das Muster `!function(){…}(),function(){…}(),function(){…}()` generiert durch [UglifyJS](https://github.com/mishoo/UglifyJS2). Diese Erkennung tritt ein, sobald wir `!function` sehen, oder `,function`, wenn es sofort einem PIFE folgt.

Da V8 PIFEs eifrig compiliert, können sie als [profilgesteuertes Feedback](https://en.wikipedia.org/wiki/Profile-guided_optimization)[^2] verwendet werden, das dem Browser mitteilt, welche Funktionen für den Start benötigt werden.

Zu einer Zeit, als V8 innere Funktionen noch erneut analysierte, hatten einige Entwickler bemerkt, dass die Auswirkungen des JS-Parsing auf die Startzeit ziemlich hoch waren. Das Paket [`optimize-js`](https://github.com/nolanlawson/optimize-js) verwandelt Funktionen anhand statischer Heuristiken in PIFEs. Als das Paket erstellt wurde, hatte dies eine enorme Auswirkung auf die Ladeleistung bei V8. Wir haben diese Ergebnisse repliziert, indem wir die von `optimize-js` bereitgestellten Benchmarks auf V8 v6.1 ausgeführt haben und dabei nur minifizierte Skripte betrachtet haben.

![Das eifrige Parsen und Kompilieren von PIFEs führt zu einer leicht schnelleren Kalt- und Warmstartzeit (erste und zweite Seitenladung, gemessen an der Gesamtzeit für das Parsen + Kompilieren + Ausführen). Der Nutzen ist jedoch auf V8 v7.5 im Vergleich zu v6.1 deutlich geringer, da der Parser erheblich verbessert wurde.](/_img/preparser/eager-parse-compile-pife.svg)

Nichtsdestotrotz, jetzt, da wir innere Funktionen nicht mehr erneut parsen und da der Parser viel schneller geworden ist, ist die Leistungsverbesserung durch `optimize-js` stark reduziert. Die Standardkonfiguration für v7.5 ist tatsächlich bereits viel schneller als die optimierte Version, die auf v6.1 lief. Selbst in v7.5 kann es jedoch sinnvoll sein, PIFEs sparsam für Code zu verwenden, der beim Start benötigt wird: Wir vermeiden das Vorparsen, da wir frühzeitig erfahren, dass die Funktion benötigt wird.

Die Ergebnisse des Benchmarks von `optimize-js` spiegeln nicht genau die Realität wider. Die Skripte werden synchron geladen, und die gesamte Parse- + Kompilierungszeit wird auf die Ladezeit angerechnet. In einer realen Umgebung würden Sie Skripte wahrscheinlich mit `<script>`-Tags laden. Dadurch kann der Chrome-Preloader das Skript _entdecken_, bevor es ausgewertet wird, und es herunterladen, parsen und kompilieren, ohne den Hauptthread zu blockieren. Alles, was wir entscheiden, eifrig zu kompilieren, wird automatisch außerhalb des Hauptthreads kompiliert und sollte nur minimal zur Startzeit beitragen. Das Kompilieren von Skripten außerhalb des Hauptthreads verstärkt die Auswirkungen der Verwendung von PIFEs.

Es gibt jedoch immer noch Kosten, insbesondere Speicherplatzkosten, daher ist es keine gute Idee, alles eifrig zu kompilieren:

![Das eifrige Kompilieren *aller* JavaScript-Dateien führt zu erheblichen Speicherkosten.](/_img/preparser/eager-compilation-overhead.svg)

Während es eine gute Idee ist, Klammern um Funktionen zu setzen, die Sie während des Starts benötigen (z. B. basierend auf der Profilerstellung des Starts), ist die Verwendung eines Pakets wie `optimize-js`, das einfache statische Heuristiken anwendet, keine großartige Idee. Es nimmt zum Beispiel an, dass eine Funktion während des Starts aufgerufen wird, wenn sie ein Argument für einen Funktionsaufruf ist. Wenn eine solche Funktion jedoch ein gesamtes Modul implementiert, das erst viel später benötigt wird, kompilieren Sie am Ende zu viel. Übereifriges Kompilieren ist schlecht für die Leistung: V8 ohne Lazy-Kompilierung verschlechtert die Ladezeit erheblich. Zusätzlich stammen einige der Vorteile von `optimize-js` aus Problemen mit UglifyJS und anderen Minifizierern, die Klammern von PIFEs entfernen, die keine IIFEs sind, und damit nützliche Hinweise entfernen, die z. B. auf [Universal Module Definition](https://github.com/umdjs/umd)-Stilmodule hätten angewendet werden können. Dies ist wahrscheinlich ein Problem, das Minifizierer beheben sollten, um die maximale Leistung in Browsern zu erzielen, die PIFEs eifrig kompilieren.

[^2]: PIFEs können auch als profilinformierte Funktionsausdrücke betrachtet werden.

## Schlussfolgerungen

Lazy Parsing beschleunigt den Start und reduziert den Speicherverbrauch von Anwendungen, die mehr Code bereitstellen, als sie benötigen. Die Möglichkeit, Variablendeklarationen und -referenzen im Vorparser richtig zu verfolgen, ist notwendig, um sowohl korrekt (gemäß der Spezifikation) als auch schnell vorparsieren zu können. Variablen im Vorparser zu speichern, ermöglicht es uns auch, Informationen zur Variablenzuweisung für die spätere Verwendung im Parser zu serialisieren, sodass wir das erneute Vorparsen innerer Funktionen vollständig vermeiden können, was ein nicht-lineares Parsing-Verhalten tief verschachtelter Funktionen verhindert.

PIFEs, die vom Parser erkannt werden können, vermeiden den anfänglichen Vorparsing-Overhead für Code, der sofort beim Start benötigt wird. Eine sorgfältige profilgesteuerte Nutzung von PIFEs oder deren Einsatz durch Packertools kann einen nützlichen Geschwindigkeitsvorteil für einen kalten Start bieten. Dennoch sollte das unnötige Einhüllen von Funktionen in Klammern, um diese Heuristik auszulösen, vermieden werden, da dies dazu führt, dass mehr Code eifrig kompiliert wird, was zu schlechteren Startzeiten und erhöhtem Speicherverbrauch führt.
