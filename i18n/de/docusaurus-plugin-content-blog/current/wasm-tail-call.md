---
title: 'WebAssembly Tail Calls'
author: 'Thibaud Michaud, Thomas Lively'
date: 2023-04-06
tags:
  - WebAssembly
description: 'Dieses Dokument erklärt den WebAssembly-Vorschlag für Tail Calls und demonstriert ihn mit einigen Beispielen.'
tweet: '1644077795059044353'
---
Wir veröffentlichen WebAssembly-Tail-Calls in V8 v11.2! In diesem Beitrag geben wir einen kurzen Überblick über diesen Vorschlag, demonstrieren einen interessanten Anwendungsfall für C++-Koroutinen mit Emscripten und zeigen, wie V8 Tail Calls intern behandelt.

## Was ist Tail Call Optimization?

Ein Aufruf befindet sich in Tail-Position, wenn er die letzte Anweisung ist, die vor der Rückkehr aus der aktuellen Funktion ausgeführt wird. Compiler können solche Aufrufe optimieren, indem sie den Aufrufer-Frame verwerfen und den Aufruf durch einen Sprung ersetzen.

Dies ist besonders nützlich für rekursive Funktionen. Betrachten Sie beispielsweise diese C-Funktion, die die Elemente einer verketteten Liste summiert:

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

Mit einem regulären Aufruf verbraucht dies 𝒪(n) Stapelspeicherplatz: Jedes Element der Liste fügt einen neuen Frame auf dem Aufrufstapel hinzu. Mit einer ausreichend langen Liste könnte dies sehr schnell den Stapel überlaufen lassen. Durch den Ersatz des Aufrufs durch einen Sprung verwandelt die Tail-Call-Optimierung diese rekursive Funktion effektiv in eine Schleife, die 𝒪(1) Stapelspeicherplatz verwendet:

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

Diese Optimierung ist besonders wichtig für funktionale Sprachen. Sie verlassen sich stark auf rekursive Funktionen, und rein funktionale Sprachen wie Haskell bieten nicht einmal Schleifensteuerstruktur. Jede Art von benutzerdefinierter Iteration verwendet typischerweise auf die eine oder andere Weise Rekursion. Ohne Tail-Call-Optimierung würde dies sehr schnell zu einem Stapelüberlauf für jedes nicht triviale Programm führen.

### Der WebAssembly-Tail-Call-Vorschlag

Es gibt zwei Möglichkeiten, eine Funktion im Wasm MVP aufzurufen: `call` und `call_indirect`. Der WebAssembly-Tail-Call-Vorschlag fügt deren Tail-Call-Gegenstücke hinzu: `return_call` und `return_call_indirect`. Dies bedeutet, dass es die Verantwortung der Toolchain ist, tatsächlich die Tail-Call-Optimierung durchzuführen und die entsprechende Aufrufart auszugeben, was ihr mehr Kontrolle über die Leistung und die Nutzung des Stapelspeicherplatzes verleiht.

Schauen wir uns eine rekursive Fibonacci-Funktion an. Der Wasm-Bytecode ist hier im Textformat der Vollständigkeit halber enthalten, aber Sie können ihn in der nächsten Sektion in C++ finden:

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

Zu jedem beliebigen Zeitpunkt gibt es nur einen `fib_rec`-Frame, der sich selbst auflöst, bevor der nächste rekursive Aufruf ausgeführt wird. Wenn wir den Basisfall erreichen, gibt `fib_rec` das Ergebnis `a` direkt an `fib` zurück.

Eine beobachtbare Konsequenz von Tail Calls ist (neben einem verringerten Risiko eines Stapelüberlaufs), dass Tail-Caller nicht in Stapel-Traces erscheinen. Sie erscheinen weder in der Stapel-Eigenschaft einer gefangenen Ausnahme, noch im DevTools-Stapel-Trace. Sobald eine Ausnahme ausgelöst wird oder die Ausführung pausiert, sind die Tail-Caller-Frames weg und es gibt keine Möglichkeit für V8, diese zurückzuholen.

## Verwenden von Tail Calls mit Emscripten

Funktionale Sprachen hängen oft von Tail Calls ab, aber es ist auch möglich, sie als C- oder C++-Programmierer zu verwenden. Emscripten (und Clang, das Emscripten verwendet) unterstützt das Attribut `musttail`, das dem Compiler mitteilt, dass ein Aufruf in einen Tail Call kompiliert werden muss. Betrachten Sie als Beispiel diese rekursive Implementierung einer Fibonacci-Funktion, die die `n`te Fibonacci-Zahl mod 2^32 berechnet (da die Ganzzahlen für große `n` überlaufen):

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

Nach der Kompilierung mit `emcc test.c -o test.js` gibt die Ausführung dieses Programms in Node.js einen Stapelüberlauffehler zurück. Wir können dies beheben, indem wir `__attribute__((__musttail__))` zur Rückgabe in `fib_rec` hinzufügen und `-mtail-call` zu den Kompilierungsargumenten hinzufügen. Nun enthält das erzeugte Wasm-Modul die neuen Tail-Call-Anweisungen, sodass wir `--experimental-wasm-return_call` an Node.js übergeben müssen, aber der Stapel läuft nicht mehr über.

Hier ist ein Beispiel, das auch wechselseitige Rekursion verwendet:

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    return false;
  }
  __attribute__((__musttail__))
  return is_even(n - 1);
}

bool is_even(unsigned n) {
  if (n == 0) {
    return true;
  }
  __attribute__((__musttail__))
  return is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

Beachten Sie, dass beide Beispiele einfach genug sind, dass der Compiler bei der Kompilierung mit `-O2` die Antwort vorab berechnen und den Stack selbst ohne Tail Calls nicht erschöpfen kann, dies jedoch bei komplexerem Code nicht der Fall wäre. In realem Code kann das `musttail`-Attribut dabei helfen, leistungsstarke Interpreter-Schleifen zu schreiben, wie in [diesem Blogbeitrag](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html) von Josh Haberman beschrieben.

Neben dem `musttail`-Attribut hängen C++ für eine andere Funktion von Tail Calls ab: C++20-Koroutinen. Die Beziehung zwischen Tail Calls und C++20-Koroutinen wird in [diesem Blogbeitrag](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer) von Lewis Baker ausführlich beschrieben. Zusammengefasst lässt sich sagen, dass es möglich ist, Koroutinen in einem Muster zu verwenden, das subtil einen Stacküberlauf verursacht, obwohl der Quellcode nicht den Eindruck erweckt, dass es ein Problem gibt. Um dieses Problem zu beheben, hat das C++-Komitee eine Anforderung hinzugefügt, dass Compiler eine „symmetrische Übertragung“ implementieren, um den Stacküberlauf zu vermeiden, was praktisch bedeutet, dass unter der Oberfläche Tail Calls verwendet werden.

Wenn WebAssembly-Tail-Calls aktiviert sind, implementiert Clang die symmetrische Übertragung wie in diesem Blogbeitrag beschrieben. Wenn Tail Calls jedoch nicht aktiviert sind, kompiliert Clang den Code stillschweigend ohne symmetrische Übertragung, was zu Stacküberläufen führen könnte und technisch gesehen keine korrekte Implementierung von C++20 ist!

Um den Unterschied in Aktion zu sehen, verwenden Sie Emscripten, um das letzte Beispiel aus dem oben verlinkten Blogbeitrag zu kompilieren, und beobachten Sie, dass es den Stack nur dann nicht überläuft, wenn Tail Calls aktiviert sind. Beachten Sie, dass aufgrund eines kürzlich behobenen Fehlers dies nur in Emscripten 3.1.35 oder später korrekt funktioniert.

## Tail Calls in V8

Wie wir bereits gesehen haben, liegt es nicht in der Verantwortung der Engine, Aufrufe in Tail-Position zu erkennen. Dies sollte upstream von der Toolchain erfolgen. Das einzige, was TurboFan (der optimierende Compiler von V8) noch tun muss, ist, eine geeignete Abfolge von Anweisungen basierend auf der Art des Aufrufs und der Signatur der Zielmethode auszugeben. In unserem Fibonacci-Beispiel von früher würde der Stack folgendermaßen aussehen:

![Einfacher Tail Call in TurboFan](/_img/wasm-tail-calls/tail-calls.svg)

Links befinden wir uns in `fib_rec` (grün), aufgerufen von `fib` (blau) und sind dabei, `fib_rec` rekursiv als Tail Call aufzurufen. Zuerst lösen wir den aktuellen Frame auf, indem wir den Frame- und Stack-Pointer zurücksetzen. Der Frame-Pointer stellt einfach seinen vorherigen Wert wieder her, indem er ihn aus dem „Caller FP“-Slot liest. Der Stack-Pointer bewegt sich zum oberen Ende des übergeordneten Frames, plus genügend Platz für etwaige potenzielle Stack-Parameter und Stack-Rückgabewerte für den Callee (in diesem Fall 0, alles wird durch Register übergeben). Parameter werden gemäß der Verknüpfung von `fib_rec` in ihre erwarteten Register verschoben (nicht im Diagramm dargestellt). Und schließlich beginnen wir mit der Ausführung von `fib_rec`, das damit beginnt, einen neuen Frame zu erstellen.

`fib_rec` entwindet und windet sich selbst so lange, bis `n == 0`, und gibt dann `a` über das Register an `fib` zurück.

Dies ist ein einfacher Fall, bei dem alle Parameter und Rückgabewerte in Register passen und der Callee dieselbe Signatur wie der Caller hat. Im allgemeinen Fall müssen wir möglicherweise komplexe Stack-Manipulationen durchführen:

- Ausgehende Parameter aus dem alten Frame lesen
- Parameter in den neuen Frame verschieben
- Die Frame-Größe anpassen, indem wir die Rücksprungadresse je nach Anzahl der Stack-Parameter im Callee nach oben oder unten verschieben

All diese Lese- und Schreibvorgänge können miteinander in Konflikt geraten, da wir denselben Stack-Speicherplatz wiederverwenden. Dies ist ein entscheidender Unterschied zu einem nicht-Tail-Call, der einfach alle Stack-Parameter und die Rücksprungadresse oben auf dem Stack ablegen würde.

![Komplexer Tail Call in TurboFan](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan behandelt diese Stack- und Register-Manipulationen mit dem „Gap Resolver“, einer Komponente, die eine Liste von Bewegungen nimmt, die semantisch parallel ausgeführt werden sollten, und die geeignete Abfolge von Bewegungen erzeugt, um mögliche Interferenzen zwischen den Quellen und Zielen der Bewegung zu lösen. Wenn die Konflikte azyklisch sind, geht es nur darum, die Bewegungen so umzuordnen, dass alle Quellen gelesen werden, bevor sie überschrieben werden. Bei zyklischen Konflikten (z. B. wenn wir zwei Stack-Parameter tauschen), kann dies das Verschieben einer der Quellen in ein temporäres Register oder einen temporären Stack-Slot beinhalten, um den Zyklus zu brechen.

Schwanzaufrufe werden auch in Liftoff, unserem Basiscompiler, unterstützt. Tatsächlich müssen sie unterstützt werden, sonst könnte der Basiscode keinen Speicherplatz im Stapel haben. Diese Funktion ist jedoch in dieser Stufe nicht optimiert: Liftoff schiebt die Parameter, die Rücksprungadresse und den Rahmenzeiger, um den Rahmen zu vervollständigen, als wäre dies ein regulärer Aufruf, und verschiebt dann alles nach unten, um den Aufruferrahmen zu verwerfen:

![Schwanzaufrufe in Liftoff](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

Bevor wir zur Zielfunktion springen, poppen wir außerdem den FP des Aufrufers in das FP-Register, um seinen vorherigen Wert wiederherzustellen und um es der Zielfunktion zu ermöglichen, ihn erneut im Prolog zu schieben.

Diese Strategie erfordert nicht, dass wir Bewegungs-Konflikte analysieren und lösen, was die Kompilierung schneller macht. Der erzeugte Code ist langsamer, schaltet aber schließlich auf [höhere Stufen](/blog/wasm-dynamic-tiering) in TurboFan um, falls die Funktion oft genug aufgerufen wird.
