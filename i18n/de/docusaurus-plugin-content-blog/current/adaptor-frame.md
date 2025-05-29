---
title: 'Schnellere JavaScript-Aufrufe'
author: '[Victor Gomes](https://twitter.com/VictorBFG), der Frame-Zerkleinerer'
avatars:
  - 'victor-gomes'
date: 2021-02-15
tags:
  - internals
description: 'Schnellere JavaScript-Aufrufe durch Entfernen des Argument-Adaptor-Frames'
tweet: '1361337569057865735'
---

JavaScript ermöglicht das Aufrufen einer Funktion mit einer anderen Anzahl von Argumenten als der erwarteten Parameteranzahl, d. h., man kann weniger oder mehr Argumente übergeben als die deklarierten formalen Parameter. Der erste Fall wird als Unteranwendung und der zweite als Überanwendung bezeichnet.

<!--truncate-->
Im Fall der Unteranwendung erhalten die verbleibenden Parameter den Wert undefined zugewiesen. Im Fall der Überanwendung können die verbleibenden Argumente mittels des Rest-Parameters und der `arguments`-Eigenschaft oder einfach als überflüssig betrachtet und ignoriert werden. Viele Web-/Node.js-Frameworks nutzen heutzutage diese JavaScript-Funktionalität, um optionale Parameter zu akzeptieren und eine flexiblere API zu schaffen.

Bis vor kurzem hatte V8 eine spezielle Technik, um mit Größenabweichungen von Argumenten umzugehen: den Argument-Adaptor-Frame. Leider führt die Argumentanpassung zu Leistungseinbußen, ist jedoch in modernen Frontend- und Middleware-Frameworks häufig erforderlich. Es stellte sich heraus, dass wir mit einem cleveren Trick diesen zusätzlichen Frame entfernen, die V8-Codebasis vereinfachen und nahezu den gesamten Overhead eliminieren können.

Wir können die Auswirkungen auf die Leistung durch das Entfernen des Argument-Adaptor-Frames mithilfe eines Mikro-Benchmarks berechnen.

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![Leistungsbewertung nach Entfernung des Argument-Adaptor-Frames, ausgemessen durch einen Mikro-Benchmark.](/_img/v8-release-89/perf.svg)

Die Grafik zeigt, dass es keinen Overhead mehr gibt, wenn der [JIT-lose Modus](https://v8.dev/blog/jitless) (Ignition) mit einer Leistungsverbesserung von 11,2 % verwendet wird. Mit [TurboFan](https://v8.dev/docs/turbofan) erreichen wir bis zu 40 % Geschwindigkeitserhöhung.

Dieser Mikrobenchmark wurde bewusst so gestaltet, dass die Auswirkungen des Argument-Adaptor-Frames maximiert werden. Dennoch haben wir eine deutliche Verbesserung in vielen Benchmarks festgestellt, wie zum Beispiel in unserem internen [JSTests/Array-Benchmark](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json) (7%) und in [Octane2](https://github.com/chromium/octane) (4,6 % bei Richards und 6,1 % bei EarleyBoyer).

## TL;DR: Argumente umkehren

Das Ziel dieses Projekts war die Entfernung des Argument-Adaptor-Frames, der beim Zugriff auf seine Argumente im Stack eine einheitliche Schnittstelle für die aufgerufene Funktion bietet. Um dies zu erreichen, mussten wir die Argumente im Stack umkehren und einen neuen Slot im Frame der aufgerufenen Funktion hinzufügen, der die tatsächliche Anzahl der Argumente enthält. Die folgende Abbildung zeigt ein typisches Frame-Beispiel vor und nach der Änderung.

![Ein typisches JavaScript-Stack-Frame vor und nach der Entfernung des Argument-Adaptor-Frames.](/_img/adaptor-frame/frame-diff.svg)

## Schnellere JavaScript-Aufrufe

Um zu verstehen, was wir getan haben, um Aufrufe schneller zu machen, werfen wir einen Blick darauf, wie V8 einen Funktionsaufruf ausführt und wie der Argument-Adaptor-Frame funktioniert.

Was passiert intern in V8, wenn wir einen Funktionsaufruf in JavaScript ausführen? Nehmen wir an, wir hätten das folgende JavaScript-Skript:

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![Ablauf der Ausführung innerhalb von V8 während eines Funktionsaufrufs.](/_img/adaptor-frame/flow.svg)

## Ignition

V8 ist eine Multi-Tier-VM. Die erste Ebene wird [Ignition](https://v8.dev/docs/ignition) genannt und ist eine Bytecode-Stack-Maschine mit einem Akkumulator-Register. V8 beginnt damit, den Code in [Ignition-Bytecodes](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775) zu kompilieren. Der obige Aufruf wird wie folgt kompiliert:

```
0d              LdaUndefined              ;; Lade undefined in den Akkumulator
26 f9           Star r2                   ;; Speichere es im Register r2
13 01 00        LdaGlobal [1]             ;; Lade globalen Wert, auf den durch const 1 (add42) verwiesen wird
26 fa           Star r1                   ;; Speichere es im Register r1
0c 03           LdaSmi [3]                ;; Lade kleine Ganzzahl 3 in den Akkumulator
26 f8           Star r3                   ;; Speichere es im Register r3
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; Funktionsaufruf
```

Das erste Argument eines Aufrufs wird üblicherweise als Empfänger bezeichnet. Der Empfänger ist das `this`-Objekt innerhalb einer JSFunction, und jeder JavaScript-Funktionsaufruf muss einen haben. Der Bytecode-Handler von `CallNoFeedback` muss das Objekt `r1` mit den Argumenten in der Registerliste `r2-r3` aufrufen.

Bevor wir zum Bytecode-Handler kommen, beachten Sie, wie Register im Bytecode kodiert sind. Sie sind negative Einzelbyte-Ganzzahlen: `r1` wird als `fa`, `r2` als `f9` und `r3` als `f8` kodiert. Wir können jedes Register ri als `fb - i` referenzieren, tatsächlich ist die korrekte Kodierung `- 2 - kFixedFrameHeaderSize - i`. Registerlisten werden mithilfe des ersten Registers und der Größe der Liste kodiert, sodass `r2-r3` als `f9 02` dargestellt wird.

Es gibt viele Bytecode-Anruf-Handler in Ignition. Sie können eine Liste davon [hier](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184) sehen. Sie unterscheiden sich geringfügig voneinander. Es gibt Bytecodes, die für Anrufe mit einem `undefined`-Empfänger optimiert sind, für Eigenschaftsanrufe, für Anrufe mit einer festen Anzahl von Parametern oder für generische Anrufe. Hier analysieren wir `CallNoFeedback`, einen generischen Anruf, bei dem wir keine Rückmeldungen aus der Ausführung sammeln.

Der Handler dieses Bytecodes ist ziemlich einfach. Er ist in [`CodeStubAssembler`](https://v8.dev/docs/csa-builtins) geschrieben, Sie können ihn [hier](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467) einsehen. Im Wesentlichen führt er einen Tailcall zu einem architekturabhängigen eingebauten [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277) aus.

Das eingebautes Verfahren entfernt im Wesentlichen die Rücksprungadresse in ein temporäres Register, übergibt alle Argumente (einschließlich des Empfängers) und schiebt die Rücksprungadresse zurück. Zu diesem Zeitpunkt wissen wir nicht, ob der Aufgerufene ein aufrufbares Objekt ist oder wie viele Argumente der Aufgerufene erwartet, d.h. seine formale Parameteranzahl.

![Zustand des Frames nach der Ausführung des eingebauten `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/normal-push.svg)

Die Ausführung führt schließlich einen Tailcall zu dem eingebauten [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256) aus. Dort wird überprüft, ob das Ziel eine richtige Funktion, ein Konstruktor oder ein anderes aufrufbares Objekt ist. Es liest auch die Struktur `shared function info`, um die formale Parameteranzahl zu erhalten.

Wenn der Aufgerufene ein Funktionsobjekt ist, führt es einen Tailcall zu dem eingebauten [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038) aus, wo eine Vielzahl von Überprüfungen stattfinden, einschließlich ob wir ein `undefined`-Objekt als Empfänger haben. Wenn wir ein `undefined`- oder `null`-Objekt als Empfänger haben, sollten wir es gemäß der [ECMA-Spezifikation](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis) so patchen, dass es auf das globale Proxy-Objekt verweist.

Die Ausführung führt dann einen Tailcall zu dem eingebauten [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781) aus, das – in Abwesenheit eines Argumentfehlers – einfach das aufruft, worauf das Feld `Code` im Aufgerufenen zeigt. Dies könnte entweder eine optimierte Funktion oder das eingebautes [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037) sein.

Wenn wir annehmen, dass wir eine Funktion aufrufen, die noch nicht optimiert wurde, richtet der Ignition-Trampolin ein `InterpreterFrame` ein. Sie können eine kurze Zusammenfassung der Frame-Typen in V8 [hier](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14) einsehen.

Ohne zu sehr ins Detail zu gehen, können wir einen Schnappschuss des Interpreter-Frames während der Ausführung des Aufgerufenen sehen.

![Das `InterpreterFrame` für den Anruf `add42(3)`.](/_img/adaptor-frame/normal-frame.svg)

Wir sehen, dass wir eine feste Anzahl von Slots im Frame haben: die Rücksprungadresse, den Zeiger des vorherigen Frames, den Kontext, das aktuelle Funktionsobjekt, das wir ausführen, die Bytecode-Array dieser Funktion und den Offset des derzeit ausgeführten Bytecodes. Schließlich haben wir eine Liste von Registern, die dieser Funktion zugeordnet sind (Sie können sich diese wie lokale Variablen der Funktion vorstellen). Die Funktion `add42` hat tatsächlich keine Register, aber der Aufrufer hat einen ähnlichen Frame mit 3 Registern.

Wie erwartet ist `add42` eine einfache Funktion:

```
25 02             Ldar a0          ;; Lädt das erste Argument in den Akkumulator
40 2a 00          AddSmi [42]      ;; Addiert 42 dazu
ab                Return           ;; Gibt den Akkumulator zurück
```

Beachten Sie, wie wir das Argument im Bytecode `Ldar` _(Load Accumulator Register)_ kodieren: Argument `1` (`a0`) wird mit der Nummer `02` kodiert. Tatsächlich ist die Kodierung eines beliebigen Arguments einfach `[ai] = 2 + parameter_count - i - 1` und der Empfänger `[this] = 2 + parameter_count`, oder in diesem Beispiel `[this] = 3`. Die Parameteranzahl hier schließt den Empfänger nicht ein.

Wir können jetzt verstehen, warum wir Register und Argumente auf diese Weise codieren. Sie kennzeichnen einfach einen Offset vom Frame-Pointer. Dadurch können wir Argument-/Register-Laden und -Speichern auf die gleiche Weise behandeln. Der Offset des letzten Arguments vom Frame-Pointer beträgt `2` (vorheriger Frame-Pointer und die Rücksprungadresse). Das erklärt das `2` in der Codierung. Der feste Teil des Interpreter-Frames besteht aus `6` Slots (`4` vom Frame-Pointer), sodass sich das Register Null bei Offset `-5`, also `fb`, befindet; Register `1` bei `fa`. Clever, oder?

Beachten Sie jedoch, dass eine Funktion wissen muss, wie viele Argumente sich im Stack befinden, um auf die Argumente zugreifen zu können! Der Index `2` zeigt auf das letzte Argument, unabhängig davon, wie viele Argumente vorhanden sind!

Der Bytecode-Handler von `Return` endet mit dem Aufruf des eingebauten `LeaveInterpreterFrame`. Dieses eingebaute Modul liest im Wesentlichen das Funktionsobjekt, um die Parameteranzahl aus dem Frame zu erhalten, entfernt das aktuelle Frame, stellt den Frame-Pointer wieder her, speichert die Rücksprungadresse in einem Scratch-Register, entfernt die Argumente gemäß der Parameteranzahl und springt zur Adresse im Scratch-Register.

All dieser Ablauf ist großartig! Aber was passiert, wenn wir eine Funktion mit weniger oder mehr Argumenten als ihrer Parameteranzahl aufrufen? Der clevere Argument-/Registerzugriff wird fehlschlagen, und wie räumen wir die Argumente am Ende des Aufrufs auf?

## Argument-Adapter-Frame

Rufen wir jetzt `add42` mit weniger oder mehr Argumenten auf:

```js
add42();
add42(1, 2, 3);
```

Die JS-Entwickler unter uns wissen, dass im ersten Fall `x` den Wert `undefined` zugewiesen wird und die Funktion `undefined + 42 = NaN` zurückgibt. Im zweiten Fall wird `x` der Wert `1` zugewiesen und die Funktion gibt `43` zurück, die restlichen Argumente werden ignoriert. Beachten Sie, dass der Aufrufer nicht weiß, ob das passieren wird. Selbst wenn der Aufrufer die Parameteranzahl überprüft, könnte der Aufgerufene den Rest-Parameter oder das Argumentobjekt verwenden, um Zugriff auf die anderen Argumente zu erhalten. Tatsächlich kann das Argumentobjekt sogar außerhalb von `add42` im sloppy Modus aufgerufen werden.

Wenn wir die gleichen Schritte wie zuvor ausführen, rufen wir zunächst das eingebaute Modul `InterpreterPushArgsThenCall` auf. Es wird die Argumente wie folgt in den Stack speichern:

![Zustand der Frames nach der Ausführung des Eingebauten `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/adaptor-push.svg)

Wenn wir mit dem gleichen Verfahren wie zuvor fortfahren, überprüfen wir, ob der Aufgerufene ein Funktionsobjekt ist, erhalten die Parameteranzahl und setzen den Empfänger auf den globalen Proxy. Schließlich erreichen wir `InvokeFunctionCode`.

An dieser Stelle springen wir, anstatt zum `Code` im Objekt des Aufgerufenen zu springen, zum `ArgumentsAdaptorTrampoline`, da wir einen Unterschied zwischen der Argumentgröße und der Parameteranzahl feststellen.

In diesem eingebauten Modul erstellen wir ein zusätzliches Frame, das berüchtigte Arguments-Adapter-Frame. Anstatt zu erklären, was innerhalb des Eingebauten passiert, zeige ich Ihnen einfach den Zustand des Frames, bevor das eingebaute Modul den `Code` des Aufgerufenen aufruft. Beachten Sie, dass dies ein korrekter `x64 call` ist (kein `jmp`) und wir nach der Ausführung des Aufgerufenen zum `ArgumentsAdaptorTrampoline` zurückkehren. Dies steht im Gegensatz zu `InvokeFunctionCode`, das Tail-Calls ausführt.

![Stack-Frames mit Argumentanpassung.](/_img/adaptor-frame/adaptor-frames.svg)

Sie sehen, dass wir ein weiteres Frame erstellen, das alle notwendigen Argumente kopiert, um genau die Parameteranzahl von Argumenten auf dem Frame des Aufgerufenen zu haben. Es schafft eine Schnittstelle zur Funktion des Aufgerufenen, sodass dieser die Anzahl der Argumente nicht kennen muss. Der Aufgerufene wird seine Parameter immer mit der gleichen Berechnung wie zuvor zugreifen können, nämlich `[ai] = 2 + parameter_count - i - 1`.

V8 hat spezielle eingebaute Module, die das Arguments-Adapter-Frame verstehen, wann immer es notwendig ist, die verbleibenden Argumente durch den Rest-Parameter oder das Argumentobjekt zuzugreifen. Sie müssen immer den Typ des Adapter-Frames oben auf dem Frame des Aufgerufenen überprüfen und entsprechend handeln.

Wie Sie sehen können, lösen wir das Problem des Argument-/Registerzugriffs, aber wir erzeugen viel Komplexität. Jedes eingebaute Modul, das Zugriff auf alle Argumente benötigt, muss die Existenz des Adapter-Frames verstehen und prüfen. Nicht nur das, wir müssen darauf achten, nicht auf veraltete Daten zuzugreifen. Betrachten Sie die folgenden Änderungen an `add42`:

```js
function add42(x) {
  x += 42;
  return x;
}
```

Die Bytecode-Array sieht jetzt so aus:

```
25 02             Ldar a0       ;; Lade das erste Argument in den Akkumulator
40 2a 00          AddSmi [42]   ;; Addiere 42 dazu
26 02             Star a0       ;; Speichere den Akkumulator im ersten Argument-Slot
ab                Return        ;; Gib den Akkumulator zurück
```

Wie Sie sehen können, ändern wir `a0` jetzt. Im Fall eines Aufrufs `add42(1, 2, 3)` wird der Slot im Arguments-Adapter-Frame geändert, aber das Aufrufer-Frame enthält weiterhin die Zahl `1`. Wir müssen darauf achten, dass das Argumentobjekt den geänderten Wert statt des veralteten zugreift.

Das Zurückkehren aus der Funktion ist einfach, wenn auch langsam. Erinnern Sie sich, was `LeaveInterpreterFrame` macht? Es entfernt im Wesentlichen das Frame des Aufgerufenen und die Argumente bis zur Anzahl der Parameter. Wenn wir zum Arguments-Adapter-Stub zurückkehren, sieht der Stack so aus:

![Zustand der Frames nach der Ausführung des Aufgerufenen `add42`.](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

Wir müssen lediglich die Anzahl der Argumente entfernen, den Adaptor-Rahmen entfernen, alle Argumente entsprechend der tatsächlichen Anzahl der Argumente entfernen und zur Aufruferausführung zurückkehren.

Kurz gesagt: Die Argument-Adapter-Maschinerie ist nicht nur komplex, sondern auch kostspielig.

## Entfernen des Argument-Adapter-Rahmens

Können wir es besser machen? Können wir den Adaptor-Rahmen entfernen? Es stellt sich heraus, dass wir das tatsächlich können.

Lassen Sie uns unsere Anforderungen überprüfen:

1. Wir müssen nahtlos auf die Argumente und Register zugreifen können wie zuvor. Beim Zugriff darauf dürfen keine Überprüfungen durchgeführt werden. Das wäre zu kostspielig.
2. Wir müssen den Restparameter und das Argumentobjekt aus dem Stapel erzeugen können.
3. Wir müssen in der Lage sein, eine unbekannte Anzahl von Argumenten beim Rückkehr aus einem Aufruf leicht zu bereinigen.
4. Und natürlich möchten wir dies ohne einen zusätzlichen Rahmen erreichen!

Wenn wir den zusätzlichen Rahmen eliminieren möchten, müssen wir entscheiden, wo die Argumente platziert werden sollen: entweder im Rahmen des aufgerufenen oder im Rahmen des Aufrufers.

### Argumente im Rahmen des Aufgerufenen

Nehmen wir an, wir platzieren die Argumente im Rahmen des Aufgerufenen. Dies scheint tatsächlich eine gute Idee zu sein, da wir beim Entfernen des Rahmens auch alle Argumente auf einmal entfernen!

Die Argumente müssten irgendwo zwischen dem gespeicherten Rahmenzeiger und dem Ende des Rahmens liegen. Dies bedeutet, dass die Größe des Rahmens nicht statisch bekannt ist. Der Zugriff auf ein Argument wäre weiterhin einfach, da es sich um einen einfachen Versatz vom Rahmenzeiger handelt. Der Zugriff auf ein Register ist jedoch jetzt viel komplizierter, da er je nach Anzahl der Argumente variiert.

Der Stapelzeiger verweist immer auf das letzte Register, von dem aus wir auf die Register zugreifen könnten, ohne die Anzahl der Argumente zu kennen. Dieser Ansatz könnte tatsächlich funktionieren, hat jedoch einen wesentlichen Nachteil. Dies würde bedeuten, dass alle Bytecodes dupliziert werden müssten, die Register und Argumente zugreifen können. Wir würden ein `LdaArgument` und ein `LdaRegister` benötigen, anstatt einfach `Ldar`. Natürlich könnten wir auch überprüfen, ob wir auf ein Argument oder ein Register zugreifen (positive oder negative Versätze), aber das würde bei jedem Zugriff auf Argumente und Register eine Überprüfung erfordern. Eindeutig zu kostspielig!

### Argumente im Rahmen des Aufrufers

Okay... was wäre, wenn wir die Argumente im Rahmen des Aufrufers belassen?

Erinnern Sie sich daran, wie Sie den Versatz des Arguments `i` in einem Rahmen berechnen: `[ai] = 2 + parameter_count - i - 1`. Wenn wir alle Argumente haben (nicht nur die Parameter), ist der Versatz `[ai] = 2 + argument_count - i - 1`. Das heißt, für jeden Argumentzugriff müssten wir die tatsächliche Anzahl der Argumente laden.

Aber was passiert, wenn wir die Argumente umkehren? Jetzt kann der Versatz einfach als `[ai] = 2 + i` berechnet werden. Wir müssen nicht wissen, wie viele Argumente sich im Stapel befinden, aber wenn wir garantieren können, dass wir immer mindestens die Parameteranzahl von Argumenten im Stapel haben, können wir dieses Schema immer verwenden, um den Versatz zu berechnen.

Mit anderen Worten, die Anzahl der Argumente, die in den Stapel gelegt werden, wird immer das Maximum zwischen der Anzahl der Argumente und der formalen Parameteranzahl sein und bei Bedarf mit undefinierten Objekten aufgefüllt.

Das bringt noch einen weiteren Bonus! Der Empfänger befindet sich immer im selben Versatz für jede JS-Funktion, direkt über der Rücksprungadresse: `[this] = 2`.

Dies ist eine saubere Lösung für unsere Anforderung Nummer `1` und Nummer `4`. Was ist mit den anderen beiden Anforderungen? Wie können wir den Restparameter und das Argumentobjekt erzeugen? Und wie können wir die Argumente im Stapel bereinigen, wenn wir zum Aufrufer zurückkehren? Dazu fehlt uns nur noch die Argumentanzahl. Wir müssen sie irgendwo speichern. Die Wahl ist hier ein bisschen willkürlich, solange es einfach ist, diese Informationen zugänglich zu machen. Zwei grundlegende Optionen sind: sie direkt nach dem Empfänger im Rahmen des Aufrufers zu pushen oder als Teil des festen Header-Teils im Rahmen des Aufgerufenen. Wir haben Letzteres implementiert, da dies den festen Header-Teil des Interpreters und der optimierten Rahmen zusammenführt.

Wenn wir unser Beispiel in V8 v8.9 ausführen, sehen wir nach `InterpreterArgsThenPush` den folgenden Stapel (beachten Sie, dass die Argumente jetzt umgekehrt sind):

![Zustand der Rahmen nach der Ausführung des eingebauten `InterpreterPushArgsThenCall`.](/_img/adaptor-frame/no-adaptor-push.svg)

Die gesamte Ausführung folgt einem ähnlichen Pfad, bis wir InvokeFunctionCode erreichen. Hier bearbeiten wir die Argumente im Fall von Unteranwendungen und schieben so viele undefinierte Objekte wie nötig. Beachten Sie, dass wir im Fall von Überanwendungen nichts ändern. Schließlich übergeben wir die Anzahl der Argumente durch ein Register an den Code des Aufgerufenen. Im Fall von `x64` verwenden wir das Register `rax`.

Wenn der Aufgerufene noch nicht optimiert wurde, erreichen wir `InterpreterEntryTrampoline`, der den folgenden Rahmen erzeugt:

![Stapelrahmen ohne Argument-Adapter.](/_img/adaptor-frame/no-adaptor-frames.svg)

Der Rahmen des Aufgerufenen hat einen zusätzlichen Slot, der die Anzahl der Argumente enthält, die verwendet werden kann, um den Restparameter oder das Argumentobjekt zu erzeugen und die Argumente im Stapel zu bereinigen, bevor zum Aufrufer zurückgekehrt wird.

Um zurückzukehren, modifizieren wir `LeaveInterpreterFrame`, um die Anzahl der Argumente im Stack zu lesen und die maximale Zahl zwischen der Argumentanzahl und der Anzahl der formalen Parameter zu entfernen.

## TurboFan

Was ist mit optimiertem Code? Lassen Sie uns unser ursprüngliches Skript leicht ändern, um V8 zu zwingen, es mit TurboFan zu kompilieren:

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

Hier verwenden wir V8-Intrinsics, um V8 zu zwingen, den Aufruf zu optimieren, andernfalls würde V8 unsere kleine Funktion nur optimieren, wenn sie heiß wird (sehr oft verwendet wird). Wir rufen sie einmal vor der Optimierung auf, um einige Typinformationen zu sammeln, die bei der Kompilierung verwendet werden können. Lesen Sie mehr über TurboFan [hier](https://v8.dev/docs/turbofan).

Ich zeige Ihnen hier nur den Teil des generierten Codes, der für uns relevant ist.

```nasm
movq rdi,0x1a8e082126ad    ;; Funktion-Objekt <JSFunction add42> laden
push 0x6                   ;; SMI 3 als Argument schieben
movq rcx,0x1a8e082030d1    ;; <JSGlobal Object>
push rcx                   ;; Empfänger (das globale Proxy-Objekt) schieben
movl rax,0x1               ;; Argumentanzahl in rax speichern
movl rcx,[rdi+0x17]        ;; Code-Feld des Funktion-Objekts in rcx laden
call rcx                   ;; Schließlich das Code-Objekt aufrufen!
```

Obwohl in Assembler geschrieben, sollte dieser Codeausschnitt nicht schwer zu lesen sein, wenn Sie meinen Kommentaren folgen. Im Wesentlichen muss TF beim Kompilieren des Aufrufs alle Arbeiten erledigen, die in `InterpreterPushArgsThenCall`, `Call`, `CallFunction` und den `InvokeFunctionCall` Built-ins durchgeführt wurden. Hoffentlich hat es mehr statische Informationen, um das zu tun und weniger Computeranweisungen zu generieren.

### TurboFan mit dem Argumente-Adapter-Frame

Sehen wir uns nun den Fall an, in dem die Anzahl der Argumente und Parameter nicht übereinstimmen. Betrachten Sie den Aufruf `add42(1, 2, 3)`. Dieser wird kompiliert zu:

```nasm
movq rdi,0x4250820fff1    ;; Funktion-Objekt <JSFunction add42> laden
;; Empfänger und SMIs 1, 2 und 3 als Argumente schieben
movq rcx,0x42508080dd5    ;; <JSGlobal Object>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; Argumentanzahl in rax speichern
movl rbx,0x1              ;; Formale Parameteranzahl in rbx speichern
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; ArgumentsAdaptorTrampoline aufrufen
```

Wie Sie sehen können, ist es nicht schwer, Unterstützung für TF bei einer Nichtübereinstimmung der Argument- und Parameteranzahl hinzuzufügen. Einfach den Arguments-Adapter-Trampolin aufrufen!

Das ist jedoch teuer. Für jeden optimierten Aufruf müssen wir jetzt in den Arguments-Adapter-Trampolin eintreten und den Frame wie im nicht optimierten Code behandeln. Das erklärt, warum der Leistungsgewinn durch das Entfernen des Adapter-Frames im optimierten Code viel größer ist als in Ignition.

Der generierte Code ist jedoch sehr einfach. Und die Rückkehr davon ist äußerst einfach (Epilog):

```nasm
movq rsp,rbp   ;; Callee-Frame bereinigen
pop rbp
ret 0x8        ;; Ein einziges Argument (den Empfänger) entfernen
```

Wir entfernen unseren Frame und geben eine Rückgabeanweisung gemäß der Parameteranzahl aus. Wenn wir eine Nichtübereinstimmung in der Anzahl der Argumente und Parameter haben, wird sich der Adapter-Frame-Trampolin darum kümmern.

### TurboFan ohne den Argumente-Adapter-Frame

Der generierte Code ist im Wesentlichen derselbe wie bei einem Aufruf mit gleicher Anzahl von Argumenten. Betrachten Sie den Aufruf `add42(1, 2, 3)`. Dieser erzeugt:

```nasm
movq rdi,0x35ac082126ad    ;; Funktion-Objekt <JSFunction add42> laden
;; Empfänger und Argumente 1, 2 und 3 (umgekehrt) schieben
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <JSGlobal Object>
push rcx
movl rax,0x3               ;; Argumentanzahl in rax speichern
movl rcx,[rdi+0x17]        ;; Code-Feld des Funktion-Objekts in rcx laden
call rcx                   ;; Schließlich das Code-Objekt aufrufen!
```

Was ist mit dem Epilog der Funktion? Wir kehren nicht mehr zum Arguments-Adapter-Trampolin zurück, daher ist der Epilog tatsächlich etwas komplexer als zuvor.

```nasm
movq rcx,[rbp-0x18]        ;; Argumentanzahl (aus dem Callee-Frame) in rcx laden
movq rsp,rbp               ;; Callee-Frame entfernen
pop rbp
cmpq rcx,0x0               ;; Argumentanzahl mit formaler Parameteranzahl vergleichen
jg 0x35ac000840c6  <+0x86>
;; Wenn die Argumentanzahl kleiner (oder gleich) der Anzahl der formalen Parameter ist:
ret 0x8                    ;; Normal zurückkehren (Parameteranzahl ist statisch bekannt)
;; Wenn wir mehr Argumente im Stack haben als formale Parameter:
pop r10                    ;; Rücksprungadresse speichern
leaq rsp,[rsp+rcx*8+0x8]   ;; Alle Argumente gemäß rcx entfernen
push r10                   ;; Rücksprungadresse wiederherstellen
retl
```

# Fazit
