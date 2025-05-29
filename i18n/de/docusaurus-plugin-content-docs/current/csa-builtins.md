---
title: "CodeStubAssembler-Builtins"
description: "Dieses Dokument dient als Einführung in das Schreiben von CodeStubAssembler-Builtins und richtet sich an V8-Entwickler."
---
Dieses Dokument dient als Einführung in das Schreiben von CodeStubAssembler-Builtins und richtet sich an V8-Entwickler.

:::note
**Hinweis:** [Torque](/docs/torque) ersetzt CodeStubAssembler als empfohlene Methode zur Implementierung neuer Builtins. Siehe [Torque-Builtins](/docs/torque-builtins) für die Torque-Version dieses Leitfadens.
:::

## Builtins

In V8 können Builtins als Codeblöcke betrachtet werden, die zur Laufzeit von der VM ausführbar sind. Ein häufiger Anwendungsfall ist die Implementierung der Funktionen von Builtin-Objekten (wie RegExp oder Promise), aber Builtins können auch verwendet werden, um andere interne Funktionalitäten bereitzustellen (z. B. als Teil des IC-Systems).

Die Builtins von V8 können auf verschiedene Arten implementiert werden (jede mit unterschiedlichen Vor- und Nachteilen):

- **Plattformabhängige Assemblersprache**: Kann höchst effizient sein, erfordert jedoch manuelle Portierungen auf alle Plattformen und ist schwer zu warten.
- **C++**: Sehr ähnlich im Stil wie Laufzeitfunktionen und hat Zugriff auf die leistungsstarke Laufzeitfunktionalität von V8, ist aber normalerweise nicht für performancekritische Bereiche geeignet.
- **JavaScript**: Knackiger und lesbarer Code, Zugriff auf schnelle Intrinsics, aber häufiger Gebrauch von langsamen Laufzeitaufrufen, anfällig für unvorhersehbare Leistung durch Typverschmutzung und subtile Probleme im Zusammenhang mit (komplizierten und nicht offensichtlichen) JS-Semantiken.
- **CodeStubAssembler**: Bietet effiziente Low-Level-Funktionalität, die der Assemblersprache sehr nahekommt, bleibt jedoch plattformübergreifend und bewahrt die Lesbarkeit.

Das verbleibende Dokument konzentriert sich auf letzteres und gibt ein kurzes Tutorial zur Entwicklung eines einfachen CodeStubAssembler (CSA) Builtins, das für JavaScript zugänglich ist.

## CodeStubAssembler

V8's CodeStubAssembler ist ein benutzerdefinierter, plattformunabhängiger Assembler, der Low-Level-Primitiven als dünne Abstraktion über Assembly bereitstellt, aber auch eine umfangreiche Bibliothek mit höherwertiger Funktionalität bietet.

```cpp
// Low-Level:
// Lädt die auf addr zeigend zeigergröße Daten in value.
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// Und High-Level:
// Ausführt die JS-Operation ToString(object).
// Die ToString-Semantik ist unter https://tc39.es/ecma262/#sec-tostring spezifiziert.
Node* object = /* ... */;
Node* string = ToString(context, object);
```

CSA-Builtins durchlaufen einen Teil der TurboFan-Compilierungspipeline (einschließlich Blockplanung und Registerzuweisung, jedoch insbesondere ohne Optimierungspässe), die dann den endgültigen ausführbaren Code erzeugt.

## Ein CodeStubAssembler-Builtin schreiben

In diesem Abschnitt schreiben wir ein einfaches CSA-Builtin, das ein einzelnes Argument entgegennimmt und zurückgibt, ob es die Zahl `42` darstellt. Das Builtin wird durch Installation auf dem `Math`-Objekt für JS zugänglich gemacht (weil wir es können).

Dieses Beispiel zeigt:

- Erstellen eines CSA-Builtins mit JavaScript-Linkage, das wie eine JS-Funktion aufgerufen werden kann.
- Verwendung von CSA zur Implementierung einfacher Logik: Smi- und Heap-Number-Verarbeitung, Verzweigungen und Aufrufe von TFS-Builtins.
- Nutzung von CSA-Variablen.
- Installation des CSA-Builtins auf dem `Math`-Objekt.

Falls Sie lokal mitarbeiten möchten, basiert der folgende Code auf der Revision [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0).

## Deklaration von `MathIs42`

Builtins werden im Makro `BUILTIN_LIST_BASE` in [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) deklariert. Um ein neues CSA-Builtin mit JS-Linkage und einem Parameter namens `X` zu erstellen:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Beachten Sie, dass `BUILTIN_LIST_BASE` mehrere verschiedene Makros verwendet, die unterschiedliche Builtin-Arten bezeichnen (siehe Inline-Dokumentation für weitere Details). CSA-Builtins sind speziell unterteilt in:

- **TFJ**: JavaScript-Linkage.
- **TFS**: Stub-Linkage.
- **TFC**: Stub-Linkage-Builtin, das eine benutzerdefinierte Interfacedeskriptor erfordert (z. B. wenn Argumente ungetaggt sind oder in bestimmten Registern übergeben werden müssen).
- **TFH**: Spezialisierter Stub-Linkage-Builtin, der für IC-Handler verwendet wird.

## Definition von `MathIs42`

Builtin-Definitionen befinden sich in `src/builtins/builtins-*-gen.cc`-Dateien, die grob nach Themen organisiert sind. Da wir ein `Math`-Builtin schreiben, setzen wir unsere Definition in [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1).

```cpp
// TF_BUILTIN ist ein Komfort-Makro, das hinter den Kulissen eine neue Unterklasse
// des angegebenen Assemblers erstellt.
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // Laden Sie den aktuellen Funktionskontext (ein implizites Argument für jeden Stub)
  // und das X-Argument. Beachten Sie, dass wir auf Parameter durch die
  // Namen zugreifen können, die in der Builtin-Deklaration definiert sind.
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // Zu diesem Zeitpunkt kann x im Grunde alles sein - ein Smi, eine HeapNumber,
  // undefined oder ein beliebiges anderes JS-Objekt. Lassen Sie uns die ToNumber-Builtin
  // aufrufen, um x in eine Zahl umzuwandeln, die wir verwenden können.
  // CallBuiltin kann verwendet werden, um bequem jede CSA-Builtin aufzurufen.
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // Erstellen Sie eine CSA-Variable, um den resultierenden Wert zu speichern. Der Typ der
  // Variable ist kTagged, da wir nur getaggte Zeiger darin speichern werden.
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // Wir müssen ein paar Labels definieren, die als Sprungziele verwendet werden.
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber gibt immer eine Zahl zurück. Wir müssen zwischen Smis
  // und Heap-Zahlen unterscheiden - hier prüfen wir, ob number ein Smi ist, und springen
  // bedingt zu den entsprechenden Labels.
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // Das Binden eines Labels beginnt mit der Generierung von Code dafür.
  BIND(&if_issmi);
  {
    // SelectBooleanConstant gibt die JS-true/false-Werte zurück, abhängig davon,
    // ob die übergebene Bedingung wahr/falsch ist. Das Ergebnis wird an unsere
    // var_result-Variable gebunden, und wir springen dann bedingungslos zum out-Label.
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber kann nur entweder ein Smi oder eine Heap-Nummer zurückgeben. Um sicherzugehen,
    // fügen wir hier eine Assertion hinzu, die überprüft, dass number tatsächlich eine Heap-Nummer ist.
    CSA_ASSERT(this, IsHeapNumber(number));
    // Heap-Zahlen enthalten einen Gleitkommawert. Wir müssen diesen explizit extrahieren,
    // einen Gleitkomma-Vergleich durchführen und erneut
    // var_result basierend auf dem Ergebnis binden.
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## Anhängen von `Math.Is42`

Builtin-Objekte wie `Math` werden größtenteils in [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) eingerichtet (mit einigen Einstellungen in `.js`-Dateien). Das Anhängen unseres neuen Builtin ist einfach:

```cpp
// Bereits vorhandener Code zum Einrichten von Math, hier zur Klarstellung enthalten.
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […snip…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

Jetzt, da `Is42` angehängt ist, kann es aus JS heraus aufgerufen werden:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## Definieren und Aufrufen eines Builtin mit Stub-Verknüpfung

CSA-Builtins können auch mit Stub-Verknüpfung erstellt werden (anstatt wie bei `MathIs42` oben beschrieben mit JS-Verknüpfung). Solche Builtins können nützlich sein, um häufig verwendeten Code in ein separates Codeobjekt auszulagern, das von mehreren Aufrufern genutzt werden kann, während der Code nur einmal generiert wird. Lassen Sie uns den Code, der Heap-Zahlen verarbeitet, in ein separates Builtin namens `MathIsHeapNumber42` extrahieren und dieses von `MathIs42` aufrufen.

Das Definieren und Verwenden von TFS-Stubs ist einfach; die Deklaration wird erneut in [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) platziert:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

Beachten Sie, dass die Reihenfolge innerhalb von `BUILTIN_LIST_BASE` derzeit wichtig ist. Da `MathIs42` `MathIsHeapNumber42` aufruft, muss ersteres nach letzterem aufgeführt werden (diese Anforderung sollte irgendwann aufgehoben werden).

Die Definition ist ebenfalls einfach. In [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1):

```cpp
// Das Definieren eines TFS-Builtins funktioniert genau so wie bei TFJ-Builtins.
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

Schließlich rufen wir unser neues Builtin von `MathIs42` aus auf:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […snip…]
  BIND(&if_isheapnumber);
  {
    // Anstatt Heap-Nummern inline zu bearbeiten, rufen wir jetzt unser neues TFS-Stub auf.
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […snip…]
}
```

Warum sollten Sie sich überhaupt für TFS-Builtins interessieren? Warum den Code nicht inline lassen (oder zur besseren Lesbarkeit in eine Hilfsmethode auslagern)?

Ein wichtiger Grund ist der Speicherplatz: Builtins werden zur Kompilierungszeit erzeugt und sind im V8-Snapshot enthalten, wodurch sie bedingungslos (signifikanten) Speicherplatz in jeder erstellten Isolate beanspruchen. Die Auslagerung großer Teile häufig verwendeten Codes in TFS-Builtins kann schnell zu Speicherplatzersparnissen im Bereich von 10 bis 100 KB führen.

## Testen von Stub-Linkage-Builtins

Auch wenn unser neues Builtin eine nicht standardmäßige (zumindest nicht C++) Aufrufkonvention verwendet, ist es möglich, Testfälle dafür zu schreiben. Der folgende Code kann zu [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) hinzugefügt werden, um das Builtin auf allen Plattformen zu testen:

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
