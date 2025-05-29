---
title: &apos;Indicium: Werkzeug zur Analyse der V8-Laufzeit&apos;
author: &apos;Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))&apos;
avatars:
  - &apos;zeynep-cankara&apos;
date: 2020-10-01 11:56:00
tags:
  - tools
  - system-analyzer
description: &apos;Indicium: V8-Systemanalysetool zur Analyse von Map/IC-Ereignissen.&apos;
tweet: &apos;1311689392608731140&apos;
---
# Indicium: V8-Systemanalysator

Die vergangenen drei Monate waren für mich eine großartige Lernerfahrung, da ich als Praktikantin dem V8-Team (Google London) beigetreten bin und an einem neuen Tool namens [*Indicium*](https://v8.dev/tools/head/system-analyzer) gearbeitet habe.

Dieser Systemanalysator ist eine einheitliche Webschnittstelle, um Muster der Erstellung und Änderung von Inline-Caches (ICs) und Maps in realen Anwendungen zu verfolgen, zu debuggen und zu analysieren.

V8 verfügt bereits über eine Tracing-Infrastruktur für [ICs](https://mathiasbynens.be/notes/shapes-ics) und [Maps](https://v8.dev/blog/fast-properties), die IC-Ereignisse mit dem [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) und Map-Ereignisse mit dem [Map Processor](https://v8.dev/tools/v8.7/map-processor.html) verarbeiten und analysieren kann. Die bisherigen Tools ermöglichten jedoch keine ganzheitliche Analyse von Maps und ICs – mit dem Systemanalysator ist dies jetzt möglich.

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## Fallstudie

Lassen Sie uns ein Beispiel betrachten, um zu demonstrieren, wie wir das Indicium verwenden können, um Map- und IC-Protokollereignisse in V8 zu analysieren.

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// Aufwärmphase
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time(&apos;snippet1&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;snippet1&apos;);

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time(&apos;snippet2&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;snippet2&apos;);
```

Hier haben wir eine `Point`-Klasse, die zwei Koordinaten und einen zusätzlichen Boolean basierend auf den Werten der Koordinaten speichert. Die `Point`-Klasse hat eine `dotProduct`-Methode, die das Skalarprodukt zwischen dem übergebenen Objekt und dem Empfänger zurückgibt.

Um das Programm besser zu erklären, teilen wir es in zwei Abschnitte auf (wir ignorieren die Aufwärmphase):

### *Abschnitt 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time(&apos;snippet1&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;snippet1&apos;);
```

### *Abschnitt 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time(&apos;snippet2&apos;);
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd(&apos;snippet2&apos;);
```

Wenn wir das Programm ausführen, bemerken wir einen Leistungsabfall. Obwohl wir die Leistung von zwei ähnlichen Abschnitten messen, greifen wir in einer Schleife auf die Eigenschaften `x` und `y` der `Point`-Objektinstanzen zu, indem wir die Funktion `dotProduct` aufrufen.

Abschnitt 1 wird etwa dreimal schneller ausgeführt als Abschnitt 2. Der einzige Unterschied besteht darin, dass wir in Abschnitt 2 negative Werte für die Eigenschaften `x` und `y` des `Point`-Objekts verwenden.

![Leistungsanalyse der Abschnitte.](/_img/system-analyzer/initial-program-performance.png)

Um diesen Leistungsunterschied zu analysieren, können wir verschiedene Protokollierungsoptionen verwenden, die mit V8 geliefert werden. Hier glänzt der Systemanalysator. Er kann Protokollereignisse anzeigen und mit Map-Ereignissen verknüpfen, sodass wir die Magie innerhalb von V8 erkunden können.

Bevor wir weiter in die Fallstudie eintauchen, lassen Sie uns mit den Panels des Systemanalysator-Tools vertraut machen. Das Tool hat vier Hauptpanels:

- ein Zeitachsen-Panel zum Analysieren von Map/IC-Ereignissen über die Zeit,
- ein Map-Panel zur Visualisierung der Übergangsbäume der Maps,
- ein IC-Panel für Statistiken zu den IC-Ereignissen,
- ein Quell-Panel zur Anzeige von Map/IC-Dateipositionen in einem Skript.

![Übersicht Systemanalysator](/_img/system-analyzer/system-analyzer-overview.png)

![Gruppieren von IC-Ereignissen nach Funktionsnamen, um detaillierte Informationen über die mit `dotProduct` verbundenen IC-Ereignisse zu erhalten.](/_img/system-analyzer/case1_1.png)

Wir analysieren, wie die Funktion `dotProduct` diesen Leistungsunterschied verursachen könnte. Daher gruppieren wir die IC-Ereignisse nach Funktionsnamen, um detailliertere Informationen über die mit der Funktion `dotProduct` verbundenen IC-Ereignisse zu erhalten.

Das erste, was wir bemerken, ist, dass wir zwei verschiedene IC-Zustandsübergänge haben, die von den IC-Ereignissen in dieser Funktion aufgezeichnet wurden. Ein Übergang von nicht initialisiert zu monomorph und ein anderer Übergang von monomorph zu polymorph. Der polymorphe IC-Zustand zeigt an, dass wir jetzt mehr als eine Map verfolgen, die mit `Point`-Objekten verbunden ist, und dieser polymorphe Zustand ist schlechter, da wir zusätzliche Überprüfungen durchführen müssen.

Wir möchten wissen, warum wir mehrere Map-Formen für denselben Objekttyp erstellen. Dazu aktivieren wir die Info-Schaltfläche zum IC-Zustand, um mehr Informationen über die Map-Adressen zu erhalten, die vom Zustand "uninitialisiert" zu "monomorph" wechseln.

![Der Map-Übergangsbaum, der mit dem monomorphen IC-Zustand verbunden ist.](/_img/system-analyzer/case1_2.png)

![Der Map-Übergangsbaum, der mit dem polymorphen IC-Zustand verbunden ist.](/_img/system-analyzer/case1_3.png)

Für den monomorphen IC-Zustand können wir den Übergangsbaum visualisieren und sehen, dass wir nur dynamisch zwei Eigenschaften `x`und `y` hinzufügen. Doch im Fall des polymorphen IC-Zustands haben wir eine neue Map mit drei Eigenschaften `isNegative`, `x` und `y`.

![Das Map-Panel übermittelt die Dateiposition, um auf dem Quellcode-Panel die Dateipositionen hervorzuheben.](/_img/system-analyzer/case1_4.png)

Wir klicken auf den Abschnitt mit der Dateiposition im Map-Panel, um zu sehen, wo diese Eigenschaft `isNegative` im Quellcode hinzugefügt wird, und können diese Erkenntnis nutzen, um das Leistungsproblem anzugehen.

Die Frage lautet also jetzt: *Wie können wir das Leistungsproblem angehen, indem wir die Erkenntnisse aus dem Tool nutzen?*

Die einfachste Lösung wäre, die Eigenschaft `isNegative` immer zu initialisieren. Allgemein gilt der Rat, dass alle Instanzvariablen im Konstruktor initialisiert werden sollten.

Die aktualisierte `Point`-Klasse sieht nun wie folgt aus:

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

Wenn wir das Skript erneut ausführen und die modifizierte `Point`-Klasse verwenden, sehen wir, dass die Ausführung der beiden zu Beginn der Fallstudie definierten Schnipsel sehr ähnlich ist.

In einer aktualisierten Spur sehen wir, dass der polymorphe IC-Zustand vermieden wird, da wir für denselben Objekttyp nicht mehrere Maps erstellen.

![Der Map-Übergangsbaum des modifizierten Point-Objekts.](/_img/system-analyzer/case2_1.png)

## Der System-Analyzer

Lassen Sie uns nun einen detaillierten Blick auf die verschiedenen Panels im System-Analyzer werfen.

### Timeline-Panel

Das Timeline-Panel ermöglicht die Auswahl eines Zeitpunkts oder Zeitbereichs und die Visualisierung der IC/Map-Zustände über diese Zeitpunkte. Es unterstützt Filterfunktionen wie das Hinein- oder Herauszoomen in die Log-Ereignisse für ausgewählte Zeitbereiche.

![Überblick über das Timeline-Panel](/_img/system-analyzer/timeline-panel.png)

![Überblick über das Timeline-Panel (Fortsetzung)](/_img/system-analyzer/timeline-panel2.png)

### Map-Panel

Das Map-Panel besteht aus zwei Unterabschnitten:

1. Map-Details
2. Map-Übergänge

Das Map-Panel visualisiert die Übergangsbaumstrukturen der ausgewählten Maps. Die Metadaten der ausgewählten Map werden im Map-Details-Unterabschnitt angezeigt. Ein spezifischer Übergangsbaum einer Map-Adresse kann über die bereitgestellte Schnittstelle durchsucht werden. Im oberen Statistiken-Unterabschnitt, der sich über dem Map-Übergänge-Unterabschnitt befindet, können wir Statistiken über die Eigenschaften sehen, die Map-Übergänge verursachen, sowie die Typen von Map-Ereignissen.

![Überblick über das Map-Panel](/_img/system-analyzer/map-panel.png)

![Überblick über das Statistiken-Panel](/_img/system-analyzer/stats-panel.png)

### IC-Panel

Das IC-Panel zeigt Statistiken zu IC-Ereignissen an, die innerhalb eines bestimmten Zeitbereichs fallen und durch das Timeline-Panel gefiltert werden. Zusätzlich erlaubt das IC-Panel, IC-Ereignisse nach verschiedenen Optionen zu gruppieren (Typ, Kategorie, Map, Dateiposition). Durch die Gruppierungsoptionen für Map- und Dateiposition können das Map-Panel und das Quellcode-Panel interagieren, um Übergangsbaumstrukturen zu visualisieren und die mit IC-Ereignissen verbundenen Dateipositionen hervorzuheben.

![Überblick über das IC-Panel](/_img/system-analyzer/ic-panel.png)

![Überblick über das IC-Panel (Fortsetzung)](/_img/system-analyzer/ic-panel2.png)

![Überblick über das IC-Panel (Fortsetzung)](/_img/system-analyzer/ic-panel3.png)

![Überblick über das IC-Panel (Fortsetzung)](/_img/system-analyzer/ic-panel4.png)

### Quellcode-Panel

Das Quellcode-Panel zeigt die geladenen Skripte mit anklickbaren Markern, die benutzerdefinierte Ereignisse auslösen, welche sowohl Map- als auch IC-Log-Ereignisse in den benutzerdefinierten Panels auswählen. Die Auswahl eines geladenen Skripts kann über die Drill-down-Leiste erfolgen. Die Auswahl einer Dateiposition im Map- oder IC-Panel hebt die ausgewählte Dateiposition im Quellcode-Panel hervor.

![Überblick über das Quellcode-Panel](/_img/system-analyzer/source-panel.png)

### Danksagungen

Ich möchte allen im V8- und Web-on-Android-Team danken, insbesondere meinem Host Sathya und meinem Co-Host Camillo, die mich während meines Praktikums unterstützt haben und mir die Gelegenheit gaben, an einem so tollen Projekt zu arbeiten.

Ich hatte einen fantastischen Sommer als Praktikant bei Google!
