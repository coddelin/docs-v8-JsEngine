---
title: 'V8 Torque Benutzerhandbuch'
description: 'Dieses Dokument erklärt die V8 Torque-Sprache, wie sie im V8-Code verwendet wird.'
---
V8 Torque ist eine Sprache, die es Entwicklern, die zum V8-Projekt beitragen, ermöglicht, Änderungen an der VM auszudrücken, indem sie sich auf die _Absicht_ ihrer Änderungen konzentrieren, anstatt sich mit nicht verbundenen Implementierungsdetails zu beschäftigen. Die Sprache wurde so konzipiert, dass sie einfach genug ist, um die [ECMAScript-Spezifikation](https://tc39.es/ecma262/) leicht in eine Implementierung in V8 zu übersetzen. Gleichzeitig ist sie jedoch leistungsstark genug, um die V8-Optimierungstricks auf niedriger Ebene robust darzustellen, wie z. B. das Erstellen von schnelleren Pfaden basierend auf Tests für bestimmte Objektformen.

Torque wird V8-Ingenieuren und JavaScript-Entwicklern vertraut sein, da es eine TypeScript-ähnliche Syntax kombiniert, die es erleichtert, V8-Code sowohl zu schreiben als auch zu verstehen, mit einer Syntax und Typen, die Konzepte widerspiegeln, die im [`CodeStubAssembler`](/blog/csa) bereits geläufig sind. Mit einem starken Typsystem und einer strukturierten Kontrollflussstruktur sorgt Torque durch die Konstruktion für Korrektheit. Torque ist ausdrucksstark genug, um fast alle Funktionen auszudrücken, die [derzeit in V8-Builtins zu finden sind](/docs/builtin-functions). Es ist außerdem sehr interoperabel mit `CodeStubAssembler`-Builtins und in C++ geschriebenen `macro`s, sodass Torque-Code handgeschriebene CSA-Funktionalität verwenden kann und umgekehrt.

Torque bietet Sprachkonstrukte, um semantisch reichhaltige Details der V8-Implementierung auf hoher Ebene darzustellen, und der Torque-Compiler konvertiert diese Details mithilfe des `CodeStubAssembler` in effizienten Assemblercode. Sowohl die Sprachstruktur von Torque als auch die Fehlerprüfung des Torque-Compilers gewährleisten Korrektheit auf eine Weise, die früher mit der direkten Verwendung des `CodeStubAssembler` aufwendig und fehleranfällig war. Traditionell erforderte das Schreiben von optimalem Code mit dem `CodeStubAssembler`, dass V8-Ingenieure eine Menge spezialisierten Wissens im Kopf trugen – vieles davon war nie formell in schriftlicher Dokumentation festgehalten –, um subtile Fallstricke in ihrer Implementierung zu vermeiden. Ohne dieses Wissen war die Lernkurve für das Schreiben effizienter Builtins steil. Selbst mit dem notwendigen Wissen führten oft nicht offensichtliche und nicht kontrollierte Fallstricke zu Korrektheits- oder [Sicherheits](https://bugs.chromium.org/p/chromium/issues/detail?id=775888)-[Bugs](https://bugs.chromium.org/p/chromium/issues/detail?id=785804). Mit Torque können viele dieser Fallstricke vermieden und automatisch vom Torque-Compiler erkannt werden.

## Einstieg

Die meisten in Torque geschriebenen Quelltexte werden unter [dem Verzeichnis `src/builtins`](https://github.com/v8/v8/tree/master/src/builtins) im V8-Repository mit der Dateierweiterung `.tq` gespeichert. Torque-Definitionen von V8's heap-allokierten Klassen befinden sich zusammen mit ihren C++-Definitionen in `.tq`-Dateien mit demselben Namen wie die entsprechenden C++-Dateien in `src/objects`. Der eigentliche Torque-Compiler ist unter [`src/torque`](https://github.com/v8/v8/tree/master/src/torque) zu finden. Tests für die Torque-Funktionalität werden unter [`test/torque`](https://github.com/v8/v8/tree/master/test/torque), [`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque) und [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque) eingecheckt.

Um Ihnen einen Eindruck von der Sprache zu geben, schreiben wir ein V8-Builtin, das "Hello World!" ausgibt. Dazu fügen wir einen Torque-`macro` in einen Testfall ein und rufen diesen aus dem `cctest`-Testframework auf.

Beginnen Sie damit, die Datei `test/torque/test-torque.tq` zu öffnen, und fügen Sie den folgenden Code am Ende hinzu (aber vor der letzten schließenden `}`):

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hallo Welt!');
}
```

Öffnen Sie anschließend `test/cctest/torque/test-torque.cc` und fügen Sie den folgenden Testfall hinzu, der den neuen Torque-Code verwendet, um eine Code-Stub zu erstellen:

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

Bauen Sie dann [die ausführbare Datei `cctest`](/docs/test) und führen Sie schließlich den `cctest`-Test aus, um „Hello World“ auszugeben:

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hallo Welt!
```

## Wie Torque Code generiert

Der Torque-Compiler erstellt keinen Maschinencode direkt, sondern erzeugt stattdessen C++-Code, der die vorhandene `CodeStubAssembler`-Schnittstelle von V8 aufruft. Der `CodeStubAssembler` verwendet das Backend des [TurboFan-Compilers](https://v8.dev/docs/turbofan), um effizienten Code zu generieren. Die Torque-Kompilierung erfordert daher mehrere Schritte:

1. Der `gn`-Build führt zuerst den Torque-Compiler aus. Dabei werden alle `*.tq`-Dateien verarbeitet. Jede Torque-Datei `path/to/file.tq` führt zur Generierung der folgenden Dateien:
    - `path/to/file-tq-csa.cc` und `path/to/file-tq-csa.h`, die generierte CSA-Makros enthalten.
    - `path/to/file-tq.inc`, das in eine entsprechende Header-Datei `path/to/file.h` eingefügt wird und Klassendefinitionen enthält.
    - `path/to/file-tq-inl.inc`, das in die entsprechende Inline-Header-Datei `path/to/file-inl.h` eingefügt wird und C++-Zugriffsfunktionen für Klassendefinitionen enthält.
    - `path/to/file-tq.cc`, das generierte Heap-Verifizierer, Druckfunktionen usw. enthält.

    Der Torque-Compiler generiert auch verschiedene andere bekannte `.h`-Dateien, die im V8-Build verwendet werden sollen.
1. Der `gn`-Build kompiliert dann die generierten `-csa.cc`-Dateien aus Schritt 1 in die ausführbare Datei `mksnapshot`.
1. Wenn `mksnapshot` ausgeführt wird, werden alle von V8 bereitgestellten Builtins generiert und in die Snapshot-Datei gepackt, einschließlich solcher, die in Torque definiert sind, und anderer Builtins, die Torque-definierte Funktionalität verwenden.
1. Der Rest von V8 wird erstellt. Alle in Torque erstellten Builtins sind über die Snapshot-Datei, die in V8 eingebunden ist, zugänglich. Sie können wie jede andere Builtin-Funktion aufgerufen werden. Darüber hinaus enthält die ausführbare Datei `d8` oder `chrome` auch die generierten Kompilationseinheiten, die direkt mit Klassendefinitionen verknüpft sind.

Graphisch sieht der Build-Prozess wie folgt aus:

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Torque-Tools

Grundlegende Tools und Unterstützung für die Entwicklungsumgebung sind für Torque verfügbar.

- Es gibt ein [Visual Studio Code Plugin](https://github.com/v8/vscode-torque) für Torque, welches einen benutzerdefinierten Sprachserver verwendet, um Funktionen wie "Gehe zu Definition" bereitzustellen.
- Es gibt auch ein Formatierungstool, das nach Änderungen an `.tq`-Dateien verwendet werden sollte: `tools/torque/format-torque.py -i <filename>`

## Fehlerbehebung beim Build-Prozess, der Torque einbezieht

Warum ist das wichtig? Es ist entscheidend zu verstehen, wie Torque-Dateien in Maschinencode umgewandelt werden, da in den verschiedenen Phasen der Übersetzung von Torque in die binären Bits, die im Snapshot eingebettet sind, unterschiedliche Probleme (und Fehler) auftreten können:

- Wenn Sie einen Syntax- oder semantischen Fehler in Torque-Code (d.h. einer `.tq`-Datei) haben, schlägt der Torque-Compiler fehl. Der V8-Build bricht in diesem Stadium ab, und Sie sehen keine weiteren Fehler, die möglicherweise durch spätere Teile des Builds aufgedeckt werden.
- Sobald Ihr Torque-Code syntaktisch korrekt ist und die (mehr oder weniger) strengen semantischen Prüfungen des Torque-Compilers besteht, kann der Build von `mksnapshot` dennoch fehlschlagen. Dies passiert häufig aufgrund von Inkonsistenzen in externen Definitionen, die in `.tq`-Dateien bereitgestellt werden. Definitionen, die mit dem Schlüsselwort `extern` im Torque-Code gekennzeichnet sind, signalisieren dem Torque-Compiler, dass die Definition der erforderlichen Funktionalität in C++ gefunden wird. Derzeit ist die Verknüpfung zwischen `extern`-Definitionen aus `.tq`-Dateien und dem C++-Code, auf den diese `extern`-Definitionen verweisen, locker, und es gibt keine Überprüfung dieser Verknüpfung zur Torque-Compile-Zeit. Wenn `extern`-Definitionen nicht übereinstimmen (oder in subtilen Fällen die Funktionalität überdecken), auf die sie im `code-stub-assembler.h`-Header oder anderen V8-Headers zugreifen, schlägt der C++-Build von `mksnapshot` fehl.
- Auch wenn `mksnapshot` erfolgreich kompiliert wird, kann es während der Ausführung fehlschlagen. Dies könnte passieren, weil Turbofan nicht in der Lage ist, den generierten CSA-Code zu kompilieren, beispielsweise weil eine Torque-`static_assert`-Anweisung nicht durch Turbofan überprüft werden kann. Außerdem könnten Torque-Builtins, die während der Snapshot-Erstellung ausgeführt werden, einen Fehler enthalten. Zum Beispiel wird `Array.prototype.splice`, ein in Torque erstelltes Builtin, als Teil des JavaScript-Snapshot-Initialisierungsprozesses aufgerufen, um die Standard-JavaScript-Umgebung einzurichten. Wenn es einen Fehler in der Implementierung gibt, stürzt `mksnapshot` während der Ausführung ab. Wenn `mksnapshot` abstürzt, ist es manchmal nützlich, `mksnapshot` mit der Option `--gdb-jit-full` aufzurufen, die zusätzliche Debug-Informationen generiert, die nützlichen Kontext bieten, z.B. Namen für Torque-generierte Builtins in `gdb`-Stack-Analysen.
- Natürlich könnte Torque-erstellter Code selbst dann fehlerhaft sein oder abstürzen, wenn er `mksnapshot` übersteht. Das Hinzufügen von Testfällen zu `torque-test.tq` und `torque-test.cc` ist eine gute Möglichkeit sicherzustellen, dass Ihr Torque-Code tatsächlich das tut, was Sie erwarten. Wenn Ihr Torque-Code schließlich in `d8` oder `chrome` abstürzt, ist die Option `--gdb-jit-full` erneut sehr nützlich.

## `constexpr`: Kompilierungszeit vs. Laufzeit

Das Verständnis des Torque-Build-Prozesses ist auch wichtig, um ein Kernelement der Torque-Sprache zu verstehen: `constexpr`.

Torque ermöglicht die Auswertung von Ausdrücken im Torque-Code zur Laufzeit (d.h. wenn V8-Builtins als Teil der JavaScript-Ausführung ausgeführt werden). Es erlaubt jedoch auch, Ausdrücke zur Kompilierungszeit auszuführen (d.h. als Teil des Torque-Build-Prozesses und bevor die V8-Bibliothek und die `d8`-ausführbare Datei überhaupt erstellt wurden).

Torque verwendet das Schlüsselwort `constexpr`, um anzugeben, dass ein Ausdruck zur Build-Zeit ausgewertet werden muss. Die Verwendung ist in gewisser Weise analog zu [C++'s `constexpr`](https://en.cppreference.com/w/cpp/language/constexpr): Neben der Übernahme des Schlüsselworts `constexpr` und einiger seiner Syntaxelemente aus C++ verwendet Torque `constexpr`, um zwischen der Auswertung zur Compile-Zeit und zur Laufzeit zu unterscheiden.

Es gibt jedoch einige subtile Unterschiede in den Semantiken von `constexpr` in Torque. In C++ können `constexpr`-Ausdrücke vollständig vom C++-Compiler ausgewertet werden. In Torque können `constexpr`-Ausdrücke nicht vollständig vom Torque-Compiler ausgewertet werden, sondern werden stattdessen auf C++-Typen, Variablen und Ausdrücke abgebildet, die vollständig ausgewertet werden können (und müssen), wenn `mksnapshot` läuft. Aus der Perspektive des Torque-Autors generieren `constexpr`-Ausdrücke keinen Code, der zur Laufzeit ausgeführt wird; in diesem Sinne handelt es sich also um Compile-Zeit, auch wenn sie technisch gesehen durch externen C++-Code ausgewertet werden, den `mksnapshot` ausführt. Somit bedeutet `constexpr` in Torque im Wesentlichen „mksnapshot-Zeit“, nicht „Compile-Zeit“.

In Kombination mit Generics ist `constexpr` ein leistungsstarkes Werkzeug in Torque, das zur automatischen Erzeugung mehrerer extrem effizienter spezialisierter Builtins verwendet werden kann, die sich voneinander in einer kleinen Anzahl spezifischer Details unterscheiden, die V8-Entwickler im Voraus vorhersagen können.

## Dateien

Torque-Code wird in einzelne Quelldateien gepackt. Jede Quelldatei besteht aus einer Reihe von Deklarationen, die optional in einer Namensraumdeklaration umschlossen sein können, um die Namensräume der Deklarationen zu trennen. Die folgende Beschreibung der Grammatik ist wahrscheinlich veraltet. Die wahrheitsgemäße Quelle ist [die Grammatikdefinition im Torque-Compiler](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar), die mit kontextfreien Grammatikregeln geschrieben ist.

Eine Torque-Datei ist eine Sequenz von Deklarationen. Die möglichen Deklarationen sind [in `torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration) aufgeführt.

## Namensräume

Torque-Namensräume erlauben es, Deklarationen in unabhängigen Namensräumen zu organisieren. Sie ähneln den C++-Namensräumen. Sie ermöglichen die Erstellung von Deklarationen, die in anderen Namensräumen nicht automatisch sichtbar sind. Sie können verschachtelt werden, und Deklarationen innerhalb eines verschachtelten Namensraums können auf die Deklarationen im übergeordneten Namensraum zugreifen, ohne sie zu qualifizieren. Deklarationen, die nicht explizit in einer Namensraumdeklaration enthalten sind, werden in einen gemeinsamen globalen Standardnamensraum gesetzt, der für alle Namensräume sichtbar ist. Namensräume können wieder geöffnet werden, wodurch sie über mehrere Dateien hinweg definiert werden können.

Zum Beispiel:

```torque
macro IsJSObject(o: Object): bool { … }  // Im Standardnamensraum

namespace array {
  macro IsJSArray(o: Object): bool { … }  // Im array-Namensraum
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK, globaler Namensraum hier sichtbar
    IsJSArray(o);  // FEHLER, nicht sichtbar in diesem Namensraum
    array::IsJSArray(o);  // OK, explizite Namensraumqualifizierung
  }
  // …
};

namespace array {
  // OK, Namensraum wurde wieder geöffnet.
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## Deklarationen

### Typen

Torque ist stark typisiert. Sein Typsystem ist die Grundlage für viele der Sicherheits- und Korrektheitsgarantien, die es bietet.

Für viele grundlegende Typen weiß Torque tatsächlich nicht sehr viel über sie. Stattdessen sind viele Typen nur lose mit `CodeStubAssembler` und C++-Typen durch explizite Typabbildungen gekoppelt und verlassen sich auf den C++-Compiler, um die Strenge dieser Abbildung durchzusetzen. Solche Typen werden als abstrakte Typen realisiert.

#### Abstrakte Typen

Abstracte Typen von Torque werden direkt auf C++-Kompilierungszeit- und CodeStubAssembler-Laufzeitwerte abgebildet. Ihre Deklarationen spezifizieren einen Namen und eine Beziehung zu C++-Typen:

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName` spezifiziert den Namen des abstrakten Typs, und `ExtendsDeclaration` gibt optional den Typ an, von dem der deklarierte Typ abgeleitet wird. `GeneratesDeclaration` gibt optional ein Zeichenfolgenliteral an, das dem C++-`TNode`-Typ entspricht, der im `CodeStubAssembler`-Code verwendet wird, um einen Laufzeitwert seines Typs zu enthalten. `ConstexprDeclaration` ist ein Zeichenfolgenliteral, das den C++-Typ angibt, der der `constexpr`-Version des Torque-Typs für die Bewertung zur Build-Zeit (`mksnapshot`-Zeit) entspricht.

Hier ist ein Beispiel aus `base.tq` für Torques 31- und 32-Bit-Ganzzahltypen mit Vorzeichen:

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### Unionstypen

Unionstypen drücken aus, dass ein Wert einem von mehreren möglichen Typen angehört. Wir erlauben Unionstypen nur für getaggte Werte, da sie zur Laufzeit anhand des Kartenzeigers unterschieden werden können. Beispielsweise sind JavaScript-Zahlen entweder Smi-Werte oder zugewiesene `HeapNumber`-Objekte.

```torque
type Number = Smi | HeapNumber;
```

Vereinheitlichungstypen erfüllen die folgenden Gleichungen:

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A`, wenn `B` ein Subtyp von `A` ist

Es ist nur erlaubt, Vereinigungstypen aus markierten Typen zu bilden, weil nicht markierte Typen zur Laufzeit nicht unterschieden werden können.

Beim Zuordnen von Vereinigungstypen zum CSA wird der spezifischste gemeinsame Obertyp aller Typen des Vereinigungstyps ausgewählt, mit Ausnahme von `Number` und `Numeric`, die den entsprechenden CSA-Vereinigungstypen zugeordnet werden.

#### Klassentypen

Klassentypen ermöglichen es, strukturierte Objekte auf dem V8 GC-Heap aus Torque-Code zu definieren, zu erstellen und zu manipulieren. Jeder Torque-Klassentyp muss einer Unterklasse von HeapObject im C++-Code entsprechen. Um den Aufwand für die Pflege von Boilerplate-Code zwischen V8s C++- und Torque-Implementierung zu minimieren, werden die Torque-Klassendefinitionen verwendet, um den erforderlichen C++-Objektzugriffscode zu generieren, wann immer dies möglich und angemessen ist, um den manuellen Synchronisierungsaufwand zu verringern.

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

Ein Beispiel für eine Klasse:

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` bedeutet, dass diese Klasse in C++ definiert ist und nicht nur in Torque.

Die Felddeklarationen in Klassen generieren implizit Getter und Setter für Felder, die von CodeStubAssembler verwendet werden können, z.B.:

```cpp
// In TorqueGeneratedExportedMacrosAssembler:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

Wie oben beschrieben, generiert der in Torque definierte Feldcode C++-Code, der den Bedarf an dupliziertem Boilerplate-Zugriffscode und Heap-Besucher-Code reduziert. Die handgeschriebene Definition von JSProxy muss von einer generierten Klassenschablone erben, wie folgt:

```cpp
// In js-proxy.h:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Was auch immer die Klasse zusätzlich zu Torque generiertem Code benötigt...

  // Am Ende, da es mit öffentlich/privat interagiert:
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// In js-proxy-inl.h:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

Die generierte Klasse stellt Cast-Funktionen, Feldzugriffsfunktionen und Feldoffset-Konstanten bereit (z.B. `kTargetOffset` und `kHandlerOffset` in diesem Fall), die die Byte-Offset jedes Feldes vom Anfang der Klasse darstellen.

##### Klasse-Typ-Anmerkungen

Einige Klassen können das gezeigte Vererbungsmuster nicht verwenden. In diesen Fällen kann die Klasse `@doNotGenerateCppClass` spezifizieren, direkt von ihrem Supertyp erben und ein Torque-generiertes Makro für die Feldoffset-Konstanten verwenden. Solche Klassen müssen ihre eigenen Zugriffsfunktionen und Cast-Funktionen implementieren. Die Verwendung dieses Makros sieht wie folgt aus:

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // Rest der Klasse weggelassen...
}
```

`@generateBodyDescriptor` bewirkt, dass Torque eine Klasse `BodyDescriptor` innerhalb der generierten Klasse ausgibt, die darstellt, wie der Garbage Collector das Objekt besuchen sollte. Andernfalls muss der C++-Code entweder seine eigene Objektbesuchsfunktion definieren oder eines der bestehenden Muster verwenden (zum Beispiel, wenn er von `Struct` erbt und die Klasse in `STRUCT_LIST` aufnimmt, wird erwartet, dass die Klasse nur markierte Werte enthält).

Wenn die Anmerkung `@generatePrint` hinzugefügt wird, implementiert der Generator eine C++-Funktion, die die Feldwerte gemäß dem von Torque definierten Layout ausgibt. Mithilfe des JSProxy-Beispiels sieht die Signatur wie folgt aus: `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`, die von `JSProxy` geerbt werden kann.

Der Torque-Compiler erzeugt auch Verifizierungscode für alle `extern` Klassen, es sei denn, die Klasse verzichtet darauf mit der `@noVerifier` Annotation. Beispiel: Die JSProxy-Klassendefinition oben generiert eine C++-Methode `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)`, die überprüft, ob ihre Felder gemäß der Typdefinition von Torque gültig sind. Außerdem wird eine entsprechende Funktion auf der generierten Klasse erstellt, `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`, die die statische Funktion von `TorqueGeneratedClassVerifiers` aufruft. Wenn Sie zusätzliche Verifikationen für eine Klasse hinzufügen möchten (etwa einen Bereich akzeptabler Werte für eine Zahl oder eine Anforderung, dass das Feld `foo` wahr ist, wenn das Feld `bar` nicht null ist, usw.), dann fügen Sie ein `DECL_VERIFIER(JSProxy)` zur C++-Klasse hinzu (was das geerbte `JSProxyVerify` verbirgt) und implementieren Sie es in `src/objects-debug.cc`. Der erste Schritt eines solchen benutzerdefinierten Verifikators sollte darin bestehen, den generierten Verifikator aufzurufen, wie `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`. (Um diese Verifikatoren vor und nach jeder GC auszuführen, bauen Sie mit `v8_enable_verify_heap = true` und führen Sie aus mit `--verify-heap`.)

`@abstract` zeigt an, dass die Klasse selbst nicht instanziiert wird und keinen eigenen Instanztyp hat: Die Instanztypen, die logisch zur Klasse gehören, sind die Instanztypen der abgeleiteten Klassen.

Die `@export` Annotation sorgt dafür, dass der Torque-Compiler eine konkrete C++-Klasse erzeugt (wie `JSProxy` im obigen Beispiel). Dies ist offensichtlich nur nützlich, wenn Sie keine zusätzlichen C++-Funktionen über das hinaus hinzufügen möchten, was der Torque-generierter Code bietet. Kann nicht in Verbindung mit `extern` verwendet werden. Für eine Klasse, die ausschließlich innerhalb von Torque definiert und verwendet wird, ist es am geeignetsten, weder `extern` noch `@export` zu verwenden.

`@hasSameInstanceTypeAsParent` zeigt Klassen an, die die gleichen Instanztypen wie ihre Elternklasse haben, aber einige Felder umbenennen oder möglicherweise eine andere Karte haben. In solchen Fällen ist die Elternklasse nicht abstrakt.

Die Annotationen `@highestInstanceTypeWithinParentClassRange`, `@lowestInstanceTypeWithinParentClassRange`, `@reserveBitsInInstanceType` und `@apiExposedInstanceTypeValue` beeinflussen alle die Erstellung von Instanztypen. Im Allgemeinen können Sie diese ignorieren und sind trotzdem in Ordnung. Torque ist verantwortlich für die Zuweisung eines eindeutigen Wertes im Enum `v8::internal::InstanceType` für jede Klasse, damit V8 zur Laufzeit den Typ jedes Objekts im JS-Heap bestimmen kann. Torque's Zuweisung von Instanztypen sollte in den meisten Fällen ausreichen, aber es gibt einige Fälle, in denen wir einen stabilen Instanztyp für eine bestimmte Klasse über Builds hinweg, am Anfang oder Ende des Bereichs der Instanztypen ihres Superklassenbereichs haben möchten, oder einen reservierten Wertebereich außerhalb von Torque definieren möchten.

##### Klassenfelder

Zusätzlich zu einfachen Wertefeldern, wie im obigen Beispiel, können Klassenfelder indizierte Daten enthalten. Hier ist ein Beispiel:

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

Dies bedeutet, dass Instanzen von `CoverageInfo` unterschiedliche Größen basierend auf den Daten in `slot_count` haben.

Im Gegensatz zu C++ fügt Torque nicht implizit Polsterungen zwischen Feldern hinzu; stattdessen schlägt Torque fehl und gibt einen Fehler aus, wenn Felder nicht richtig ausgerichtet sind. Torque fordert auch, dass starke Felder, schwache Felder und skalare Felder zusammen mit anderen Feldern derselben Kategorie in der Feldreihenfolge liegen.

`const` bedeutet, dass ein Feld zur Laufzeit nicht verändert werden kann (oder zumindest nicht einfach; Torque schlägt fehl, wenn Sie versuchen, es festzulegen). Dies ist eine gute Idee für Längenfelder, die nur mit großer Sorgfalt zurückgesetzt werden sollten, da sie die Freigabe eines freigegebenen Speicherplatzes erfordern und Datenrennen mit einem Markierungs-Thread verursachen könnten.
Tatsächlich verlangt Torque, dass Längenfelder, die für indizierte Daten verwendet werden, `const` sind.

`weak` am Anfang einer Felddeklaration bedeutet, dass das Feld eine benutzerdefinierte schwache Referenz ist, im Gegensatz zu dem `MaybeObject`-Markierungssystem für schwache Felder.
Außerdem wirkt sich `weak` auf die Generierung von Konstanten wie `kEndOfStrongFieldsOffset` und `kStartOfWeakFieldsOffset` aus, ein legacy Feature, das in einigen benutzerdefinierten `BodyDescriptor`s verwendet wird und derzeit immer noch erfordert, dass Felder, die als `weak` markiert sind, zusammen gruppiert werden. Wir hoffen, dieses Schlüsselwort zu entfernen, sobald Torque vollständig in der Lage ist, alle `BodyDescriptor`s zu generieren.

Wenn das Objekt, das in einem Feld gespeichert ist, eine `MaybeObject`-Art schwache Referenz sein kann (mit dem gesetzten zweiten Bit), sollte `Weak<T>` im Typ verwendet werden und das Schlüsselwort `weak` sollte **nicht** verwendet werden. Es gibt noch einige Ausnahmen zu dieser Regel, wie dieses Feld von `Map`, das einige starke und einige schwache Typen enthalten kann und ebenfalls als `weak` markiert ist, um in den schwachen Abschnitt aufgenommen zu werden:

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` und `@ifnot` kennzeichnen Felder, die in einigen Build-Konfigurationen enthalten sein sollten, in anderen jedoch nicht. Sie akzeptieren Werte aus der Liste in `BuildFlags`, in `src/torque/torque-parser.cc`.

##### Klassen, die vollständig außerhalb von Torque definiert sind

Einige Klassen sind nicht in Torque definiert, aber Torque muss über jede Klasse Bescheid wissen, da es für die Zuweisung von Instanztypen verantwortlich ist. In diesem Fall können Klassen ohne Körper deklariert werden, und Torque erzeugt nichts für sie außer dem Instanztyp. Beispiel:

```torque
extern class OrderedHashMap extends HashTable;
```

#### Shapes

Die Definition einer `shape` sieht genauso aus wie die Definition einer `class`, außer dass das Schlüsselwort `shape` statt `class` verwendet wird. Eine `shape` ist ein Untertyp von `JSObject`, der eine Punkt-in-Zeit-Anordnung von In-Objekt-Eigenschaften (in Spezifikations-Sprache sind dies "Daten-Eigenschaften" anstelle von "internen Slots") darstellt. Eine `shape` hat keinen eigenen Instanztyp. Ein Objekt mit einer bestimmten Form kann sich jederzeit ändern und diese Form verlieren, da das Objekt möglicherweise in den Wörterbuchmodus wechseln und alle seine Eigenschaften in einen separaten Backing-Store verschieben könnte.

#### Structs

`struct`s sind Sammlungen von Daten, die leicht zusammen weitergegeben werden können. (Völlig unverwandt mit der Klasse namens `Struct`.) Wie Klassen können sie Makros enthalten, die auf den Daten arbeiten. Im Gegensatz zu Klassen unterstützen sie auch Generika. Die Syntax sieht einer Klasse ähnlich aus:

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Struct-Anmerkungen

Jede als `@export` markierte Struct wird mit einem vorhersagbaren Namen in die generierte Datei `gen/torque-generated/csa-types.h` aufgenommen. Der Name wird mit `TorqueStruct` versehen, sodass `PromiseResolvingFunctions` zu `TorqueStructPromiseResolvingFunctions` wird.

Struct-Felder können als `const` markiert werden, was bedeutet, dass sie nicht überschrieben werden sollten. Das gesamte Struct kann jedoch weiterhin überschrieben werden.

##### Structs als Klassenfelder

Ein Struct kann als Typ eines Klassenfeldes verwendet werden. In diesem Fall stellt es gepackte, geordnete Daten innerhalb der Klasse dar (ansonsten haben Structs keine Ausrichtungsanforderungen). Dies ist besonders nützlich für indizierte Felder in Klassen. Ein Beispiel: `DescriptorArray` enthält ein Array von drei-Werte-Structs:

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### Referenzen und Slices

`Reference<T>` und `Slice<T>` sind spezielle Structs, die Zeiger auf Daten darstellen, die in Heap-Objekten gehalten werden. Beide enthalten ein Objekt und einen Offset; `Slice<T>` enthält auch eine Länge. Anstatt diese Structs direkt zu konstruieren, können Sie eine spezielle Syntax verwenden: `&o.x` erstellt eine `Reference` auf das Feld `x` innerhalb des Objekts `o` oder einen `Slice` auf die Daten, wenn `x` ein indiziertes Feld ist. Für Referenzen und Slices gibt es konstante und veränderliche Versionen. Für Referenzen werden diese Typen als `&T` und `const &T` für veränderliche bzw. konstante Referenzen geschrieben. Die Veränderlichkeit bezieht sich auf die Daten, auf die sie zeigen, und gilt möglicherweise nicht global, das heißt, Sie können konstante Referenzen auf veränderliche Daten erstellen. Für Slices gibt es keine spezielle Syntax für die Typen, und die beiden Versionen werden als `ConstSlice<T>` und `MutableSlice<T>` geschrieben. Referenzen können mit `*` oder `->` dereferenziert werden, analog zu C++.

Referenzen und Slices auf nicht markierte Daten können auch auf Daten außerhalb des Heaps zeigen.

#### Bitfield-Structs

Ein `bitfield struct` stellt eine Sammlung von numerischen Daten dar, die in einen einzigen numerischen Wert verpackt sind. Seine Syntax ähnelt der eines normalen `struct`, mit der Ergänzung der Anzahl der Bits für jedes Feld.

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

Wenn ein Bitfield-Struct (oder andere numerische Daten) in einem Smi gespeichert wird, kann es mit dem Typ `SmiTagged<T>` dargestellt werden.

#### Funktionzeigertypen

Funktionzeiger können nur auf in Torque definierte Builtins zeigen, da dies die standardmäßige ABI garantiert. Sie sind besonders nützlich, um die Größe des Binärcodes zu reduzieren.

Während Funktionzeigertypen anonym sind (wie in C), können sie einem Typalias zugeordnet werden (ähnlich einem `typedef` in C).

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### Spezielle Typen

Es gibt zwei spezielle Typen, die durch die Schlüsselwörter `void` und `never` angegeben werden. `void` wird als Rückgabetyp für Aufrufbare verwendet, die keinen Wert zurückgeben, und `never` wird als Rückgabetyp für Aufrufbare verwendet, die tatsächlich nie zurückkehren (d. h. nur über Ausnahme-Pfade beendet werden).

#### Transiente Typen

In V8 können sich Heap-Objekte zur Laufzeit verändern. Um Objektlayouts auszudrücken, die Änderungen unterliegen oder andere vorübergehende Annahmen im Typsystem betreffen, unterstützt Torque das Konzept eines „transienten Typs“. Beim Deklarieren eines abstrakten Typs markiert das Hinzufügen des Schlüsselworts `transient` ihn als transienten Typ.

```torque
// Ein HeapObject mit einer JSArray-Karte und entweder schnellen „packed“-Elementen
// oder schnellen „holey“-Elementen, wenn der globale NoElementsProtector nicht ungültig ist.
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

Im Fall von `FastJSArray` wird der transiente Typ beispielsweise ungültig, wenn das Array zu Dictionary-Elementen wechselt oder wenn der globale `NoElementsProtector` ungültig wird. Um dies in Torque auszudrücken, annotieren Sie alle Aufrufbaren, die dies potenziell tun könnten, als `transitioning`. Beispielsweise kann das Aufrufen einer JavaScript-Funktion beliebigen JavaScript-Code ausführen, daher ist sie `transitioning`.

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

Die Art und Weise, wie dies im Typensystem überwacht wird, besteht darin, dass es unzulässig ist, auf einen Wert eines transienten Typs über eine Übergangsoperation zuzugreifen.

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) ansonsten Bailout;
Call(f, Undefined);
return fastArray; // Typfehler: fastArray ist hier ungültig.
```

#### Enums

Aufzählungen bieten eine Möglichkeit, eine Reihe von Konstanten zu definieren und sie unter einem Namen wie den Enum-Klassen in C++ zu gruppieren. Eine Deklaration wird mit dem Schlüsselwort `enum` eingeführt und folgt der folgenden syntaktischen Struktur:

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

Ein einfaches Beispiel sieht so aus:

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

Diese Deklaration definiert einen neuen Typ `LanguageMode`, wobei die `extends`-Klausel den zugrunde liegenden Typ angibt, also den Laufzeittyp, der verwendet wird, um einen Wert der Aufzählung darzustellen. In diesem Beispiel handelt es sich um `TNode<Smi>`, da dies der Typ ist, den `Smi` „generiert“. Ein `constexpr LanguageMode` wird in den generierten CSA-Dateien in `LanguageMode` konvertiert, da keine `constexpr`-Klausel in der Aufzählung angegeben ist, um den Standardnamen zu ersetzen.
Wenn die `extends`-Klausel weggelassen wird, generiert Torque nur die `constexpr`-Version des Typs. Das Schlüsselwort `extern` weist darauf hin, dass es eine C++-Definition für diese Aufzählung gibt. Derzeit werden nur `extern`-Enums unterstützt.

Torque generiert einen eindeutigen Typ und eine Konstante für jeden Eintrag der Aufzählung. Diese sind innerhalb eines Namespaces definiert, der dem Namen der Aufzählung entspricht. Erforderliche Spezialisierungen von `FromConstexpr<>` werden erstellt, um von den `constexpr`-Typen der Einträge zum Aufzählungstyp zu konvertieren. Der in den C++-Dateien generierte Wert für einen Eintrag lautet `<enum-constexpr>::<entry-name>`, wobei `<enum-constexpr>` der für die Aufzählung generierte `constexpr`-Name ist. Im obigen Beispiel sind dies `LanguageMode::kStrict` und `LanguageMode::kSloppy`.

Torques Aufzählungen funktionieren sehr gut mit der `typeswitch`-Konstruktion, da die Werte mit eindeutigen Typen definiert sind:

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

Wenn die C++-Definition der Aufzählung mehr Werte enthält als diejenigen, die in `.tq`-Dateien verwendet werden, muss Torque dies wissen. Dies erfolgt, indem die Aufzählung durch das Anhängen von `...` nach dem letzten Eintrag als „offen“ deklariert wird. Betrachten Sie zum Beispiel `ExtractFixedArrayFlag`, bei dem nur einige der Optionen innerhalb von Torque verfügbar/verwendet werden:

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### Callables

Callables sind konzeptionell wie Funktionen in JavaScript oder C++, aber sie haben zusätzliche Semantiken, die es ihnen ermöglichen, auf nützliche Weise mit CSA-Code und der V8-Laufzeitumgebung zu interagieren. Torque bietet verschiedene Arten von Callables: `macro`s, `builtin`s, `runtime`s und `intrinsic`s.

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` Callables

Macros sind ein Callable, das einem Abschnitt von generiertem CSA-produzierendem C++ entspricht. `macro`s können entweder vollständig in Torque definiert werden, in welchem Fall der CSA-Code von Torque generiert wird, oder mit `extern` markiert werden, in welchem Fall die Implementierung als handgeschriebener CSA-Code in einer CodeStubAssembler-Klasse bereitgestellt werden muss. Konzeptionell ist es nützlich, sich `macro`s als Teile von inline-fähigem CSA-Code vorzustellen, der an Aufrufstellen eingebettet wird.

`macro`-Deklarationen in Torque nehmen folgende Form an:

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

Jedes nicht-`extern`-Torque-`macro` verwendet den `StatementBlock`-Körper des `macro`, um eine CSA-erzeugende Funktion in der generierten `Assembler`-Klasse des entsprechenden Namespaces zu erstellen. Dieser Code sieht aus wie anderer Code, den man in `code-stub-assembler.cc` finden könnte, jedoch aufgrund der maschinellen Generierung etwas weniger lesbar. `macro`s, die mit `extern` markiert sind, haben keinen in Torque geschriebenen Körper und stellen lediglich eine Schnittstelle für handgeschriebenen C++-CSA-Code bereit, damit dieser von Torque aus verwendet werden kann.

`macro`-Definitionen spezifizieren implizite und explizite Parameter, einen optionalen Rückgabewert und optionale Bezeichner. Parameter und Rückgabewerte werden später ausführlicher behandelt, aber fürs Erste genügt es zu wissen, dass sie ähnlich wie TypeScript-Parameter funktionieren, wie in TypeScript-Dokumentation im Abschnitt zu Funktionstypen [hier](https://www.typescriptlang.org/docs/handbook/functions.html) beschrieben.
Labels sind ein Mechanismus für einen außergewöhnlichen Austritt aus einem `macro`. Sie werden 1:1 auf CSA-Labels abgebildet und als Parameter vom Typ `CodeStubAssemblerLabels*` zur C++-Methode hinzugefügt, die für das `macro` generiert wird. Ihre genauen Semantiken werden unten besprochen, aber für die Deklaration eines `macro` wird die durch Kommas getrennte Liste der Labels eines `macro` optional mit dem Schlüsselwort `labels` bereitgestellt und nach der Parameterliste und dem Rückgabewert des `macro` positioniert.

Hier ist ein Beispiel aus `base.tq` für externe und in Torque definierte `macro`s:

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin` Callables

`builtin`s sind ähnlich wie `macro`s, da sie entweder vollständig in Torque definiert oder als `extern` gekennzeichnet sein können. Im Torque-Basierenden-Builtin-Fall wird der Body für das Builtin verwendet, um ein V8-Builtin zu generieren, das wie jedes andere V8-Builtin aufgerufen werden kann, einschließlich der automatischen Hinzufügung der relevanten Informationen in `builtin-definitions.h`. Wie `macro`s haben Torque-`builtin`s, die als `extern` markiert sind, keinen Torque-Basis-Body und bieten lediglich eine Schnittstelle zu bestehenden V8-`builtin`s, damit sie von Torque-Code aus verwendet werden können.

`builtin`-Deklarationen in Torque haben die folgende Form:

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Es gibt nur eine Kopie des Codes für ein Torque-Builtin, und das befindet sich im generierten Builtin-Codeobjekt. Im Gegensatz zu `macro`s wird beim Aufruf von Torque-Code bei `builtin`s kein CSA-Code an der Aufrufstelle eingebettet, sondern eine Aufrufoperation für das Builtin generiert.

`builtin`s können keine Labels haben.

Wenn Sie die Implementierung eines `builtin` codieren, können Sie einen [tailcall](https://en.wikipedia.org/wiki/Tail_call) für ein Builtin oder eine Runtime-Funktion erstellen, wenn und nur wenn dies der finale Aufruf im Builtin ist. Der Compiler kann möglicherweise in diesem Fall die Erstellung eines neuen Stack-Rahmens vermeiden. Einfach vor dem Aufruf `tail` hinzufügen, wie in `tail MyBuiltin(foo, bar);`.

#### `runtime` Callables

`runtime`s sind ähnlich wie `builtin`s, da sie eine Schnittstelle zur externen Funktionalität zu Torque bereitstellen können. Jedoch mit dem Unterschied, dass statt in CSA implementiert, die Funktionalität eines `runtime` immer als Standard-Runtime-Callback in V8 implementiert sein muss.

`runtime`-Deklarationen in Torque haben die folgende Form:

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Das mit `extern runtime` angegebene Name <i>IdentifierName</i> entspricht der Laufzeitfunktion, die in <code>Runtime::k<i>IdentifierName</i></code> angegeben ist.

Wie `builtin`s können `runtime`s keine Labels haben.

Sie können auch eine `runtime`-Funktion als Tailcall aufrufen, wenn dies geeignet ist. Einfach das Schlüsselwort `tail` vor dem Aufruf einschließen.

Runtime-Funktionsdeklarationen werden oft in einem Namespace namens `runtime` platziert. Dies grenzt sie von Builtins mit gleichem Namen ab und erleichtert die Erkennung der Runtime-Funktion an der Aufrufstelle. Wir sollten überlegen, dies verpflichtend zu machen.

#### `intrinsic` Callables

`intrinsic`s sind integrierte Torque-Callables, die Zugriff auf interne Funktionalität bieten, die anderweitig nicht in Torque implementiert werden kann. Sie werden in Torque deklariert, aber nicht definiert, da die Implementation vom Torque-Compiler bereitgestellt wird. `intrinsic`-Deklarationen verwenden die folgende Grammatik:

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

Größtenteils sollte „Benutzer“-Torque-Code `intrinsic`s selten direkt verwenden.
Die folgenden sind einige der unterstützten Intrinsics:

```torque
// %RawObjectCast führt ein Downcast von Object zu einem Untertyp von Object durch, ohne
// rigorose Tests, ob das Objekt tatsächlich der Zieltyp ist.
// RawObjectCasts sollten *niemals* (na ja, fast niemals) irgendwo in
// Torque-Code verwendet werden, außer in torque-basierten UnsafeCast-Operatoren, die von einem
// entsprechenden Typassert() vorangestellt werden
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast führt ein Downcast von RawPtr zu einem Untertyp von RawPtr durch, ohne
// rigorose Tests, ob das Objekt tatsächlich der Zieltyp ist.
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast konvertiert einen Compile-Time-Konstantenwert in einen anderen.
// Sowohl Quell- als auch Zieltypen sollten 'constexpr' sein.
// %RawConstexprCast wird in den generierten C++-Code als static_cast übersetzt.
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr konvertiert einen constexpr-Wert in einen nicht-constexpr
// Wert. Derzeit wird die Konvertierung nur in die folgenden nicht-constexpr-Typen
// unterstützt: Smi, Number, String, uintptr, intptr und int32
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate reserviert ein uninitialisiertes Objekt der Größe 'size' aus V8's
// GC-Heap und "reinterpret casts" den resultierenden Objektzeiger auf den
// angegebene Torque-Klasse, die es den Konstruktoren ermöglicht, anschließend
// Standardfeldzugriffsoperatoren zu verwenden, um das Objekt zu initialisieren.
// Diese intrinsische Funktion sollte niemals aus Torque-Code aufgerufen werden. Sie wird
// intern verwendet, wenn der Operator 'new' aufgelöst wird.
intrinsic %Allocate<Class: type>(size: intptr): Class;
```

Wie `builtin`s und `runtime`s können `intrinsic`s keine Labels haben.

### Explizite Parameter

Deklarationen von Torque-definierten Callables, z. B. Torque `macro`s und `builtin`s, haben explizite Parameterlisten. Diese sind eine Liste von Identifier- und Typ-Paaren, die eine Syntax verwenden, die an typisierte TypeScript-Funktionsparameterlisten erinnert, mit der Ausnahme, dass Torque keine optionalen Parameter oder Standardparameter unterstützt. Darüber hinaus können Torque-implementierte `builtin`s optional Restparameter unterstützen, wenn das builtin die interne JavaScript-Aufrufkonvention von V8 verwendet (z. B. markiert mit dem Schlüsselwort `javascript`).

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

Als Beispiel:

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### Implizite Parameter

Torque-Callables können implizite Parameter ähnlich wie [Scalas implizite Parameter](https://docs.scala-lang.org/tour/implicit-parameters.html) spezifizieren:

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

Konkret: Ein `macro` kann implizite Parameter zusätzlich zu expliziten deklarieren:

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

Beim Mapping zu CSA werden implizite Parameter und explizite Parameter gleich behandelt und bilden eine gemeinsame Parameterliste.

Implizite Parameter werden an der Aufrufstelle nicht erwähnt, sondern implizit übergeben: `Foo(4, 5)`. Damit dies funktioniert, muss `Foo(4, 5)` in einem Kontext aufgerufen werden, der einen Wert mit dem Namen `context` bereitstellt. Beispiel:

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

Im Gegensatz zu Scala verbieten wir dies, wenn die Namen der impliziten Parameter nicht identisch sind.

Da die Auflösungsüberlastung zu verwirrendem Verhalten führen kann, stellen wir sicher, dass implizite Parameter die Auflösungsüberlastung überhaupt nicht beeinflussen. Das bedeutet: Wenn Kandidaten eines Überlastsatzes verglichen werden, berücksichtigen wir die verfügbaren impliziten Bindungen an der Aufrufstelle nicht. Erst nachdem wir eine einzige beste Überlastung gefunden haben, prüfen wir, ob implizite Bindungen für die impliziten Parameter verfügbar sind.

Das Platzieren der impliziten Parameter links von den expliziten Parametern unterscheidet sich von Scala, aber passt besser zu der bestehenden Konvention in CSA, den `context`-Parameter zuerst zu haben.

#### `js-implicit`

Für Builtins mit JavaScript-Verknüpfung, die in Torque definiert sind, sollten Sie das Schlüsselwort `js-implicit` anstelle von `implicit` verwenden. Die Argumente sind auf folgende vier Komponenten der Aufrufkonvention begrenzt:

- context: `NativeContext`
- receiver: `JSAny` (`this` in JavaScript)
- target: `JSFunction` (`arguments.callee` in JavaScript)
- newTarget: `JSAny` (`new.target` in JavaScript)

Es müssen nicht alle deklariert werden, sondern nur die, die verwendet werden sollen. Zum Beispiel hier unser Code für `Array.prototype.shift`:

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

Beachten Sie, dass das Argument `context` ein `NativeContext` ist. Dies liegt daran, dass Builtins in V8 den nativen Kontext immer in ihren Closures einbetten. Das Encodieren dieser Konvention in js-implicit ermöglicht es dem Programmierer, einen Vorgang zum Laden des nativen Kontexts aus dem Funktionskontext zu eliminieren.

### Überlastungsauflösung

Torque `macro`s und Operatoren (die einfach Aliase für `macro`s sind) erlauben die Überladung von Argumenttypen. Die Überladungsregeln sind von denen von C++ inspiriert: Eine Überladung wird ausgewählt, wenn sie eindeutig besser als alle Alternativen ist. Das bedeutet, dass sie mindestens in einem Parameter eindeutig besser sein muss und in allen anderen besser oder gleich gut.

Beim Vergleich eines Paars entsprechender Parameter von zwei Überladungen…

- …werden sie als gleich gut betrachtet, wenn:
    - sie gleich sind;
    - beide eine implizite Konvertierung erfordern.
- …eine wird als besser betrachtet, wenn:
    - sie ein striktes Subtyp der anderen ist;
    - sie keine implizite Konvertierung erfordert, während die andere dies tut.

Wenn keine Überladung eindeutig besser als alle Alternativen ist, führt dies zu einem Compilerfehler.

### Deferred blocks

Ein Anweisungsblock kann optional als `deferred` gekennzeichnet werden, was für den Compiler ein Signal ist, dass er seltener betreten wird. Der Compiler kann sich dann entscheiden, diese Blöcke am Ende der Funktion zu platzieren, wodurch die Cache-Örtlichkeit für den nicht-`deferred`-Code verbessert wird. Zum Beispiel wird in diesem Code aus der `Array.prototype.forEach`-Implementierung erwartet, dass der "schnelle" Pfad beibehalten wird und der Ausnahmefall nur selten auftritt:

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

Hier ist ein weiteres Beispiel, bei dem der Fall mit den Wörterbuchelementen als `deferred` gekennzeichnet ist, um die Codegenerierung für die wahrscheinlicheren Fälle zu verbessern (aus der Implementierung von `Array.prototype.join`):

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## Portieren von CSA-Code zu Torque

[Der Patch, der `Array.of` portiert hat](https://chromium-review.googlesource.com/c/v8/v8/+/1296464) dient als minimales Beispiel für das Portieren von CSA-Code zu Torque.
