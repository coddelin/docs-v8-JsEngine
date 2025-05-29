---
title: "Hinzufügen von BigInts zu V8"
author: "Jakob Kummerow, Schiedsrichter der Präzision"
date: 2018-05-02 13:33:37
tags:
  - ECMAScript
description: "V8 unterstützt jetzt BigInts, eine JavaScript-Sprachfunktion, die Ganzzahlen mit beliebiger Genauigkeit ermöglicht."
tweet: "991705626391732224"
---
In den letzten Monaten haben wir Unterstützung für [BigInts](/features/bigint) in V8 implementiert, wie in [diesem Vorschlag](https://github.com/tc39/proposal-bigint) derzeit festgelegt, um sie in eine zukünftige Version von ECMAScript aufzunehmen. Der folgende Beitrag erzählt die Geschichte unserer Abenteuer.

<!--truncate-->
## TL;DR

Als JavaScript-Programmierer haben Sie jetzt[^1] Ganzzahlen mit beliebiger[^2] Genauigkeit in Ihrem Werkzeugkasten:

```js
const a = 2172141653n;
const b = 15346349309n;
a * b;
// → 33334444555566667777n     // Hurra!
Number(a) * Number(b);
// → 33334444555566670000      // Buh!
const such_many = 2n ** 222n;
// → 6739986666787659948666753771754907668409286105635143120275902562304n
```

Einzelheiten zur neuen Funktionalität und wie sie verwendet werden kann, finden Sie in [unserem ausführlichen Artikel über BigInt](/features/bigint). Wir freuen uns darauf, die großartigen Dinge zu sehen, die Sie damit bauen werden!

[^1]: _Jetzt_, wenn Sie Chrome Beta, Dev oder Canary ausführen oder eine [Vorschauversion von Node.js](https://github.com/v8/node/tree/vee-eight-lkgr) verwenden, andernfalls _bald_ (Chrome 67, Node.js wahrscheinlich zur gleichen Zeit auf Head-of-Tree).

[^2]: Beliebig bis zu einer implementierungsdefinierten Grenze. Entschuldigung, wir haben noch nicht herausgefunden, wie man eine unendliche Menge an Daten in den begrenzten Speicher Ihres Computers quetscht.

## Darstellung von BigInts im Speicher

Typischerweise speichern Computer Ganzzahlen in den Registern ihrer CPU (die heutzutage normalerweise 32 oder 64 Bit breit sind) oder in registergroßen Speicherstücken. Dies führt zu den Mindest- und Höchstwerten, die Ihnen möglicherweise bekannt sind. Zum Beispiel kann ein 32-Bit vorzeichenbehafteter Integer Werte von -2.147.483.648 bis 2.147.483.647 enthalten. Die Idee von BigInts besteht jedoch darin, nicht durch solche Grenzen beschränkt zu sein.

Wie kann man also eine BigInt mit hundert, tausend oder einer Million Bits speichern? Sie passt nicht in ein Register, daher allokieren wir ein Objekt im Speicher. Wir machen es groß genug, um alle Bits der BigInt in einer Reihe von Stücken zu halten, die wir „Ziffern“ nennen – weil dies konzeptionell dem sehr ähnelt, wie man größere Zahlen als „9“ schreibt, indem man mehr Ziffern verwendet, wie bei „10“; außer dass das Dezimalsystem Ziffern von 0 bis 9 verwendet, verwenden unsere BigInts Ziffern von 0 bis 4294967295 (d.h. `2**32-1`). Das ist der Wertebereich eines 32-Bit-CPU-Registers[^3], ohne ein Vorzeichenbit; wir speichern das Vorzeichenbit separat. In Pseudocode sieht ein `BigInt`-Objekt mit `3*32 = 96` Bits so aus:

```js
{
  type: 'BigInt',
  sign: 0,
  num_digits: 3,
  digits: [0x12…, 0x34…, 0x56…],
}
```

[^3]: Auf 64-Bit-Maschinen verwenden wir 64-Bit-Ziffern, d.h. von 0 bis 18446744073709551615 (d.h. `2n**64n-1n`).

## Zurück zur Schule und zurück zu Knuth

Die Arbeit mit Ganzzahlen, die in CPU-Registern gespeichert sind, ist wirklich einfach: Um z. B. zwei davon zu multiplizieren, gibt es eine Maschinenanweisung, mit der die Software der CPU mitteilen kann: „Multipliziere den Inhalt dieser beiden Register!“, und die CPU macht es. Für BigInt-Arithmetik müssen wir unsere eigene Lösung finden. Zum Glück ist diese spezielle Aufgabe etwas, das buchstäblich jedes Kind irgendwann lernt zu lösen: Erinnern Sie sich, was Sie in der Schule gemacht haben, als Sie 345 \* 678 multiplizieren mussten und keinen Taschenrechner verwenden durften?

```
345 * 678
---------
     30    //   5 * 6
+   24     //  4  * 6
+  18      // 3   * 6
+     35   //   5 *  7
+    28    //  4  *  7
+   21     // 3   *  7
+      40  //   5 *   8
+     32   //  4  *   8
+    24    // 3   *   8
=========
   233910
```

Genau so multipliziert V8 BigInts: eine Ziffer nach der anderen, wobei die Zwischenergebnisse addiert werden. Der Algorithmus funktioniert für `0` bis `9` genauso gut wie für die viel größeren Ziffern eines BigInt.

Donald Knuth veröffentlichte eine spezifische Implementierung der Multiplikation und Division großer Zahlen, die aus kleineren Stücken bestehen, im zweiten Band seines klassischen Werks _The Art of Computer Programming_, bereits 1969. Die Implementierung von V8 folgt diesem Buch, was zeigt, dass dies ein ziemlich zeitloses Stück Informatik ist.

## „Weniger Desugaring“ == mehr Süßigkeiten?

Vielleicht überraschend mussten wir einige Anstrengungen darauf verwenden, scheinbar einfache einstellige Operationen wie `-x` zum Laufen zu bringen. Bis jetzt hat `-x` genau dasselbe getan wie `x * (-1)`, um die Dinge zu vereinfachen, und V8 hat diese genaue Ersetzung so früh wie möglich bei der Verarbeitung von JavaScript angewandt, nämlich im Parser. Dieser Ansatz wird als „Desugaring“ bezeichnet, da er einen Ausdruck wie `-x` als „syntaktischen Zucker“ für `x * (-1)` behandelt. Andere Komponenten (der Interpreter, der Compiler, das gesamte Laufzeitsystem) mussten nicht einmal wissen, was eine unäre Operation ist, da sie nur die Multiplikation sahen, die sie natürlich sowieso unterstützen müssen.

Mit BigInts wird diese Implementierung jedoch plötzlich ungültig, da das Multiplizieren eines BigInt mit einer Zahl (wie `-1`) einen `TypeError` werfen muss[^4]. Der Parser müsste `-x` zu `x * (-1n)` entzuckern, wenn `x` ein BigInt ist — aber der Parser kann nicht wissen, was `x` auswerten wird. Daher mussten wir aufhören, uns auf diese frühe Entzuckerung zu verlassen, und stattdessen überall eine ordnungsgemäße Unterstützung für unäre Operationen sowohl für Zahlen als auch für BigInts hinzufügen.

[^4]: Das Mischen von `BigInt` und `Number` als Operanden ist im Allgemeinen nicht erlaubt. Das ist für JavaScript etwas ungewöhnlich, aber es gibt [eine Erklärung](/features/bigint#operators) für diese Entscheidung.

## Ein bisschen Spaß mit bitweisen Operationen

Die meisten heutigen Computersysteme speichern vorzeichenbehaftete Ganzzahlen mithilfe eines cleveren Tricks namens „Zweierkomplement“, der die schönen Eigenschaften hat, dass das erste Bit das Vorzeichen anzeigt und das Hinzufügen von 1 zum Bitmuster die Zahl immer um 1 erhöht und dabei das Vorzeichenbit automatisch berücksichtigt. Zum Beispiel bei 8-Bit-Ganzzahlen:

- `10000000` ist -128, die niedrigste darstellbare Zahl,
- `10000001` ist -127,
- `11111111` ist -1,
- `00000000` ist 0,
- `00000001` ist 1,
- `01111111` ist 127, die höchste darstellbare Zahl.

Diese Kodierung ist so verbreitet, dass viele Programmierer sie erwarten und sich darauf verlassen, und die BigInt-Spezifikation spiegelt diese Tatsache wider, indem sie vorschreibt, dass BigInts so handeln müssen, als ob sie die Zweierkomplement-Darstellung verwenden würden. Wie oben beschrieben, tun dies die BigInts von V8 nicht!

Um bitweise Operationen gemäß der Spezifikation durchzuführen, müssen unsere BigInts also vorgeben, unter der Haube das Zweierkomplement zu verwenden. Bei positiven Werten macht das keinen Unterschied, aber negative Zahlen müssen zusätzliche Arbeit leisten, um dies zu erreichen. Das hat den etwas überraschenden Effekt, dass `a & b`, wenn `a` und `b` beide negative BigInts sind, tatsächlich _vier_ Schritte ausführt (anstatt nur einen, wenn sie beide positiv wären): Beide Eingaben werden in ein falsches Zweierkomplement-Format umgewandelt, dann wird die eigentliche Operation durchgeführt und schließlich wird das Ergebnis wieder in unsere echte Darstellung zurückkonvertiert. Warum das Hin und Her, fragen Sie vielleicht? Weil alle nicht-bitweisen Operationen auf diese Weise viel einfacher sind.

## Zwei neue Typen von TypedArrays

Der BigInt-Vorschlag enthält zwei neue TypedArray-Varianten: `BigInt64Array` und `BigUint64Array`. Wir können jetzt TypedArrays mit 64-Bit breiten Ganzzahl-Elementen haben, da BigInts eine natürliche Möglichkeit bieten, alle Bits in diesen Elementen zu lesen und zu schreiben, während einige Bits verloren gehen könnten, wenn man versucht, dafür Zahlen zu verwenden. Deshalb sind die neuen Arrays nicht ganz wie die bestehenden 8/16/32-Bit-Ganzzahl-TypedArrays: Der Zugriff auf ihre Elemente erfolgt immer mit BigInts; der Versuch, Zahlen zu verwenden, wirft eine Ausnahme.

```js
> const big_array = new BigInt64Array(1);
> big_array[0] = 123n;  // OK
> big_array[0]
123n
> big_array[0] = 456;
TypeError: Cannot convert 456 to a BigInt
> big_array[0] = BigInt(456);  // OK
```

Ähnlich wie JavaScript-Code, der mit diesen Arten von Arrays arbeitet, ein wenig anders aussieht und funktioniert als traditioneller TypedArray-Code, mussten wir unsere TypedArray-Implementierung verallgemeinern, um sich für die beiden Neulinge anders zu verhalten.

## Optimierungserwägungen

Vorerst liefern wir eine Basisimplementierung von BigInts. Sie ist funktional vollständig und sollte solide Leistung bieten (ein wenig schneller als bestehende Userland-Bibliotheken), aber sie ist nicht besonders optimiert. Der Grund ist, dass wir im Einklang mit unserem Ziel, realen Anwendungen Vorrang vor künstlichen Benchmarks zu geben, zunächst sehen möchten, wie Sie BigInts verwenden, damit wir dann genau die Fälle optimieren können, die Ihnen wichtig sind!

Wenn wir beispielsweise feststellen, dass relativ kleine BigInts (bis zu 64 Bits) ein wichtiger Anwendungsfall sind, könnten wir diese speichereffizienter gestalten, indem wir eine spezielle Darstellung für sie verwenden:

```js
{
  type: 'BigInt-Int64',
  value: 0x12…,
}
```

Einer der Details, die noch zu klären sind, ist, ob wir dies für „int64“-Wertebereiche, „uint64“-Bereiche oder beide tun sollten — wobei zu beachten ist, dass das Unterstützen weniger schneller Pfade bedeutet, dass wir sie schneller liefern können, und dass jeder zusätzliche schnelle Pfad ironischerweise alles andere ein wenig langsamer macht, weil betroffene Operationen immer überprüfen müssen, ob er anwendbar ist.

Eine andere Geschichte ist die Unterstützung von BigInts im optimierenden Compiler. Für rechnerisch intensive Anwendungen, die mit 64-Bit-Werten arbeiten und auf 64-Bit-Hardware laufen, wäre es viel effizienter, diese Werte in Registern zu halten, anstatt sie als Objekte auf dem Heap zuzuweisen, wie wir es derzeit tun. Wir haben Pläne, wie wir eine solche Unterstützung implementieren könnten, aber es ist ein weiterer Fall, bei dem wir zuerst herausfinden möchten, ob das wirklich das ist, was Ihnen, unseren Benutzern, am meisten wichtig ist; oder ob wir unsere Zeit stattdessen für etwas anderes verwenden sollten.

Bitte senden Sie uns Feedback dazu, wofür Sie BigInts verwenden und auf welche Probleme Sie stoßen! Sie können uns über unseren Bugtracker [crbug.com/v8/new](https://crbug.com/v8/new), per Mail an [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) oder [@v8js](https://twitter.com/v8js) auf Twitter erreichen.
