---
title: &apos;Schnelle Eigenschaften in V8&apos;
author: &apos;Camillo Bruni ([@camillobruni](https://twitter.com/camillobruni)), ebenfalls Autor von [„Schnelles `for`-`in`”](/blog/fast-for-in)&apos;
avatars:
  - &apos;camillo-bruni&apos;
date: 2017-08-30 13:33:37
tags:
  - internals
description: &apos;Dieser technische Deep-Dive erklärt, wie V8 JavaScript-Eigenschaften im Hintergrund verwaltet.&apos;
---
In diesem Blogbeitrag möchten wir erklären, wie V8 intern JavaScript-Eigenschaften verarbeitet. Aus JavaScript-Sicht sind nur wenige Unterscheidungen für Eigenschaften notwendig. JavaScript-Objekte verhalten sich meist wie Wörterbücher, mit Zeichenketten als Schlüsseln und beliebigen Objekten als Werten. Die Spezifikation behandelt jedoch während der [Iteration](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys) ganzzahlig indizierte Eigenschaften anders als andere Eigenschaften. Abgesehen davon verhalten sich die verschiedenen Eigenschaften im Wesentlichen gleich, unabhängig davon, ob sie ganzzahlig indiziert sind oder nicht.

<!--truncate-->
Unter der Haube verlässt sich V8 jedoch aus Leistungs- und Speichergründen auf verschiedene Darstellungen von Eigenschaften. In diesem Blogbeitrag erläutern wir, wie V8 schnellen Zugriff auf Eigenschaften bietet und gleichzeitig dynamisch hinzugefügte Eigenschaften verarbeitet. Das Verständnis darüber, wie Eigenschaften funktionieren, ist entscheidend, um zu erklären, wie Optimierungen wie [Inline-Caches](http://mrale.ph/blog/2012/06/03/explaining-js-vms-in-js-inline-caches.html) in V8 funktionieren.

Dieser Beitrag erklärt den Unterschied bei der Verarbeitung von ganzzahlig indizierten und benannten Eigenschaften. Danach zeigen wir, wie V8 HiddenClasses beibehält, wenn benannte Eigenschaften hinzugefügt werden, um eine schnelle Möglichkeit zur Identifizierung der Struktur eines Objekts bereitzustellen. Anschließend geben wir Einblicke, wie benannte Eigenschaften für schnellen Zugriff oder schnelle Modifikation je nach Nutzung optimiert werden. Im letzten Abschnitt geben wir Details darüber, wie V8 ganzzahlig indizierte Eigenschaften oder Array-Indizes verarbeitet.

## Benannte Eigenschaften vs. Elemente

Beginnen wir mit der Analyse eines sehr einfachen Objekts wie `{a: "foo", b: "bar"}`. Dieses Objekt hat zwei benannte Eigenschaften, `"a"` und `"b"`. Es hat keine ganzzahligen Indizes als Eigenschaftsnamen. Array-indizierte Eigenschaften, die häufiger als Elemente bekannt sind, treten am prominentesten bei Arrays auf. Zum Beispiel hat das Array `["foo", "bar"]` zwei Array-indizierte Eigenschaften: 0 mit dem Wert "foo" und 1 mit dem Wert "bar". Dies ist die erste wesentliche Unterscheidung, wie V8 Eigenschaften im Allgemeinen behandelt.

Das folgende Diagramm zeigt, wie ein grundlegendes JavaScript-Objekt im Speicher aussieht.

![](/_img/fast-properties/jsobject.png)

Elemente und Eigenschaften werden in zwei separaten Datenstrukturen gespeichert, was das Hinzufügen und Zugreifen auf Eigenschaften oder Elemente für unterschiedliche Nutzungsmuster effizienter macht.

Elemente werden vor allem für die verschiedenen [`Array.prototype`-Methoden](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) wie `pop` oder `slice` verwendet. Da diese Funktionen Eigenschaften in aufeinanderfolgenden Bereichen zugreifen, stellt V8 sie intern auch meistens als einfache Arrays dar. Später in diesem Beitrag erklären wir, wie wir manchmal zu einer spärlichen, wörterbuchbasierten Darstellung wechseln, um Speicher zu sparen.

Benannte Eigenschaften werden in ähnlicher Weise in einem separaten Array gespeichert. Anders als bei Elementen können wir jedoch nicht einfach den Schlüssel verwenden, um ihre Position innerhalb des Eigenschaftsarrays abzuleiten; wir benötigen zusätzliche Metadaten. In V8 hat jedes JavaScript-Objekt eine zugeordnete HiddenClass. Die HiddenClass speichert Informationen über die Form eines Objekts und unter anderem eine Zuordnung von Eigenschaftsnamen zu Indizes im Eigenschaftenarray. Um die Sache zu verkomplizieren, verwenden wir manchmal ein Wörterbuch für die Eigenschaften anstelle eines einfachen Arrays. Das werden wir in einem eigenen Abschnitt genauer erläutern.

**Zusammenfassung dieses Abschnitts:**

- Array-indizierte Eigenschaften werden in einem separaten Elementespeicher gespeichert.
- Benannte Eigenschaften werden im Eigenschaftsspeicher gespeichert.
- Elemente und Eigenschaften können entweder Arrays oder Wörterbücher sein.
- Jedes JavaScript-Objekt hat eine zugeordnete HiddenClass, die Informationen über die Objektstruktur speichert.

## HiddenClasses und DescriptorArrays

Nachdem wir die allgemeine Unterscheidung zwischen Elementen und benannten Eigenschaften erklärt haben, müssen wir uns ansehen, wie HiddenClasses in V8 funktionieren. Diese HiddenClass speichert Meta-Informationen über ein Objekt, einschließlich der Anzahl der Eigenschaften des Objekts und einer Referenz auf das Prototyp des Objekts. HiddenClasses ähneln konzeptionell den Klassen in typischen objektorientierten Programmiersprachen. In einer prototypbasierten Sprache wie JavaScript ist es jedoch allgemein nicht möglich, Klassen im Voraus zu kennen. Daher werden HiddenClasses in diesem Fall in V8 dynamisch erstellt und aktualisiert, wenn sich Objekte ändern. HiddenClasses dienen als Kennung für die Struktur eines Objekts und sind somit eine sehr wichtige Komponente für den optimierenden Compiler und Inline-Caches von V8. Der optimierende Compiler kann beispielsweise Zugriffe auf Eigenschaften direkt einfügen, wenn er durch die HiddenClass eine kompatible Objektstruktur sicherstellen kann.

Schauen wir uns die wichtigen Teile einer HiddenClass an.

![](/_img/fast-properties/hidden-class.png)

In V8 zeigt das erste Feld eines JavaScript-Objekts auf eine HiddenClass. (Tatsächlich gilt dies für jedes Objekt, das sich im V8-Heap befindet und vom Garbage Collector verwaltet wird.) In Bezug auf Eigenschaften sind die wichtigsten Informationen das dritte Bit-Feld, das die Anzahl der Eigenschaften speichert, und ein Zeiger auf das Deskriptor-Array. Das Deskriptor-Array enthält Informationen über benannte Eigenschaften wie den Namen selbst und die Position, an der der Wert gespeichert ist. Beachten Sie, dass wir hier keine Ganzzahl-indizierten Eigenschaften nachverfolgen, daher gibt es keinen Eintrag im Deskriptor-Array.

Die grundlegende Annahme über HiddenClasses ist, dass Objekte mit derselben Struktur – z.B. denselben benannten Eigenschaften in derselben Reihenfolge – dieselbe HiddenClass teilen. Um dies zu erreichen, verwenden wir eine andere HiddenClass, wenn eine Eigenschaft zu einem Objekt hinzugefügt wird. Im folgenden Beispiel beginnen wir mit einem leeren Objekt und fügen drei benannte Eigenschaften hinzu.

![](/_img/fast-properties/adding-properties.png)

Jedes Mal, wenn eine neue Eigenschaft hinzugefügt wird, ändert sich die HiddenClass des Objekts. Im Hintergrund erstellt V8 einen Übergangsbaum, der die HiddenClasses miteinander verbindet. V8 weiß, welche HiddenClass verwendet werden soll, wenn Sie beispielsweise die Eigenschaft "a" zu einem leeren Objekt hinzufügen. Dieser Übergangsbaum stellt sicher, dass Sie mit derselben endgültigen HiddenClass enden, wenn Sie die gleichen Eigenschaften in derselben Reihenfolge hinzufügen. Im folgenden Beispiel zeigt sich, dass wir demselben Übergangsbaum folgen würden, selbst wenn wir einfache indizierte Eigenschaften dazwischen hinzufügen.

![](/_img/fast-properties/transitions.png)

Wenn wir jedoch ein neues Objekt erstellen, dem eine andere Eigenschaft hinzugefügt wird, in diesem Fall die Eigenschaft "d", erstellt V8 einen separaten Zweig für die neuen HiddenClasses.

![](/_img/fast-properties/transition-trees.png)

**Zusammenfassung dieses Abschnitts:**

- Objekte mit derselben Struktur (gleiche Eigenschaften in derselben Reihenfolge) haben dieselbe HiddenClass.
- Standardmäßig führt das Hinzufügen jeder neuen benannten Eigenschaft zur Erstellung einer neuen HiddenClass.
- Das Hinzufügen von ganzzahl-indizierten Eigenschaften erstellt keine neuen HiddenClasses.

## Die drei verschiedenen Arten von benannten Eigenschaften

Nachdem wir einen Überblick darüber gegeben haben, wie V8 HiddenClasses verwendet, um die Struktur von Objekten zu verfolgen, wollen wir uns ansehen, wie diese Eigenschaften tatsächlich gespeichert werden. Wie in der obigen Einführung erläutert, gibt es zwei grundlegende Arten von Eigenschaften: benannte und indizierte. Der folgende Abschnitt behandelt benannte Eigenschaften.

Ein einfaches Objekt wie `{a: 1, b: 2}` kann in V8 verschiedene interne Darstellungen haben. Während JavaScript-Objekte von außen mehr oder weniger wie einfache Wörterbücher funktionieren, versucht V8, Wörterbücher zu vermeiden, da sie bestimmte Optimierungen wie [Inline-Caches](https://en.wikipedia.org/wiki/Inline_caching), die wir in einem separaten Beitrag erklären werden, behindern.

**In-Object vs. normale Eigenschaften:** V8 unterstützt sogenannte In-Object-Eigenschaften, die direkt im Objekt selbst gespeichert werden. Diese sind die schnellsten Eigenschaften in V8, da sie ohne Umleitung zugänglich sind. Die Anzahl der In-Object-Eigenschaften wird durch die anfängliche Größe des Objekts bestimmt. Wenn mehr Eigenschaften hinzugefügt werden, als Platz im Objekt ist, werden sie im Eigenschaftsspeicher abgelegt. Der Eigenschaftsspeicher fügt eine Ebene der Umleitung hinzu, kann jedoch unabhängig vergrößert werden.

![](/_img/fast-properties/in-object-properties.png)

**Schnelle vs. langsame Eigenschaften:** Ein weiterer wichtiger Unterschied ist der zwischen schnellen und langsamen Eigenschaften. Typischerweise definieren wir die im linearen Eigenschaftsspeicher gespeicherten Eigenschaften als "schnell". Schnelle Eigenschaften werden einfach durch einen Index im Eigenschaftsspeicher abgerufen. Um vom Namen der Eigenschaft zur tatsächlichen Position im Eigenschaftsspeicher zu gelangen, müssen wir das Deskriptor-Array in der HiddenClass konsultieren, wie zuvor beschrieben.

![](/_img/fast-properties/fast-vs-slow-properties.png)

Wenn jedoch viele Eigenschaften zu einem Objekt hinzugefügt und von diesem gelöscht werden, kann es viel Zeit und Speicher kosten, das Deskriptor-Array und die HiddenClasses zu pflegen. Daher unterstützt V8 auch sogenannte langsame Eigenschaften. Ein Objekt mit langsamen Eigenschaften verfügt über ein eigenständiges Wörterbuch als Eigenschaftsspeicher. Alle Meta-Informationen zu den Eigenschaften werden nicht mehr im Deskriptor-Array der HiddenClass, sondern direkt im Eigenschaften-Wörterbuch gespeichert. Daher können Eigenschaften hinzugefügt und entfernt werden, ohne die HiddenClass zu aktualisieren. Da Inline-Caches nicht mit Wörterbucheigenschaften funktionieren, sind letztere typischerweise langsamer als schnelle Eigenschaften.

**Zusammenfassung dieses Abschnitts:**

- Es gibt drei verschiedene Arten von benannten Eigenschaften: In-Object, schnell und langsam/wörterbuchbasiert.
    1. In-Object-Eigenschaften werden direkt im Objekt selbst gespeichert und ermöglichen den schnellsten Zugriff.
    1. Schnelle Eigenschaften befinden sich im Eigenschaften-Speicher, alle Metainformationen werden im Deskriptor-Array auf der HiddenClass gespeichert.
    1. Langsame Eigenschaften befinden sich in einem eigenständigen Eigenschaften-Wörterbuch, Metainformationen werden nicht mehr über die HiddenClass gemeinsam genutzt.
- Langsame Eigenschaften ermöglichen effizientes Entfernen und Hinzufügen von Eigenschaften, sind jedoch langsamer zugänglich als die anderen beiden Typen.

## Elemente oder Array-indizierte Eigenschaften

Bis jetzt haben wir benannte Eigenschaften betrachtet und die ganzzahligen indizierten Eigenschaften ignoriert, die üblicherweise mit Arrays verwendet werden. Die Behandlung von ganzzahligen indizierten Eigenschaften ist nicht weniger komplex als die von benannten Eigenschaften. Obwohl alle indizierten Eigenschaften immer separat im Elementespeicher aufbewahrt werden, gibt es [20](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?q=elements-kind.h&sq=package:chromium&dr&l=14) verschiedene Typen von Elementen!

**Gesammelte oder Löchrige Elemente:** Der erste wichtige Unterschied, den V8 macht, ist, ob der Speicher der Elemente gesammelte Werte enthält oder Löcher aufweist. Sie erhalten Löcher in einem Speicher, wenn Sie ein indiziertes Element löschen oder es z. B. nicht definieren. Ein einfaches Beispiel ist `[1,,3]`, bei dem der zweite Eintrag ein Loch ist. Das folgende Beispiel veranschaulicht dieses Problem:

```js
const o = ['a', 'b', 'c'];
console.log(o[1]);          // Gibt 'b' aus.

delete o[1];                // Führt ein Loch im Elementespeicher ein.
console.log(o[1]);          // Gibt 'undefined' aus; Eigenschaft 1 existiert nicht.
o.__proto__ = {1: 'B'};     // Definiert Eigenschaft 1 im Prototyp.

console.log(o[0]);          // Gibt 'a' aus.
console.log(o[1]);          // Gibt 'B' aus.
console.log(o[2]);          // Gibt 'c' aus.
console.log(o[3]);          // Gibt undefined aus.
```

![](/_img/fast-properties/hole.png)

Kurz gesagt, wenn eine Eigenschaft nicht beim Empfänger vorhanden ist, müssen wir die Prototypenkette weiter durchsuchen. Da Elemente eigenständig sind, d. h. wir speichern keine Informationen über vorhandene indizierte Eigenschaften in der HiddenClass, benötigen wir einen speziellen Wert namens `the_hole`, um Eigenschaften zu markieren, die nicht vorhanden sind. Dies ist entscheidend für die Leistung von Array-Funktionen. Wenn wir wissen, dass es keine Löcher gibt, d. h. der Elementespeicher ist gesättigt, können wir lokale Operationen ohne teure Suchvorgänge in der Prototypenkette ausführen.

**Schnelle oder Wörterbuch-Elemente:** Der zweite wichtige Unterschied bei Elementen betrifft, ob sie schnell oder in Wörterbuch-Modus sind. Schnelle Elemente sind einfache, VM-interne Arrays, bei denen der Eigenschaftsindex mit dem Index im Elementespeicher übereinstimmt. Diese einfache Darstellung ist jedoch recht verschwenderisch für sehr große, spärliche/lohrrige Arrays, bei denen nur wenige Einträge belegt sind. In diesem Fall verwenden wir eine Darstellung auf Basis eines Wörterbuchs, um Speicher zu sparen, jedoch bei leicht verlangsamtem Zugriff:

```js
const sparseArray = [];
sparseArray[9999] = 'foo'; // Erstellt ein Array mit Wörterbuch-Elementen.
```

In diesem Beispiel wäre es ziemlich verschwenderisch, ein vollständiges Array mit 10.000 Einträgen zuzuweisen. Stattdessen erstellt V8 ein Wörterbuch, in dem wir Tripel aus Schlüssel, Wert und Deskriptor speichern. Der Schlüssel wäre in diesem Fall `'9999'`, der Wert `'foo'` und der Standarddeskriptor wird verwendet. Da wir keinen Weg haben, Deskriptordetails in der HiddenClass zu speichern, wechselt V8 zu langsamen Elementen, wann immer Sie indizierte Eigenschaften mit einem benutzerdefinierten Deskriptor definieren:

```js
const array = [];
Object.defineProperty(array, 0, {value: 'fixiert', configurable: false});
console.log(array[0]);      // Gibt 'fixiert' aus.
array[0] = 'anderer Wert';  // Kann Index 0 nicht überschreiben.
console.log(array[0]);      // Gibt weiterhin 'fixiert' aus.
```

In diesem Beispiel haben wir eine nicht-konfigurierbare Eigenschaft auf dem Array hinzugefügt. Diese Informationen werden im Deskriptor-Teil eines Wörterbuch-Tripletts für langsame Elemente gespeichert. Es ist wichtig zu beachten, dass Array-Funktionen bei Objekten mit langsamen Elementen erheblich langsamer sind.

**Smi- und Double-Elemente:** Für schnelle Elemente macht V8 eine weitere wichtige Unterscheidung. Wenn Sie z. B. nur ganze Zahlen in einem Array speichern, ein häufiges Anwendungsbeispiel, muss der GC das Array nicht betrachten, da ganze Zahlen direkt als sogenannte kleine Ganzzahlen (Smis) vor Ort codiert werden. Ein anderer Sonderfall sind Arrays, die nur Gleitkommazahlen enthalten. Im Gegensatz zu Smis werden Gleitkommazahlen normalerweise als vollständige Objekte dargestellt, die mehrere Wörter belegen. V8 speichert jedoch rohe Gleitkommazahlen für reine Double-Arrays, um Speicher- und Leistungsaufwand zu vermeiden. Das folgende Beispiel zeigt 4 Beispiele für Smi- und Double-Elemente:

```js
const a1 = [1,   2, 3];  // Smi Gesättigt
const a2 = [1,    , 3];  // Smi Löchrig, a2[1] liest vom Prototyp
const b1 = [1.1, 2, 3];  // Double Gesättigt
const b2 = [1.1,  , 3];  // Double Löchrig, b2[1] liest vom Prototyp
```

**Spezial-Elemente:** Mit den bisher beschriebenen Informationen haben wir 7 der 20 verschiedenen Elementtypen abgedeckt. Der Einfachheit halber haben wir 9 Elementarten für TypedArrays ausgeschlossen, zwei weitere für String-Wrappers und schließlich zwei weitere Spezialelementarten für Argumentobjekte.

**Der ElementsAccessor:** Wie Sie sich vorstellen können, sind wir nicht gerade begeistert davon, Array-Funktionen zwanzigmal in C++ zu schreiben, einmal für jede [Elementart](/blog/elements-kinds). Hier kommt etwas C++-Magie ins Spiel. Statt Array-Funktionen immer wieder neu zu implementieren, haben wir den `ElementsAccessor` entwickelt, bei dem wir meistens nur einfache Funktionen implementieren müssen, die auf Elemente des Backing Stores zugreifen. Der `ElementsAccessor` basiert auf [CRTP](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern), um spezialisierte Versionen jeder Array-Funktion zu erstellen. Wenn Sie also etwas wie `slice` bei einem Array aufrufen, ruft V8 intern einen in C++ geschriebenen Built-in auf und leitet die Anfrage über den `ElementsAccessor` zur spezialisierten Version der Funktion weiter:

![](/_img/fast-properties/elements-accessor.png)

**Zusammenfassung dieses Abschnitts:**

- Es gibt schnelle und Dictionary-Modus indizierte Eigenschaften und Elemente.
- Schnelle Eigenschaften können gepackt sein oder Löcher enthalten, die darauf hinweisen, dass eine indizierte Eigenschaft gelöscht wurde.
- Elemente sind auf ihren Inhalt spezialisiert, um Array-Funktionen zu beschleunigen und den GC-Overhead zu reduzieren.

Das Verständnis, wie Eigenschaften funktionieren, ist entscheidend für viele Optimierungen in V8. Für JavaScript-Entwickler sind viele dieser internen Entscheidungen nicht direkt sichtbar, aber sie erklären, warum bestimmte Code-Muster schneller sind als andere. Änderungen des Eigenschafts- oder Elementtyps führen typischerweise dazu, dass V8 eine andere HiddenClass erstellt, was zu Typverschmutzung führen kann, die [V8 daran hindert, optimalen Code zu generieren](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html). Bleiben Sie dran für weitere Beiträge darüber, wie die VM-Interna von V8 funktionieren.
