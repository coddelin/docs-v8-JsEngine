---
title: 'Beherrschung der Architekturkomplexität in V8 — der CodeStubAssembler'
author: '[Daniel Clifford](https://twitter.com/expatdanno), CodeStubAssembler Assembler'
date: 2017-11-16 13:33:37
tags:
  - Interna
description: 'V8 hat eine eigene Abstraktion über Assemblersprache geschaffen: den CodeStubAssembler. Der CSA ermöglicht es V8, JavaScript-Funktionen auf niedriger Ebene schnell und zuverlässig zu optimieren und dabei mehrere Plattformen zu unterstützen.'
tweet: '931184976481177600'
---
In diesem Beitrag möchten wir den CodeStubAssembler (CSA) vorstellen, eine Komponente in V8, die ein äußerst nützliches Werkzeug bei der Erreichung einiger [großer](/blog/optimizing-proxies) [Leistungssteigerungen](https://twitter.com/v8js/status/918119002437750784) [Erfolge](https://twitter.com/_gsathya/status/900188695721984000) in den letzten V8-Versionen war. Der CSA hat auch die Fähigkeit des V8-Teams, JavaScript-Funktionen auf niedriger Ebene schnell und zuverlässig zu optimieren, erheblich verbessert, was die Entwicklungsgeschwindigkeit des Teams erhöhte.

<!--truncate-->
## Eine kurze Geschichte der Builtins und handgeschriebenen Assemblersprache in V8

Um die Rolle des CSA in V8 zu verstehen, ist es wichtig, ein wenig Kontext und die Geschichte zu kennen, die zu seiner Entwicklung führte.

V8 holt Leistung aus JavaScript heraus, indem es eine Kombination von Techniken anwendet. Für JavaScript-Code, der lange ausgeführt wird, leistet V8s [TurboFan](/docs/turbofan) Optimierungscompiler großartige Arbeit, indem er die gesamte Bandbreite der ES2015+ Funktionalität für maximale Leistung beschleunigt. Allerdings muss V8 auch kurzlebigen JavaScript-Code effizient ausführen, um eine gute Basisleistung zu gewährleisten. Dies ist insbesondere bei den sogenannten **Builtin-Funktionen** der Fall, die in der ECMAScript-Spezifikation [definiert](https://tc39.es/ecma262/) sind und allen JavaScript-Programmen auf vordefinierten Objekten zur Verfügung stehen.

Historisch wurden viele dieser Builtin-Funktionen [self-hosted](https://en.wikipedia.org/wiki/Self-hosting), das heißt, sie wurden von einem V8-Entwickler in JavaScript geschrieben – wenn auch in einem speziellen V8-internen Dialekt. Um gute Leistung zu erzielen, nutzen diese Self-hosted Builtins dieselben Mechanismen, die V8 zur Optimierung von vom Nutzer bereitgestelltem JavaScript verwendet. Wie bei vom Nutzer bereitgestelltem Code benötigen die Self-hosted Builtins eine Aufwärmphase, in der Typ-Feedback gesammelt wird, und müssen vom Optimierungscompiler kompiliert werden.

Obwohl diese Technik in einigen Situationen eine gute Builtin-Leistung bietet, ist es möglich, noch besser zu werden. Die genauen Semantiken der vordefinierten Funktionen im `Array.prototype` werden im Standard [detailliert spezifiziert](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object). Für wichtige und häufige Sonderfälle wissen die V8-Implementierer im Voraus genau, wie diese Builtin-Funktionen funktionieren sollen, indem sie die Spezifikation verstehen, und sie nutzen dieses Wissen, um sorgfältig optimierte, handgefertigte Versionen zu erstellen. Diese _optimierten Builtins_ bearbeiten häufige Fälle ohne Aufwärmphase oder die Notwendigkeit des Optimierungscompilers, da die Basisleistung bereits bei der ersten Ausführung optimal ist.

Um die beste Leistung aus handgeschriebenen, eingebauten JavaScript-Funktionen herauszuholen (und aus anderen Fast-Path V8-Code, die auch etwas verwirrend als Builtins bezeichnet werden), schrieben V8-Entwickler traditionell optimierte Builtins in Assemblersprache. Durch die Verwendung von Assembler sind die handgeschriebenen Builtin-Funktionen besonders schnell, unter anderem durch das Vermeiden teurer Aufrufe von V8s C++-Code über Trampolins und durch die Nutzung des registerbasierten [ABI](https://en.wikipedia.org/wiki/Application_binary_interface) von V8, das intern verwendet wird, um JavaScript-Funktionen aufzurufen.

Aufgrund der Vorteile handgeschriebener Assemblersprache hat V8 über die Jahre buchstäblich Zehntausende von Zeilen handgeschriebener Assemblersprache für Builtins angesammelt… _pro Plattform_. Alle diese handgeschriebenen Assembly-Builtins waren großartig für die Leistungsoptimierung, aber neue Sprachfunktionen werden ständig standardisiert, und die Pflege und Erweiterung dieser handgeschriebenen Assemblersprache war mühsam und fehleranfällig.

## Einführung des CodeStubAssembler

V8-Entwickler standen jahrelang vor einem Dilemma: Ist es möglich, Builtins zu erstellen, die die Vorteile handgeschriebener Assemblersprache haben, ohne gleichzeitig fragil und schwer zu warten zu sein?

Mit dem Aufkommen von TurboFan ist die Antwort auf diese Frage endlich „ja“. Der Backend von TurboFan verwendet eine plattformübergreifende [intermediate representation](https://de.wikipedia.org/wiki/Zwischenrepr%C3%A4sentation) (IR) für Maschinenoperationen auf niedriger Ebene. Diese niedrige Maschinen-IR wird einem Instruktionsselektor, Registerzuweiser, Instruktionsplaner und Codegenerator zugeführt, die auf allen Plattformen sehr guten Code erzeugen. Der Backend kennt auch viele der Tricks, die in V8s handgeschriebenen Assembly-Builtins verwendet werden—z.B. wie man ein benutzerdefiniertes registerbasiertes ABI verwendet und aufruft, wie man maschinenebene Tail Calls unterstützt und wie man die Erstellung von Stack-Frames in Leaf-Funktionen vermeidet. Dieses Wissen macht das TurboFan-Backend besonders gut geeignet, schnellen Code zu erzeugen, der sich gut mit dem Rest von V8 integriert.

Diese Kombination von Funktionalitäten machte eine robuste und wartbare Alternative zu handgeschriebenen Assembly-Builtins erstmals möglich. Das Team entwickelte eine neue V8-Komponente—genannt CodeStubAssembler oder CSA—, die eine portable Assemblersprache definiert, die auf TurboFans Backend basiert. Der CSA fügt eine API hinzu, um TurboFan-Maschinenlevel-IR direkt zu generieren, ohne JavaScript schreiben und analysieren oder TurboFans JavaScript-spezifische Optimierungen anwenden zu müssen. Obwohl dieser Schnellweg zur Codegenerierung nur von V8-Entwicklern genutzt werden kann, um das V8-Engine intern zu beschleunigen, profitieren alle Entwickler effizient von dieser Methode zur plattformübergreifenden Generierung von optimiertem Assembly-Code. Dies gilt auch für in CSA konstruierte Builtins, einschließlich der für die Leistung kritischen Bytecode-Handler des V8-Interpreters [Ignition](/docs/ignition).

![Die CSA- und JavaScript-Kompilierungspipelines](/_img/csa/csa.svg)

Die CSA-Schnittstelle umfasst Operationen, die sehr niedrig angesetzt sind und jedem vertraut sind, der jemals Assemblercode geschrieben hat. Zum Beispiel umfasst sie Funktionen wie „Laden Sie diesen Objektzeiger von einer bestimmten Adresse“ und „Multiplizieren Sie diese beiden 32-Bit-Zahlen“. Der CSA führt Typüberprüfungen auf IR-Ebene durch, um viele Korrektheitsfehler zur Kompilierzeit anstelle der Laufzeit zu erkennen. Beispielsweise kann sichergestellt werden, dass ein V8-Entwickler nicht versehentlich einen aus dem Speicher geladenen Objektzeiger als Eingabe für eine 32-Bit-Multiplikation verwendet. Diese Art von Typüberprüfung ist bei handgeschriebenen Assembly-Stubs einfach nicht möglich.

## Eine CSA-Testfahrt

Um eine bessere Vorstellung davon zu bekommen, was der CSA bietet, gehen wir ein schnelles Beispiel durch. Wir fügen ein neues internes Builtin zu V8 hinzu, das die Länge eines Strings aus einem Objekt zurückgibt, falls es sich um einen String handelt. Ist das Eingabeobjekt kein String, gibt das Builtin `undefined` zurück.

Zuerst fügen wir eine Zeile in das `BUILTIN_LIST_BASE`-Makro in V8s [`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h)-Datei ein, die das neue Builtin namens `GetStringLength` deklariert und angibt, dass es einen einzigen Eingabeparameter hat, der mit der Konstante `kInputObject` identifiziert wird:

```cpp
TFS(GetStringLength, kInputObject)
```

Das `TFS`-Makro deklariert das Builtin als ein **T**urbo**F**an-Builtin mit standardmäßiger Code**S**tub-Verlinkung, was einfach bedeutet, dass es den CSA zur Codegenerierung verwendet und erwartet, dass Parameter über Register übergeben werden.

Wir können dann den Inhalt des Builtins in [`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc) definieren:

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // Abrufen des eingehenden Objekts mit der konstanten, die wir
  // für den ersten Parameter definiert haben.
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // Prüfen, ob die Eingabe ein Smi ist (eine spezielle Darstellung
  // für kleine Zahlen). Dies muss vor der IsString-Prüfung unten
  // erfolgen, da IsString annimmt, dass sein Argument ein
  // Objektzeiger und kein Smi ist. Wenn das Argument tatsächlich ein
  // Smi ist, springen Sie zur Markierung |not_string|.
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // Prüfen, ob das Eingabeobjekt ein String ist. Falls nicht, springen
  // Sie zur Markierung |not_string|.
  GotoIfNot(IsString(maybe_string), &not_string);

  // Die Länge des Strings laden (nachdem man in diesen Codepfad
  // gelangt ist, weil oben überprüft wurde, dass es ein String war) und
  // sie mit einem CSA-„Makro“ LoadStringLength zurückgeben.
  Return(LoadStringLength(maybe_string));

  // Definieren Sie die Position des Labels, das Ziel der
  // fehlgeschlagenen IsString-Prüfung oben ist.
  BIND(&not_string);

  // Eingabeobjekt ist kein String. Gibt die JavaScript-Konstante
  // undefined zurück.
  Return(UndefinedConstant());
}
```

Beachten Sie, dass in dem obigen Beispiel zwei Arten von Anweisungen verwendet werden. Es gibt _primitive_ CSA-Anweisungen, die direkt in ein oder zwei Assembly-Anweisungen übersetzt werden, wie zum Beispiel `GotoIf` und `Return`. Es gibt eine feste Menge vordefinierter primitiver CSA-Anweisungen, die grob den am häufigsten verwendeten Assembly-Anweisungen entsprechen, die man in einer der von V8 unterstützten Chip-Architekturen findet. Andere Anweisungen im Beispiel sind _Makro_-Anweisungen, wie `LoadStringLength`, `TaggedIsSmi` und `IsString`, die Komfortfunktionen sind, um eine oder mehrere primitive oder Makroanweisungen inline auszugeben. Makroanweisungen dienen der Kapselung häufig verwendeter V8-Implementierungsstile für die einfache Wiederverwendung. Sie können beliebig lang sein und neue Makroanweisungen können von V8-Entwicklern bei Bedarf einfach definiert werden.

Nach der Kompilierung von V8 mit den oben genannten Änderungen können wir `mksnapshot`, das Tool, das Builtins kompiliert, um sie für den Snapshot von V8 vorzubereiten, mit der Kommandozeilenoption `--print-code` ausführen. Diese Option gibt den generierten Assemblercode für jedes Builtin aus. Wenn wir im Output nach `GetStringLength` suchen (`grep`), erhalten wir das folgende Ergebnis auf x64 (der Codeauszug wurde ein wenig bereinigt, um ihn lesbarer zu machen):

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

Auf 32-Bit-ARM-Plattformen wird der folgende Code von `mksnapshot` generiert:

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

Obwohl unser neues Builtin eine nicht standardmäßige (zumindest nicht C++) Aufrufkonvention verwendet, können Tests dafür geschrieben werden. Der folgende Code kann zu [`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) hinzugefügt werden, um das Builtin auf allen Plattformen zu testen:

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // Testfall, bei dem der Input ein String ist
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // Testfall, bei dem der Input kein String ist (z. B. undefined)
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

Weitere Details zur Nutzung der CSA für verschiedene Arten von Builtins und zusätzliche Beispiele finden Sie auf [dieser Wiki-Seite](/docs/csa-builtins).

## Ein Geschwindigkeitsschub für die V8-Entwicklung

Die CSA ist mehr als nur eine universelle Assemblersprache, die mehrere Plattformen unterstützt. Sie ermöglicht eine deutlich schnellere Implementierung neuer Features im Vergleich zum manuell geschriebenen Code für jede Architektur, wie wir es früher gemacht haben. Dies geschieht, indem sie alle Vorteile von handgeschriebenem Assembler bietet und gleichzeitig die Entwickler vor dessen tückischsten Fallstricken schützt:

- Mit der CSA können Entwickler Builtin-Code mit einer plattformübergreifenden Menge an Low-Level-Primitiven schreiben, die direkt in Assembleranweisungen übersetzt werden. Der Anweisungsauswähler der CSA stellt sicher, dass dieser Code auf allen von V8 unterstützten Plattformen optimal ist, ohne dass V8-Entwickler Experten in der Assemblersprache jeder dieser Plattformen sein müssen.
- Die Schnittstelle der CSA verfügt über optionale Typen, um sicherzustellen, dass die von dem Low-Level generierten Assemblercode manipulierten Werte dem Typ entsprechen, den der Autor des Codes erwartet.
- Die Registerallokation zwischen Assembleranweisungen wird von der CSA automatisch durchgeführt, anstatt manuell, einschließlich des Aufbaus von Stack-Frames und des Auslagerns von Werten auf den Stack, wenn ein Builtin mehr Register verwendet als verfügbar sind oder einen Aufruf macht. Dies beseitigt eine ganze Klasse subtiler, schwer zu findender Fehler, die handgeschriebene Assembler-Builtins plagten. Indem der generierte Code weniger fragil wird, reduziert die CSA drastisch die Zeit, die für das Schreiben korrekter Low-Level-Builtins erforderlich ist.
- Die CSA versteht ABI-Aufrufkonventionen – sowohl die Standard-C++- als auch die internen, registerbasierten von V8 – was es einfach macht, zwischen CSA-generiertem Code und anderen Teilen von V8 zu interagieren.
- Da CSA-Code in C++ geschrieben ist, lassen sich allgemeine Codeerzeugungsmuster leicht in Makros kapseln, die in vielen Builtins wiederverwendet werden können.
- Da V8 die CSA zur Erzeugung der Bytecode-Handler für Ignition verwendet, ist es sehr einfach, die Funktionalität von CSA-basierten Builtins direkt in die Handler einzubinden, um die Leistung des Interpreters zu verbessern.
- Das Test-Framework von V8 unterstützt das Testen von CSA-Funktionalität und CSA-generierten Builtins direkt von C++ aus, ohne dass Assembleradapter geschrieben werden müssen.

Alles in allem war die CSA ein absoluter Wendepunkt für die V8-Entwicklung. Sie hat die Fähigkeit des Teams, V8 zu optimieren, erheblich verbessert. Das bedeutet, dass wir in der Lage sind, mehr Teile der JavaScript-Sprache schneller für die V8-Embedder zu optimieren.
