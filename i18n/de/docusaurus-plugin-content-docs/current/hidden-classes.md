---
title: &apos;Maps (Verborgene Klassen) in V8&apos;
description: &apos;Wie verfolgt und optimiert V8 die wahrgenommene Struktur Ihrer Objekte?&apos;
---

Lassen Sie uns zeigen, wie V8 seine verborgenen Klassen aufbaut. Die wichtigsten Datenstrukturen sind:

- `Map`: Die verborgene Klasse selbst. Es ist der erste Zeigerwert in einem Objekt und ermöglicht daher einen einfachen Vergleich, um festzustellen, ob zwei Objekte dieselbe Klasse haben.
- `DescriptorArray`: Die vollständige Liste der Eigenschaften, die diese Klasse hat, zusammen mit Informationen darüber. In einigen Fällen befindet sich der Eigenschaftswert sogar in diesem Array.
- `TransitionArray`: Ein Array von "Übergängen" von dieser `Map` zu benachbarten Maps. Jeder Übergang ist ein Eigenschaftsname und sollte als "Falls ich dieser Klasse eine Eigenschaft mit diesem Namen hinzufüge, zu welcher Klasse würde ich übergehen?" betrachtet werden.

Da viele `Map`-Objekte nur einen Übergang zu einem anderen haben (d.h. sie sind "Übergangskarten", die nur auf dem Weg zu etwas anderem verwendet werden), erstellt V8 nicht immer ein vollständig ausgearbeitetes `TransitionArray` dafür. Stattdessen wird einfach direkt auf diese "nächste" `Map` verlinkt. Das System muss ein bisschen im `DescriptorArray` der `Map`, auf die verwiesen wird, forschen, um herauszufinden, welcher Name mit dem Übergang verbunden ist.

Dies ist ein äußerst umfassendes Thema. Es unterliegt jedoch Änderungen, aber wenn Sie die Konzepte in diesem Artikel verstehen, sollten zukünftige Änderungen schrittweise nachvollziehbar sein.

## Warum gibt es verborgene Klassen?

V8 könnte ohne verborgene Klassen auskommen, sicher. Es würde jedes Objekt als eine Tasche mit Eigenschaften behandeln. Allerdings wäre ein sehr nützliches Prinzip verstreut geblieben: das Prinzip des intelligenten Designs. V8 geht davon aus, dass Sie nur eine begrenzte Anzahl **verschiedener** Arten von Objekten erstellen. Und jede Art von Objekt wird in Weisen verwendet werden, die sich letztendlich als stereotypisch herausstellen. Ich sage "letztendlich als sichtbar", weil die JavaScript-Sprache eine Skriptsprache ist, keine vorkompilierte. V8 weiß also nie, was als nächstes kommt. Um intelligentes Design zu nutzen (das ist die Annahme, dass es einen Verstand hinter dem Code gibt), muss V8 beobachten und warten, bis der Sinn für Struktur durchdringt. Der Mechanismus der verborgenen Klassen ist das wichtigste Mittel dafür. Natürlich setzt dies eine ausgeklügelte Hörmechanik voraus, und das sind die Inline-Caches (ICs), über die viel geschrieben wurde.

Wenn Sie also überzeugt sind, dass dies eine gute und notwendige Arbeit ist, folgen Sie mir!

## Ein Beispiel

```javascript
function Peak(name, height, extra) {
  this.name = name;
  this.height = height;
  if (isNaN(extra)) {
    this.experience = extra;
  } else {
    this.prominence = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "gut");
```

Mit diesem Code haben wir bereits einen interessanten Map-Baum von der Stammkarte (auch bekannt als Initialkarte), die mit der Funktion `Peak` verbunden ist:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="Beispiel verborgene Klassen" loading="lazy"/>
</figure>

Jede blaue Box ist eine Karte, beginnend mit der Anfangskarte. Dies ist die Karte des zurückgegebenen Objekts, wenn wir es irgendwie schaffen würden, die Funktion `Peak` auszuführen, ohne eine einzige Eigenschaft hinzuzufügen. Die darauf folgenden Karten sind diejenigen, die durch das Hinzufügen der von den Namen auf den Übergängen zwischen den Karten angegebenen Eigenschaften entstehen. Jede Karte hat eine Liste der mit einem Objekt dieser Karte verbundenen Eigenschaften. Darüber hinaus beschreibt sie den genauen Ort jeder Eigenschaft. Schließlich können Sie von einer dieser Karten, sagen wir `Map3`, die die verborgene Klasse des Objekts ist, das Sie erhalten, wenn Sie eine Zahl für das `extra`-Argument in `Peak()` übergeben, einen Rücklink bis zur Initialkarte folgen.

Lassen Sie uns das erneut zeichnen mit diesen zusätzlichen Informationen. Die Annotation (i0), (i1) bedeutet Speicherort im Objektfeld 0, 1 usw.:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="Beispiel verborgene Klassen" loading="lazy"/>
</figure>

Wenn Sie vor dem Erstellen von mindestens 7 `Peak`-Objekten Zeit damit verbringen, diese Karten zu untersuchen, werden Sie auf **Slack Tracking** stoßen, was verwirrend sein kann. Ich habe [einen anderen Artikel](https://v8.dev/blog/slack-tracking) darüber. Erstellen Sie einfach 7 weitere Objekte und es wird abgeschlossen sein. Zu diesem Zeitpunkt werden Ihre Peak-Objekte genau 3 Eigenschaften im Objektfeld haben, mit keiner Möglichkeit, direkt weitere hinzuzufügen. Alle zusätzlichen Eigenschaften werden in den Eigenschaften-Speicher des Objekts ausgelagert. Es ist einfach ein Array von Eigenschaftswerten, dessen Index von der Karte stammt (genauer gesagt, von der `DescriptorArray`, die an die Karte angehängt ist). Fügen wir eine Eigenschaft zu `m2` auf einer neuen Zeile hinzu und schauen erneut auf den Map-Baum:

```javascript
m2.cost = "ein Arm, ein Bein";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="Beispiel verborgene Klassen" loading="lazy"/>
</figure>

Ich habe hier etwas eingeschmuggelt. Beachten Sie, dass alle Eigenschaften mit "const" annotiert sind, was aus der Sicht von V8 bedeutet, dass sie seit dem Konstruktor von niemandem geändert wurden. Daher können sie als Konstanten betrachtet werden, sobald sie initialisiert wurden. TurboFan (der optimierende Compiler) liebt das. Angenommen, `m2` wird als konstante globale Variable von einer Funktion referenziert. Dann kann das Nachschlagen von `m2.cost` zur Kompilierzeit erfolgen, da das Feld als konstant markiert ist. Ich werde später im Artikel darauf zurückkommen.

Beachten Sie, dass die Eigenschaft "cost" als `const p0` markiert ist, was bedeutet, dass es sich um eine konstante Eigenschaft handelt, die an Index null im **properties backing store** gespeichert ist, anstatt direkt im Objekt. Der Grund dafür ist, dass im Objekt kein Platz mehr vorhanden ist. Diese Information ist in `%DebugPrint(m2)` sichtbar:

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - properties: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (const data field 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (const data field 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (const data field 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (const data field 3) properties[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

Sie können sehen, dass wir 4 Eigenschaften haben, die alle als konstante Werte markiert sind. Die ersten 3 sind im Objekt, und die letzte ist in `properties[0]`, was bedeutet, dass sie im ersten Slot des properties backing stores liegt. Wir können das überprüfen:

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefined>
```

Die zusätzlichen Eigenschaften sind da, falls Sie plötzlich entscheiden, weitere hinzuzufügen.

## Die wahre Struktur

Es gibt verschiedene Dinge, die wir an diesem Punkt tun könnten, aber da Sie V8 wirklich mögen müssen, wenn Sie bis hierhin gelesen haben, möchte ich versuchen, die echten Datenstrukturen zu zeichnen, die wir verwenden - diejenigen, die am Anfang von `Map`, `DescriptorArray` und `TransitionArray` erwähnt wurden. Da Sie jetzt eine Vorstellung vom Konzept der versteckten Klassen haben, das hinter den Kulissen aufgebaut wird, können Sie Ihre Gedanken besser mit den richtigen Namen und Strukturen an den Code binden. Ich werde versuchen, die letzte Abbildung in der Darstellung von V8 nachzubilden. Zunächst werde ich die **DescriptorArrays** zeichnen, die die Liste der Eigenschaften für eine gegebene Map enthalten. Diese Arrays können geteilt werden -- der Schlüssel dazu ist, dass die Map selbst weiß, wie viele Eigenschaften sie in der DescriptorArray betrachten darf. Da die Eigenschaften in der Reihenfolge erscheinen, in der sie hinzugefügt wurden, können diese Arrays von mehreren Karten geteilt werden. Siehe:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="Hidden class example" loading="lazy"/>
</figure>

Beachten Sie, dass **Map1**, **Map2** und **Map3** alle auf **DescriptorArray1** zeigen. Die Zahl neben dem Feld "descriptors" in jeder Map gibt an, wie viele Felder in der DescriptorArray zur Map gehören. **Map1**, das nur die Eigenschaft "name" kennt, schaut nur die erste Eigenschaft in **DescriptorArray1** an. **Map2** hingegen hat zwei Eigenschaften, "name" und "height." Daher betrachtet es die ersten beiden Einträge in **DescriptorArray1** (name und height). Diese Art des Teilens spart viel Speicherplatz.

Natürlich können wir dort, wo es eine Aufspaltung gibt, nicht teilen. Es gibt eine Übergang von Map2 zu Map4, wenn die Eigenschaft "experience" hinzugefügt wird, und zu Map3, wenn die Eigenschaft "prominence" hinzugefügt wird. Sie können sehen, dass Map4 und Map5 DescriptorArray2 auf die gleiche Weise gemeinsam nutzen, wie DescriptorArray1 von drei Maps geteilt wurde.

Das Einzige, was in unserem "lebensgetreuen" Diagramm fehlt, ist das `TransitionArray`, das zu diesem Zeitpunkt noch metaphorisch ist. Lassen Sie uns das ändern. Ich habe mir erlaubt, die **back pointer**-Linien zu entfernen, was die Darstellung etwas übersichtlicher macht. Denken Sie einfach daran, dass Sie von jeder Karte im Baum aus auch nach oben gehen können.

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="Hidden class example" loading="lazy"/>
</figure>

Das Diagramm belohnt genaues Studieren. **Frage: Was würde passieren, wenn eine neue Eigenschaft "rating" nach "name" hinzugefügt würde, anstatt mit "height" und anderen Eigenschaften fortzufahren?**

**Antwort**: Map1 würde ein echtes **TransitionArray** erhalten, um die Bifurkation nachzuverfolgen. Wenn die Eigenschaft *height* hinzugefügt wird, sollten wir zu **Map2** übergehen. Wenn jedoch die Eigenschaft *rating* hinzugefügt wird, sollten wir zu einer neuen Karte, **Map6**, wechseln. Diese Karte würde ein neues DescriptorArray benötigen, das *name* und *rating* erwähnt. Das Objekt hat zu diesem Zeitpunkt im Objekt zusätzliche freie Slots (nur einer von drei wird verwendet), daher wird die Eigenschaft *rating* einen dieser Slots erhalten.

*Ich habe meine Antwort mit Hilfe von `%DebugPrintPtr()` überprüft und folgendes gezeichnet:*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="Hidden class example" loading="lazy"/>
</figure>

Ihr müsst mich nicht darum bitten aufzuhören, ich sehe, dass dies die Obergrenze solcher Diagramme ist! Aber ich denke, Sie können einen Eindruck davon bekommen, wie sich die Teile bewegen. Stellen Sie sich vor, wenn wir nach dem Hinzufügen dieser Ersatz-Eigenschaft *Bewertung* mit *Höhe*, *Erfahrung* und *Kosten* weitermachen würden. Nun, wir müssten die Karten **Karte7**, **Karte8** und **Karte9** erstellen. Weil wir darauf bestanden haben, diese Eigenschaft mitten in eine bestehende Kette von Karten einzufügen, werden wir viel Struktur duplizieren. Ich habe nicht das Herz, diese Zeichnung zu machen – obwohl, wenn Sie sie mir schicken, ich sie in dieses Dokument aufnehmen werde :).

Ich habe das praktische [DreamPuf](https://dreampuf.github.io/GraphvizOnline) Projekt benutzt, um die Diagramme einfach zu erstellen. Hier ist ein [Link](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D) zum vorherigen Diagramm.

## TurboFan und konstante Eigenschaften

Bisher sind all diese Felder im `DescriptorArray` als `const` markiert. Lassen Sie uns damit spielen. Führen Sie den folgenden Code in einer Debug-Build aus:

```javascript
// ausführen als:
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Gipfel(name, höhe) {
  this.name = name;
  this.höhe = höhe;
}

let m1 = new Gipfel("Matterhorn", 4478);
m2 = new Gipfel("Wendelstein", 1838);

// Sicherstellen, dass Slack-Tracking abgeschlossen ist.
for (let i = 0; i < 7; i++) new Gipfel("blah", i);

m2.kosten = "ein Arm, ein Bein";
function foo(a) {
  return m2.kosten;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Sie erhalten einen Ausdruck der optimierten Funktion `foo()`. Der Code ist sehr kurz. Am Ende der Funktion sehen Sie:

```
...
40  mov eax,0x2a812499          ;; objekt: 0x2a812499 <String[16]: #ein Arm, ein Bein>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; Rückgabe: "ein Arm, ein Bein"!
```

TurboFan, dieser freche Teufel, hat einfach direkt den Wert von `m2.kosten` eingesetzt. Na, wie gefällt Ihnen das!

Natürlich könnten Sie nach dem letzten Aufruf von `foo()` diese Zeile einfügen:

```javascript
m2.kosten = "unbezahlbar";
```

Was denken Sie wird passieren? Eines ist sicher; wir können `foo()` nicht so belassen, wie es ist. Es würde die falsche Antwort liefern. Führen Sie das Programm erneut aus, aber fügen Sie die Flagge `--trace-deopt` hinzu, damit Sie informiert werden, wenn optimierter Code aus dem System entfernt wird. Nach der Ausgabe des optimierten `foo()` sehen Sie diese Zeilen:

```
[markierung abhängigen Codes 0x5c684901 0x21e525b9 <GemeinsameFunktionsInfo foo> (opt #0) für Deoptimierung,
    Grund: field-const]
[deoptimieren markierten Code in allen Kontexten]
```

Wow.

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="Ich mag es sehr" loading="lazy"/>
</figure>

Wenn Sie die Reoptimierung erzwingen, erhalten Sie Code, der nicht ganz so gut ist, aber immer noch stark von der beschriebenen Map-Struktur profitiert. Denken Sie daran, dass das Eigentum *cost* die erste Eigenschaft im
Eigenschaften-Speicher eines Objekts ist. Nun, es mag seine konstante Bezeichnung verloren haben, aber wir haben immer noch seine Adresse. Grundsätzlich müssen wir bei einem Objekt mit Map **Map5**, von dem wir sicherlich überprüfen können, dass die globale Variable `m2` es weiterhin hat, nur--

1. den Eigenschaften-Speicher laden, und
2. das erste Array-Element auslesen.

Lassen Sie uns das sehen. Fügen Sie diesen Code unter der letzten Zeile hinzu:

```javascript
// Erzwinge die Reoptimierung von foo().
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Sehen wir uns nun den produzierten Code an:

```
...
40  mov ecx,0x42cc8901          ;; Objekt: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; Lade den Eigenschaften-Speicher
48  mov eax,[ecx+0x7]           ;; Hole das erste Element.
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; Rückgabe im Register eax!
```

Verdammt. Das ist genau das, was passieren sollte. Vielleicht fangen wir an zu verstehen.

TurboFan ist auch clever genug, um zu deoptimieren, falls sich die Variable `m2` jemals zu einer anderen Klasse ändert. Sie können den neuesten optimierten Code erneut deoptimieren sehen, mit etwas amüsantem wie:

```javascript
m2 = 42;  // haha.
```

## Wohin gehen von hier

Viele Optionen. Map-Migration. Wörterbuch-Modus (also "Langsamer Modus"). Vieles ist in diesem Bereich zu erkunden und ich hoffe, Sie haben genauso viel Spaß wie ich – danke fürs Lesen!
