---
title: &apos;V8 Torque Builtins&apos;
description: &apos;Dieses Dokument soll eine Einführung in das Schreiben von Torque-Builtins geben und richtet sich an V8-Entwickler.&apos;
---
Dieses Dokument soll eine Einführung in das Schreiben von Torque-Builtins geben und richtet sich an V8-Entwickler. Torque ersetzt CodeStubAssembler als die empfohlene Methode zur Implementierung neuer Builtins. Siehe [CodeStubAssembler Builtins](/docs/csa-builtins) für die CSA-Version dieses Leitfadens.

## Builtins

In V8 können Builtins als Codeabschnitte betrachtet werden, die zur Laufzeit vom VM ausführbar sind. Ein häufiges Anwendungsbeispiel ist die Implementierung von Funktionen eingebauter Objekte (wie `RegExp` oder `Promise`), aber Builtins können auch verwendet werden, um andere interne Funktionalitäten bereitzustellen (z. B. als Teil des IC-Systems).

Die Builtins von V8 können mit verschiedenen Methoden implementiert werden (jede mit unterschiedlichen Abwägungen):

- **Plattformabhängige Assemblersprache**: kann sehr effizient sein, erfordert jedoch manuelle Ports auf alle Plattformen und ist schwierig zu warten.
- **C++**: sehr ähnlich im Stil zu Laufzeitfunktionen und hat Zugriff auf V8s leistungsstarke Laufzeitfunktionalität, ist jedoch in der Regel nicht für leistungsintensive Bereiche geeignet.
- **JavaScript**: prägnanter und lesbarer Code, Zugang zu schnellen Intrinsics, häufige Nutzung langsamer Laufzeitaufrufe, anfällig für unvorhersehbare Leistung durch Typverschmutzung und subtile Probleme rund um (komplizierte und nicht offensichtliche) JS-Semantik. JavaScript Builtins sind veraltet und sollten nicht mehr hinzugefügt werden.
- **CodeStubAssembler**: bietet effiziente Low-Level-Funktionalität, die der Assemblersprache sehr nahe kommt, bleibt dabei plattformunabhängig und erhält die Lesbarkeit.
- **[V8 Torque](/docs/torque)**: ist eine spezifische Domänensprache für V8, die in CodeStubAssembler übersetzt wird. Somit erweitert es CodeStubAssembler und bietet statische Typisierung sowie eine lesbare und ausdrucksstarke Syntax.

Das verbleibende Dokument konzentriert sich auf letzteres und bietet ein kurzes Tutorial zur Entwicklung eines einfachen Torque-Builtins, das in JavaScript verfügbar ist. Für umfassendere Informationen zu Torque siehe das [V8 Torque Benutzerhandbuch](/docs/torque).

## Schreiben eines Torque Builtins

In diesem Abschnitt werden wir ein einfaches CSA-Builtin schreiben, das ein einzelnes Argument entgegennimmt und zurückgibt, ob es die Zahl `42` darstellt. Das Builtin wird in JS verfügbar gemacht, indem es auf dem `Math`-Objekt installiert wird (weil wir es können).

Dieses Beispiel demonstriert:

- Erstellung eines Torque-Builtins mit JavaScript-Verknüpfung, das wie eine JS-Funktion aufgerufen werden kann.
- Nutzung von Torque zur Implementierung einfacher Logik: Typunterscheidung, Umgang mit Smi und Heap-Nummern, Bedingungsanweisungen.
- Installation des CSA-Builtins auf dem `Math`-Objekt.

Falls Sie lokal folgen möchten, basiert der folgende Code auf der Revision [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614).

## Definition von `MathIs42`

Torque-Code befindet sich in Dateien `src/builtins/*.tq`, die grob nach Themen organisiert sind. Da wir ein `Math`-Builtin schreiben werden, fügen wir unsere Definition in `src/builtins/math.tq` ein. Da diese Datei noch nicht existiert, müssen wir sie zu [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614) in [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn) hinzufügen.

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // An dieser Stelle kann x im Grunde alles sein - ein Smi, eine HeapNumber,
    // undefined oder irgendein anderes beliebiges JS-Objekt. ToNumber_Inline wird
    // im CodeStubAssembler definiert. Es integriert einen schnellen Pfad (falls das
    // Argument bereits eine Zahl ist) und ruft andernfalls das ToNumber-Builtin auf.
    const number: Number = ToNumber_Inline(x);
    // Ein typeswitch erlaubt es uns, basierend auf dem dynamischen Typ eines Wertes zu wechseln. Das Typsystem
    // weiß, dass eine Zahl nur ein Smi oder eine HeapNumber sein kann, daher ist dieser
    // Switch erschöpfend.
    typeswitch (number) {
      case (smi: Smi): {
        // Das Ergebnis von smi == 42 ist kein Javascript-Boolescher Wert, daher verwenden wir eine
        // Bedingung, um einen Javascript-Booleschen Wert zu erstellen.
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

Wir setzen die Definition in den Torque-Namensraum `math`. Da dieser Namensraum zuvor nicht existierte, müssen wir ihn zu [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614) in [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn) hinzufügen.

## Anhängen von `Math.is42`

Eingebaute Objekte wie `Math` werden größtenteils in [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) eingerichtet (mit einigen Setups, die in `.js`-Dateien erfolgen). Das Hinzufügen unseres neuen eingebauten Elements ist einfach:

```cpp
// Vorhandener Code zum Einrichten von Math, hier zur Verdeutlichung enthalten.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

Jetzt, da `is42` angehängt ist, kann es aus JS aufgerufen werden:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42(&apos;42.0&apos;);
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Definition und Aufruf eines eingebauten Elements mit Stub-Verknüpfung

Eingebaute Elemente können auch mit Stub-Verknüpfung erstellt werden (anstatt der JS-Verknüpfung, die wir oben bei `MathIs42` verwendet haben). Solche eingebauten Elemente können nützlich sein, um häufig verwendeten Code in ein separates Codeobjekt auszulagern, das von mehreren Aufrufern genutzt werden kann, während der Code nur einmal erstellt wird. Lassen Sie uns den Code, der Heap-Zahlen behandelt, in ein separates eingebautes Element namens `HeapNumberIs42` auslagern und es von `MathIs42` aufrufen.

Die Definition ist ebenfalls unkompliziert. Der einzige Unterschied zu unserem eingebauten Element mit JavaScript-Verknüpfung besteht darin, dass wir das Schlüsselwort `javascript` weglassen und kein Empfängerargument vorhanden ist.

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // Anstatt Heap-Zahlen inline zu behandeln, rufen wir jetzt unser neues eingebautes Element auf.
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

Warum sollten Sie sich überhaupt für eingebaute Elemente interessieren? Warum nicht den Code inline belassen (oder in Makros für bessere Lesbarkeit auslagern)?

Ein wichtiger Grund ist der Speicherplatz: Eingebaute Elemente werden zur Kompilierungszeit erstellt und in den V8-Snapshot aufgenommen oder in die Binärdatei eingebettet. Das Auslagern großer Codeblöcke, die häufig verwendet werden, in separate eingelassene Elemente kann schnell zu Platzersparnissen von 10 bis 100 KB führen.

## Testen eingebauter Elemente mit Stub-Verknüpfung

Auch wenn unser neues eingebautes Element eine nicht standardmäßige (zumindest keine C++) Aufrufkonvention verwendet, ist es möglich, Testfälle dafür zu schreiben. Der folgende Code kann [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) hinzugefügt werden, um das eingebaute Element auf allen Plattformen zu testen:

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
