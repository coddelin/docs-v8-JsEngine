---
title: 'Slack-Verfolgung in V8'
author: 'Michael Stanton ([@alpencoder](https://twitter.com/alpencoder)), renommierter Meister des *Slack*'
description: 'Eine detaillierte Betrachtung des Slack-Verfolgungsmechanismus in V8.'
avatars:
 - 'michael-stanton'
date: 2020-09-24 14:00:00
tags:
 - internals
---
Slack-Verfolgung ist eine Möglichkeit, neuen Objekten eine anfängliche Größe zu geben, die **größer ist, als sie tatsächlich benötigen**, damit sie schnell neue Eigenschaften hinzufügen können. Und dann, nach einer gewissen Zeit, diesen ungenutzten Platz **magisch an das System zurückzugeben**. Cool, oder?

<!--truncate-->
Das ist besonders nützlich, da JavaScript keine statischen Klassen hat. Das System kann nie „auf einen Blick“ sehen, wie viele Eigenschaften Sie haben. Die Engine erkennt sie einzeln. Wenn Sie also lesen:

```js
function Gipfel(name, höhe) {
  this.name = name;
  this.höhe = höhe;
}

const m1 = new Gipfel('Matterhorn', 4478);
```

Sie könnten denken, die Engine hat alles, was sie braucht, um gut zu funktionieren – schließlich haben Sie ihr mitgeteilt, dass das Objekt zwei Eigenschaften hat. Allerdings hat V8 wirklich keine Ahnung, was als Nächstes kommt. Dieses Objekt `m1` könnte an eine andere Funktion übergeben werden, die ihm 10 weitere Eigenschaften hinzufügt. Slack-Verfolgung resultiert aus dieser Notwendigkeit, auf alles zu reagieren, was als Nächstes in einer Umgebung ohne statische Kompilierung geschieht, um die Gesamtstruktur abzuleiten. Es ist wie viele andere Mechanismen in V8, deren Grundlage nur allgemeine Aussagen über die Ausführung sind, wie:

- Die meisten Objekte sterben bald, nur wenige leben lange – die „Generationshypothese“ der Garbage Collection.
- Das Programm hat tatsächlich eine Organisationsstruktur – [Formen oder „versteckte Klassen“](https://mathiasbynens.be/notes/shapes-ics) (wir nennen diese **Karten** in V8) werden in die Objekte integriert, die wir sehen, dass der Programmierer sie verwendet, weil wir glauben, dass sie nützlich sein werden. *Übrigens, [Fast Properties in V8](/blog/fast-properties) ist ein großartiger Artikel mit interessanten Details über Karten und Eigenschaftenzugriff.*
- Programme haben einen Initialisierungszustand, in dem alles neu ist und es schwierig ist, zu erkennen, was wichtig ist. Später können die wichtigen Klassen und Funktionen durch ihre konstante Nutzung identifiziert werden – unser Feedback-System und der Compiler-Pipeline wachsen aus dieser Idee.

Schließlich, und am wichtigsten, muss die Laufzeitumgebung sehr schnell sein, sonst philosophieren wir nur.

Nun, V8 könnte einfach Eigenschaften in einem Backing Store speichern, der an das Hauptobjekt angeschlossen ist. Anders als Eigenschaften, die direkt im Objekt leben, kann dieser Backing Store unbegrenzt durch Kopieren und Ersetzen des Zeigers wachsen. Der schnellste Zugriff auf eine Eigenschaft erfolgt jedoch durch Vermeidung dieser Umleitung und durch Betrachtung eines festen Offsets vom Anfang des Objekts. Unten zeige ich das Layout eines normalen JavaScript-Objekts im V8-Heap mit zwei im Objekt gespeicherten Eigenschaften. Die ersten drei Wörter sind standardmäßig in jedem Objekt vorhanden (ein Zeiger auf die Karte, auf den Backing Store der Eigenschaften und auf den Backing Store der Elemente). Man kann sehen, dass das Objekt nicht „wachsen“ kann, da es dicht an das nächste Objekt im Heap stößt:

![](/_img/slack-tracking/property-layout.svg)

:::note
**Hinweis:** Ich habe die Details des Backing Stores der Eigenschaften weggelassen, weil das einzige wichtige daran momentan ist, dass er jederzeit durch einen größeren ersetzt werden kann. Er ist jedoch auch ein Objekt im V8-Heap und hat einen Kartenzeiger wie alle Objekte, die dort existieren.
:::

Wie auch immer, aufgrund der Leistung, die durch Eigenschaften im Objekt bereitgestellt wird, ist V8 bereit, Ihnen zusätzlichen Platz in jedem Objekt zu geben, und **Slack-Verfolgung** ist die Methode, wie dies geschieht. Schließlich werden Sie sich beruhigen, aufhören, neue Eigenschaften hinzuzufügen, und sich der Aufgabe widmen, Bitcoin zu minen oder was auch immer.

Wie viel „Zeit“ gibt Ihnen V8? Clevererweise betrachtet es, wie oft Sie ein bestimmtes Objekt erzeugt haben. Tatsächlich gibt es einen Zähler in der Karte, und er wird mit einer der mystischeren magischen Zahlen im System initialisiert: **sieben**.

Eine weitere Frage: Woher weiß V8, wie viel zusätzlicher Platz im Objektkörper bereitgestellt werden soll? Es erhält tatsächlich einen Hinweis vom Kompilierungsprozess, der eine geschätzte Anzahl von Eigenschaften für den Anfang bietet. Diese Berechnung umfasst die Anzahl der Eigenschaften aus dem Prototyp-Objekt und geht rekursiv die Prototypenkette hinauf. Schließlich fügt es aus guten Gründen **acht** weitere hinzu (eine weitere magische Zahl!). Dies können Sie in `JSFunction::CalculateExpectedNofProperties()` sehen:

```cpp
int JSFunction::CalculateExpectedNofProperties(Isolate* isolate,
                                               Handle<JSFunction> function) {
  int expected_nof_properties = 0;
  for (PrototypeIterator iter(isolate, function, kStartAtReceiver);
       !iter.IsAtEnd(); iter.Advance()) {
    Handle<JSReceiver> current =
        PrototypeIterator::GetCurrent<JSReceiver>(iter);
    if (!current->IsJSFunction()) break;
    Handle<JSFunction> func = Handle<JSFunction>::cast(current);

    // Der übergeordnete Konstruktor sollte für die Anzahl der erwarteten
    // Eigenschaften kompiliert werden, die verfügbar sein sollen.
    Handle<SharedFunctionInfo> shared(func->shared(), isolate);
    IsCompiledScope is_compiled_scope(shared->is_compiled_scope(isolate));
    if (is_compiled_scope.is_compiled() ||
        Compiler::Compile(func, Compiler::CLEAR_EXCEPTION,
                          &is_compiled_scope)) {
      DCHECK(shared->is_compiled());
      int count = shared->expected_nof_properties();
      // Überprüfen, ob die Schätzung sinnvoll ist.
      if (expected_nof_properties <= JSObject::kMaxInObjectProperties - count) {
        expected_nof_properties += count;
      } else {
        return JSObject::kMaxInObjectProperties;
      }
    } else {
      // Falls ein Kompilierungsfehler aufgetreten ist, wird im Falle des Iterierens
      // fortgefahren, falls es eine integrierte Funktion in der Prototypenkette gibt,
      // die eine bestimmte Anzahl von In-Objekt-Eigenschaften erfordert.
      continue;
    }
  }
  // Das Tracking überflüssiger In-Objekt-Platzierungen wird später redundanten Platz
  // zurückfordern, sodass wir uns leisten können, die Schätzung großzügig anzupassen.
  // Dies bedeutet, dass wir zu Beginn mindestens 8 Slots überallocieren.
  if (expected_nof_properties > 0) {
    expected_nof_properties += 8;
    if (expected_nof_properties > JSObject::kMaxInObjectProperties) {
      expected_nof_properties = JSObject::kMaxInObjectProperties;
    }
  }
  return expected_nof_properties;
}
```

Schauen wir uns unser Objekt `m1` von zuvor an:

```js
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

const m1 = new Peak(&apos;Matterhorn&apos;, 4478);
```

Gemäß der Berechnung in `JSFunction::CalculateExpectedNofProperties` und unserer Funktion `Peak()` sollten wir 2 in-Objekt-Eigenschaften haben und dank des Slack-Trackings weitere 8 zusätzliche. Wir können `m1` mit `%DebugPrint()` ausdrucken (_Diese praktische Funktion zeigt die Kartenstruktur. Sie können sie verwenden, indem Sie `d8` mit dem Flag `--allow-natives-syntax` ausführen_):

```
> %DebugPrint(m1);
DebugPrint: 0x49fc866d: [JS_OBJECT_TYPE]
 - map: 0x58647385 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x28c821a1 <FixedArray[0]> {
    0x28c846f9: [String] in ReadOnlySpace: #name: 0x5e412439 <String[10]: #Matterhorn> (const data field 0)
    0x5e412415: [String] in OldSpace: #height: 4478 (const data field 1)
 }
  0x58647385: [Map]
 - type: JS_OBJECT_TYPE
 - instance size: 52
 - inobject properties: 10
 - elements kind: HOLEY_ELEMENTS
 - unused property fields: 8
 - enum length: invalid
 - stable_map
 - back pointer: 0x5864735d <Map(HOLEY_ELEMENTS)>
 - prototype_validity cell: 0x5e4126fd <Cell value= 0>
 - instance descriptors (own) #2: 0x49fc8701 <DescriptorArray[2]>
 - prototype: 0x49fc85e9 <Object map = 0x58647335>
 - constructor: 0x5e4125ed <JSFunction Peak (sfi = 0x5e4124dd)>
 - dependent code: 0x28c8212d <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 6
```

Beachten Sie, dass die Instanzgröße des Objekts 52 beträgt. Die Objektaufteilung in V8 sieht wie folgt aus:

| Wort | Was                                                |
| ---- | -------------------------------------------------- |
| 0    | die Karte                                          |
| 1    | Zeiger auf das Eigenschaftenarray                  |
| 2    | Zeiger auf das Elementearray                       |
| 3    | In-Objekt-Feld 1 (Zeiger auf String `"Matterhorn"`) |
| 4    | In-Objekt-Feld 2 (integer Wert `4478`)             |
| 5    | ungenutztes In-Objekt-Feld 3                       |
| …    | …                                                  |
| 12   | ungenutztes In-Objekt-Feld 10                      |

Die Zeigergröße beträgt 4 in diesem 32-Bit-Binärformat, und so haben wir diese 3 Anfangswörter, die jedes normale JavaScript-Objekt enthält, und dann 10 zusätzliche Wörter im Objekt. Es sagt uns oben nützlicherweise, dass es 8 “ungenutzte Eigenschaftenfelder” gibt. Wir erleben also das Slack-Tracking. Unsere Objekte sind aufgeblähte, gierige Verbraucher kostbarer Bytes!

Wie verschlanken wir? Wir verwenden das Konstruktionszähler-Feld in der Karte. Wir erreichen Null und entscheiden dann, dass wir mit dem Slack-Tracking fertig sind. Wenn Sie jedoch mehr Objekte erstellen, sehen Sie den oben erwähnten Zähler nicht abnehmen. Warum?

Nun, es liegt daran, dass die oben angezeigte Karte nicht “die” Karte für ein `Peak`-Objekt ist. Es ist nur eine Blattkarte in einer Kette von Karten, die von der **initialen Karte** absteigt, die das `Peak`-Objekt erhält, bevor es den Konstruktor-Code ausführt.

Wie findet man die initiale Karte? Glücklicherweise hat die Funktion `Peak()` einen Zeiger darauf. Es ist der Konstruktionszähler in der initialen Karte, den wir verwenden, um das Slack-Tracking zu steuern:

```
> %DebugPrint(Peak);
d8> %DebugPrint(Peak)
DebugPrint: 0x31c12561: [Function] in OldSpace
 - map: 0x2a2821f5 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x31c034b5 <JSFunction (sfi = 0x36108421)>
 - elements: 0x28c821a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - Funktionsprototyp: 0x37449c89 <Objektkarte = 0x2a287335>
 - initiale Karte: 0x46f07295 <Karte(HOLEY_ELEMENTS)>   // Hier ist die initiale Karte.
 - geteilte Informationen: 0x31c12495 <SharedFunctionInfo Peak>
 - Name: 0x31c12405 <String[4]: #Peak>
…

d8> // %DebugPrintPtr ermöglicht es Ihnen, die initiale Karte auszugeben.
d8> %DebugPrintPtr(0x46f07295)
DebugPrint: 0x46f07295: [Karte]
 - Typ: JS_OBJECT_TYPE
 - Instanzgröße: 52
 - Eigenschaften im Objekt: 10
 - Elemente-Typ: HOLEY_ELEMENTS
 - ungenutzte Eigenschaftenfelder: 10
 - Aufzählungslänge: ungültig
 - Rückwärtspointer: 0x28c02329 <undefiniert>
 - Prototypgültigkeitszelle: 0x47f0232d <Zellenwert= 1>
 - Instanzbeschreibungen (eigene) #0: 0x28c02135 <DescriptorArray[0]>
 - Übergänge #1: 0x46f0735d <Karte(HOLEY_ELEMENTS)>
     0x28c046f9: [Zeichenkette] im ReadOnlySpace: #Name:
         (Übergang zu (festes Datenfeld, Attribute: [WEC]) @ Any) ->
             0x46f0735d <Karte(HOLEY_ELEMENTS)>
 - Prototyp: 0x5cc09c7d <Objektkarte = 0x46f07335>
 - Konstruktor: 0x21e92561 <JSFunction Peak (sfi = 0x21e92495)>
 - abhängiger Code: 0x28c0212d <Anderes Heap-Objekt (WEAK_FIXED_ARRAY_TYPE)>
 - Konstruktor-Zähler: 5
```

Sehen Sie, wie der Konstruktor-Zähler auf 5 reduziert wurde? Wenn Sie die initiale Karte von der oben gezeigten Karte mit zwei Eigenschaften ausfindig machen möchten, können Sie ihren Rückwärtspointer mithilfe von `%DebugPrintPtr()` verfolgen, bis Sie eine Karte mit `undefiniert` im Rückwärtspointer-Feld erreichen. Dies ist die obige Karte.

Nun wächst ein Kartenbaum von der initialen Karte aus, mit einem Ast für jede hinzugefügte Eigenschaft ab diesem Punkt. Wir nennen diese Äste _Übergänge_. Im obigen Ausdruck der initialen Karte sehen Sie den Übergang zur nächsten Karte mit der Bezeichnung „Name“? Der gesamte Kartenbaum sieht bisher so aus:

![(X, Y, Z) bedeutet (Instanzgröße, Anzahl der Eigenschaften im Objekt, Anzahl der ungenutzten Eigenschaften).](/_img/slack-tracking/root-map-1.svg)

Diese Übergänge basierend auf Eigenschaftsnamen sind, wie der [„blinde Maulwurf“](https://www.google.com/search?q=blind+mole&tbm=isch) von JavaScript seine Karten unbemerkt im Hintergrund erstellt. Diese initiale Karte wird auch in der Funktion `Peak` gespeichert, sodass sie, wenn sie als Konstruktor verwendet wird, benutzt werden kann, um das `this` Objekt einzurichten.

```js
const m1 = new Peak(&apos;Matterhorn&apos;, 4478);
const m2 = new Peak(&apos;Mont Blanc&apos;, 4810);
const m3 = new Peak(&apos;Zinalrothorn&apos;, 4221);
const m4 = new Peak(&apos;Wendelstein&apos;, 1838);
const m5 = new Peak(&apos;Zugspitze&apos;, 2962);
const m6 = new Peak(&apos;Watzmann&apos;, 2713);
const m7 = new Peak(&apos;Eiger&apos;, 3970);
```

Das Tolle hierbei ist, dass nach der Erstellung von `m7`, das erneute Ausführen von `%DebugPrint(m1)` ein erstaunliches neues Ergebnis liefert:

```
DebugPrint: 0x5cd08751: [JS_OBJECT_TYPE]
 - Karte: 0x4b387385 <Karte(HOLEY_ELEMENTS)> [FastProperties]
 - Prototyp: 0x5cd086cd <Objektkarte = 0x4b387335>
 - Elemente: 0x586421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - Eigenschaften: 0x586421a1 <FixedArray[0]> {
    0x586446f9: [Zeichenkette] im ReadOnlySpace: #Name:
        0x51112439 <String[10]: #Matterhorn> (festes Datenfeld 0)
    0x51112415: [Zeichenkette] im OldSpace: #Höhe:
        4478 (festes Datenfeld 1)
 }
0x4b387385: [Karte]
 - Typ: JS_OBJECT_TYPE
 - Instanzgröße: 20
 - Eigenschaften im Objekt: 2
 - Elemente-Typ: HOLEY_ELEMENTS
 - ungenutzte Eigenschaftenfelder: 0
 - Aufzählungslänge: ungültig
 - stabile Karte
 - Rückwärtspointer: 0x4b38735d <Karte(HOLEY_ELEMENTS)>
 - Prototypgültigkeitszelle: 0x511128dd <Zellenwert= 0>
 - Instanzbeschreibungen (eigene) #2: 0x5cd087e5 <DescriptorArray[2]>
 - Prototyp: 0x5cd086cd <Objektkarte = 0x4b387335>
 - Konstruktor: 0x511127cd <JSFunction Peak (sfi = 0x511125f5)>
 - abhängiger Code: 0x5864212d <Anderes Heap-Objekt (WEAK_FIXED_ARRAY_TYPE)>
 - Konstruktor-Zähler: 0
```

Unsere Instanzgröße beträgt jetzt 20, was 5 Wörter sind:

| Wort | Inhalt                          |
| ---- | ------------------------------- |
| 0    | die Karte                       |
| 1    | Zeiger auf das Eigenschaften-Array |
| 2    | Zeiger auf das Elemente-Array   |
| 3    | Name                            |
| 4    | Höhe                            |

Sie werden sich fragen, wie dies geschehen konnte. Schließlich, wenn dieses Objekt im Speicher angeordnet ist und früher 10 Eigenschaften hatte, wie kann das System diese 8 Wörter tolerieren, die niemandem gehören? Es stimmt, dass wir sie nie mit etwas Interessantem gefüllt haben — vielleicht hilft uns das.

Wenn Sie sich fragen, warum ich mir Gedanken darüber mache, diese Wörter herumliegen zu lassen, dann gibt es einige Hintergrundinformationen, die Sie über den Garbage Collector wissen sollten. Objekte werden nacheinander angeordnet, und der V8 Garbage Collector verfolgt Dinge in diesem Speicher, indem er ihn immer wieder durchläuft. Beginnend beim ersten Wort im Speicher erwartet er, einen Zeiger auf eine Karte zu finden. Er liest die Instanzgröße aus der Karte und weiß dann, wie weit er zum nächsten gültigen Objekt vorwärts schalten muss. Für einige Klassen muss er zusätzlich eine Länge berechnen, aber das ist alles.

![](/_img/slack-tracking/gc-heap-1.svg)

Im obigen Diagramm sind die roten Kästchen die **Maps**, und die weißen Kästchen die Wörter, die die Instanzgröße des Objekts ausfüllen. Der Garbage Collector kann den Heap durch „Springen“ von Map zu Map durchlaufen.

Was passiert also, wenn die Map plötzlich ihre Instanzgröße ändert? Wenn der GC (Garbage Collector) den Heap durchläuft, stößt er nun auf ein Wort, das er zuvor nicht gesehen hat. Im Fall unserer `Peak`-Klasse ändern wir uns von 13 Wörtern auf nur 5 (ich habe die „ungenutzten Eigenschaften“-Wörter gelb eingefärbt):

![](/_img/slack-tracking/gc-heap-2.svg)

![](/_img/slack-tracking/gc-heap-3.svg)

Wir können damit umgehen, indem wir diese ungenutzten Eigenschaften clever mit einer **„Füller“-Map von Instanzgröße 4** initialisieren. Auf diese Weise wird der GC leicht über diese Bereiche laufen, sobald sie für die Traversierung freigelegt werden.

![](/_img/slack-tracking/gc-heap-4.svg)

Dies wird im Code in `Factory::InitializeJSObjectBody()` ausgedrückt:

```cpp
void Factory::InitializeJSObjectBody(Handle<JSObject> obj, Handle<Map> map,
                                     int start_offset) {

  // <Zeilen entfernt>

  bool in_progress = map->IsInobjectSlackTrackingInProgress();
  Object filler;
  if (in_progress) {
    filler = *one_pointer_filler_map();
  } else {
    filler = *undefined_value();
  }
  obj->InitializeBody(*map, start_offset, *undefined_value(), filler);
  if (in_progress) {
    map->FindRootMap(isolate()).InobjectSlackTrackingStep(isolate());
  }

  // <Zeilen entfernt>
}
```

So funktioniert das Slack-Tracking in der Praxis. Für jede Klasse, die Sie erstellen, können Sie erwarten, dass sie vorübergehend mehr Speicher benötigt. Aber nach der 7. Instanziierung „akzeptieren wir es“ und machen den verbleibenden Raum für den GC sichtbar. Diese einwortigen Objekte haben keine Besitzer – das heißt, niemand zeigt auf sie – also werden sie bei einer Sammlung freigegeben, und lebende Objekte können verdichtet werden, um Speicherplatz zu sparen.

Das folgende Diagramm zeigt, dass das Slack-Tracking für diese initiale Map **abgeschlossen** ist. Beachten Sie, dass die Instanzgröße nun 20 beträgt (5 Wörter: die Map, die Eigenschaften- und die Elemente-Arrays sowie 2 weitere Slots). Das Slack-Tracking berücksichtigt die gesamte Kette von der initialen Map. Das bedeutet, dass, wenn ein Nachfolger der initialen Map am Ende alle 10 dieser initialen zusätzlichen Eigenschaften verwendet, die initiale Map diese beibehält und sie als ungenutzt markiert:

![(X, Y, Z) bedeutet (Instanzgröße, Anzahl der in-Objekt-Eigenschaften, Anzahl der ungenutzten Eigenschaften).](/_img/slack-tracking/root-map-2.svg)

Was passiert jetzt, nachdem das Slack-Tracking abgeschlossen ist, wenn wir einem dieser `Peak`-Objekte eine weitere Eigenschaft hinzufügen?

```js
m1.country = &apos;Switzerland&apos;;
```

V8 muss in den Eigenschaften-Backing-Store gehen. Wir erhalten das folgende Objektlayout:

| Wort | Wert                                  |
| ---- | ------------------------------------- |
| 0    | Map                                   |
| 1    | Zeiger auf einen Eigenschaften-Backing-Store |
| 2    | Zeiger auf Elemente (leeres Array)   |
| 3    | Zeiger auf String `"Matterhorn"`      |
| 4    | `4478`                                |

Der Eigenschaften-Backing-Store sieht dann so aus:

| Wort | Wert                             |
| ---- | --------------------------------- |
| 0    | Map                               |
| 1    | Länge (3)                         |
| 2    | Zeiger auf String `"Switzerland"` |
| 3    | `undefined`                       |
| 4    | `undefined`                       |
| 5    | `undefined`                       |

Wir haben diese zusätzlichen `undefined`-Werte dort, falls Sie entscheiden, mehr Eigenschaften hinzuzufügen. Wir vermuten, dass Sie das möglicherweise tun werden, basierend auf Ihrem bisherigen Verhalten!

## Optionale Eigenschaften

Es kann passieren, dass Sie Eigenschaften nur in einigen Fällen hinzufügen. Angenommen, wenn die Höhe 4000 Meter oder mehr beträgt, möchten Sie zwei zusätzliche Eigenschaften, `prominence` und `isClimbed`, verfolgen:

```js
function Peak(name, height, prominence, isClimbed) {
  this.name = name;
  this.height = height;
  if (height >= 4000) {
    this.prominence = prominence;
    this.isClimbed = isClimbed;
  }
}
```

Sie fügen ein paar solcher unterschiedlicher Varianten hinzu:

```js
const m1 = new Peak(&apos;Wendelstein&apos;, 1838);
const m2 = new Peak(&apos;Matterhorn&apos;, 4478, 1040, true);
const m3 = new Peak(&apos;Zugspitze&apos;, 2962);
const m4 = new Peak(&apos;Mont Blanc&apos;, 4810, 4695, true);
const m5 = new Peak(&apos;Watzmann&apos;, 2713);
const m6 = new Peak(&apos;Zinalrothorn&apos;, 4221, 490, true);
const m7 = new Peak(&apos;Eiger&apos;, 3970);
```

In diesem Fall haben Objekte `m1`, `m3`, `m5` und `m7` eine Map, und Objekte `m2`, `m4` und `m6` haben eine Map weiter unten in der Kette der Nachfolger von der initialen Map, aufgrund der zusätzlichen Eigenschaften. Sobald das Slack-Tracking für diese Map-Familie abgeschlossen ist, gibt es **4** in-Objekt-Eigenschaften statt wie zuvor **2**, weil das Slack-Tracking sicherstellt, dass ausreichend Platz für die maximale Anzahl von in-Objekt-Eigenschaften bleibt, die von einem Nachfolger in der Baumstruktur der Maps unterhalb der initialen Map genutzt werden.

Unten sehen Sie die Map-Familie nach Ausführung des obigen Codes, und natürlich, das Slack-Tracking ist abgeschlossen:

![(X, Y, Z) bedeutet (Instanzgröße, Anzahl der in-Objekt-Eigenschaften, Anzahl der ungenutzten Eigenschaften).](/_img/slack-tracking/root-map-3.svg)

## Wie steht es mit optimiertem Code?

Lassen wir uns etwas optimierten Code kompilieren, bevor das Slack-Tracking abgeschlossen ist. Wir verwenden ein paar native Syntaxbefehle, um eine optimierte Kompilierung zu erzwingen, bevor wir das Slack-Tracking beenden:

```js
function foo(a1, a2, a3, a4) {
  return new Peak(a1, a2, a3, a4);
}

%PrepareFunctionForOptimization(foo);
const m1 = foo(&apos;Wendelstein&apos;, 1838);
const m2 = foo(&apos;Matterhorn&apos;, 4478, 1040, true);
%OptimizeFunctionOnNextCall(foo);
foo(&apos;Zugspitze&apos;, 2962);
```

Das sollte ausreichen, um optimierten Code zu kompilieren und auszuführen. Wir führen etwas im TurboFan (dem optimierenden Compiler) durch, das [**Create Lowering**](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-create-lowering.h;l=32;drc=ee9e7e404e5a3f75a3ca0489aaf80490f625ca27) genannt wird, bei dem wir die Erstellung von Objekten inline durchführen. Das bedeutet, dass der von uns erzeugte native Code Anweisungen enthält, um den GC nach der Instanzgröße des zu erstellenden Objekts zu fragen und dann diese Felder sorgfältig zu initialisieren. Dieser Code wäre jedoch ungültig, wenn das Slack-Tracking zu einem späteren Zeitpunkt beendet würde. Was können wir dagegen tun?

Ganz einfach! Wir beenden das Slack-Tracking frühzeitig für diese Kartenfamilie. Das ist sinnvoll, da wir normalerweise keine optimierte Funktion kompilieren, bevor Tausende von Objekten erstellt wurden. Das Slack-Tracking *sollte* also abgeschlossen sein. Wenn nicht, Pech gehabt! Das Objekt scheint sowieso nicht so wichtig zu sein, wenn bis zu diesem Zeitpunkt weniger als 7 davon erstellt wurden. (Denken Sie daran, wir optimieren normalerweise erst, nachdem das Programm lange gelaufen ist.)

### Kompilierung in einem Hintergrund-Thread

Wir können optimierten Code im Haupt-Thread kompilieren, in diesem Fall können wir uns erlauben, das Slack-Tracking vorzeitig mit einigen Aufrufen zu beenden, um die Anfangskarte zu ändern, da die Welt angehalten wurde. Wir führen jedoch so viel Kompilierung wie möglich auf einem Hintergrund-Thread durch. Von diesem Thread aus wäre es gefährlich, die Anfangskarte zu berühren, da diese *möglicherweise im Haupt-Thread geändert wird, in dem JavaScript ausgeführt wird.* Unsere Technik sieht folgendermaßen aus:

1. **Schätzen** Sie, dass die Instanzgröße dem aktuellen Stand des Slack-Trackings entspricht. Merken Sie sich diese Größe.
1. Wenn die Kompilierung fast abgeschlossen ist, kehren wir zum Haupt-Thread zurück, wo wir das Slack-Tracking sicher abschließen können, falls es noch nicht abgeschlossen wurde.
1. Prüfen: Entspricht die Instanzgröße unserer Vorhersage? Wenn ja, **alles in Ordnung**! Wenn nicht, verwerfen Sie das Codeobjekt und versuchen Sie es später erneut.

Wenn Sie das im Code sehen möchten, werfen Sie einen Blick auf die Klasse [`InitialMapInstanceSizePredictionDependency`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/compilation-dependencies.cc?q=InitialMapInstanceSizePredictionDependency&ss=chromium%2Fchromium%2Fsrc) und ihre Verwendung in `js-create-lowering.cc`, um Inline-Zuweisungen zu erstellen. Sie werden sehen, dass die Methode `PrepareInstall()` im Haupt-Thread aufgerufen wird, was das Slack-Tracking abschließt. Danach überprüft die Methode `Install()`, ob unsere Annahme über die Instanzgröße korrekt war.

Hier ist der optimierte Code mit der eingebetteten Zuweisung. Zuerst sehen Sie die Kommunikation mit dem GC, um zu überprüfen, ob wir einfach einen Zeiger um die Instanzgröße nach vorne verschieben können (dies wird als Bump-Pointer-Zuweisung bezeichnet). Dann beginnen wir, die Felder des neuen Objekts zu füllen:

```asm
…
43  mov ecx,[ebx+0x5dfa4]
49  lea edi,[ecx+0x1c]
4c  cmp [ebx+0x5dfa8],edi       ;; hey GC, können wir 28 (0x1c) Bytes bekommen, bitte?
52  jna 0x36ec4a5a  <+0x11a>

58  lea edi,[ecx+0x1c]
5b  mov [ebx+0x5dfa4],edi       ;; okay GC, wir haben es genommen. Vielen Dank.
61  add ecx,0x1                 ;; Perfekt. ecx ist mein neues Objekt.
64  mov edi,0x46647295          ;; Objekt: 0x46647295 <Map(HOLEY_ELEMENTS)>
69  mov [ecx-0x1],edi           ;; Speichern der INITIALEN KARTE.
6c  mov edi,0x56f821a1          ;; Objekt: 0x56f821a1 <FixedArray[0]>
71  mov [ecx+0x3],edi           ;; Speichern des PROPERTIES-Backingspeichers (leer)
74  mov [ecx+0x7],edi           ;; Speichern des ELEMENTS-Backingspeichers (leer)
77  mov edi,0x56f82329          ;; Objekt: 0x56f82329 <undefined>
7c  mov [ecx+0xb],edi           ;; In-Objekt-Eigenschaft 1 <-- undefined
7f  mov [ecx+0xf],edi           ;; In-Objekt-Eigenschaft 2 <-- undefined
82  mov [ecx+0x13],edi          ;; In-Objekt-Eigenschaft 3 <-- undefined
85  mov [ecx+0x17],edi          ;; In-Objekt-Eigenschaft 4 <-- undefined
88  mov edi,[ebp+0xc]           ;; Argument abrufen {a1}
8b  test_w edi,0x1
90  jz 0x36ec4a6d  <+0x12d>
96  mov eax,0x4664735d          ;; Objekt: 0x4664735d <Map(HOLEY_ELEMENTS)>
9b  mov [ecx-0x1],eax           ;; Karte weiterschieben
9e  mov [ecx+0xb],edi           ;; name = {a1}
a1  mov eax,[ebp+0x10]          ;; Argument abrufen {a2}
a4  test al,0x1
a6  jnz 0x36ec4a77  <+0x137>
ac  mov edx,0x46647385          ;; Objekt: 0x46647385 <Map(HOLEY_ELEMENTS)>
b1  mov [ecx-0x1],edx           ;; Karte weiterschieben
b4  mov [ecx+0xf],eax           ;; height = {a2}
b7  cmp eax,0x1f40              ;; ist height >= 4000?
bc  jng 0x36ec4a32  <+0xf2>
                  -- B8 start --
                  -- B9 start --
c2  mov edx,[ebp+0x14]          ;; Argument abrufen {a3}
c5  test_b dl,0x1
c8  jnz 0x36ec4a81  <+0x141>
ce  mov esi,0x466473ad          ;; Objekt: 0x466473ad <Map(HOLEY_ELEMENTS)>
d3  mov [ecx-0x1],esi           ;; schiebe die Map nach vorne
d6  mov [ecx+0x13],edx          ;; Prominenz = {a3}
d9  mov esi,[ebp+0x18]          ;; rufe Argument {a4} ab
dc  test_w esi,0x1
e1  jz 0x36ec4a8b  <+0x14b>
e7  mov edi,0x466473d5          ;; Objekt: 0x466473d5 <Map(HOLEY_ELEMENTS)>
ec  mov [ecx-0x1],edi           ;; schiebe die Map nach vorne zur Blatt-Map
ef  mov [ecx+0x17],esi          ;; isClimbed = {a4}
                  -- B10 Start (dekonstruieren Rahmen) --
f2  mov eax,ecx                 ;; bereite die Rückgabe dieses großartigen Peak-Objekts vor!
…
```

Übrigens, um all das zu sehen, sollten Sie ein Debug-Build haben und einige Flags übergeben. Ich habe den Code in eine Datei gelegt und folgendes aufgerufen:

```bash
./d8 --allow-natives-syntax --trace-opt --code-comments --print-opt-code mycode.js
```

Ich hoffe, dies war eine unterhaltsame Erkundung. Ich möchte Igor Sheludko und Maya Armyanova ganz besonders danken, dass sie diesen Beitrag (geduldig!) überprüft haben.
