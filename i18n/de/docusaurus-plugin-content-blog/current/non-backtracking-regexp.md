---
title: &apos;Eine zusätzliche nicht-backtracking RegExp-Engine&apos;
author: &apos;Martin Bidlingmaier&apos;
date: 2021-01-11
tags:
 - Interna
 - RegExp
description: &apos;V8 verfügt nun über eine zusätzliche RegExp-Engine, die als Fallback dient und viele Fälle von katastrophalem Backtracking verhindert.&apos;
tweet: &apos;1348635270762139650&apos;
---
Ab Version v8.8 wird V8 mit einer neuen experimentellen nicht-backtracking RegExp-Engine ausgeliefert (zusätzlich zur bestehenden [Irregexp-Engine](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)), die garantiert, dass die Ausführung in linearer Zeit in Bezug auf die Größe der Eingabestrings erfolgt. Die experimentelle Engine ist hinter den unten erwähnten Feature-Flags verfügbar.

<!--truncate-->
![Laufzeit von `/(a*)*b/.exec(&apos;a&apos;.repeat(n))` für n ≤ 100](/_img/non-backtracking-regexp/runtime-plot.svg)

So können Sie die neue RegExp-Engine konfigurieren:

- `--enable-experimental-regexp_engine-on-excessive-backtracks` aktiviert das Fallback zur nicht-backtracking Engine bei übermäßigem Backtracking.
- `--regexp-backtracks-before-fallback N` (Standard N = 50.000) gibt an, wie viele Backtracks als „übermäßig“ angesehen werden, d.h. wann das Fallback einsetzt.
- `--enable-experimental-regexp-engine` aktiviert die Erkennung des nicht-standardmäßigen Flags `l` („linear“) für RegExps, wie z.B. `/(a*)*b/l`. RegExps, die mit diesem Flag erstellt wurden, werden immer direkt mit der neuen Engine ausgeführt; Irregexp wird überhaupt nicht verwendet. Kann die neue RegExp-Engine das Muster eines `l`-RegExps nicht verarbeiten, wird beim Erstellen eine Ausnahme ausgelöst. Wir hoffen, dass diese Funktion irgendwann zur Härtung von Apps verwendet werden kann, die RegExps mit nicht vertrauenswürdigen Eingaben ausführen. Vorerst bleibt sie experimentell, da Irregexp bei den meisten gängigen Mustern um Größenordnungen schneller ist als die neue Engine.

Der Fallback-Mechanismus gilt nicht für alle Muster. Damit der Fallback-Mechanismus ausgelöst werden kann, muss der RegExp:

- keine Rückverweise enthalten,
- keine Vor- oder Rückwärtssuchen enthalten,
- keine großen oder tief verschachtelten endlichen Wiederholungen enthalten, wie z.B. `/a{200,500}/`, und
- die Flags `u` (Unicode) oder `i` (Unterschied beachtet Groß-/Kleinschreibung) dürfen nicht gesetzt sein.

## Hintergrund: Katastrophales Backtracking

Die RegExp-Verarbeitung in V8 erfolgt durch die Irregexp-Engine. Irregexp JIT-kompiliert RegExps zu spezialisiertem nativen Code (oder [Bytecode](/blog/regexp-tier-up)) und ist daher für die meisten Muster extrem schnell. Für einige Muster kann Irregexps Laufzeit jedoch exponentiell ansteigen, abhängig von der Größe der Eingabestrings. Im obigen Beispiel, `/(a*)*b/.exec(&apos;a&apos;.repeat(100))`, wird die Ausführung durch Irregexp innerhalb unserer Lebenszeit nicht abgeschlossen.

Was geschieht hier also genau? Irregexp ist eine *Backtracking*-Engine. Bei einer Auswahl, wie ein Muster fortgesetzt werden kann, erkundet Irregexp zunächst die erste Alternative vollständig und backtracked dann bei Bedarf, um die zweite Alternative zu untersuchen. Betrachten Sie z. B. das Muster `/abc|[az][by][0-9]/`, das mit dem Eingabestring `&apos;ab3&apos;` abgeglichen wird. Hier versucht Irregexp zunächst, `/abc/` zu matchen und scheitert nach dem zweiten Zeichen. Es backtracked dann um zwei Zeichen zurück und matcht erfolgreich die zweite Alternative `/[az][by][0-9]/`. In Mustern mit Quantifizierern wie `/(abc)*xyz/` muss Irregexp nach einem Treffer des Hauptteils entscheiden, ob der Hauptteil erneut gematcht oder das restliche Muster fortgesetzt werden soll.

Lassen Sie uns versuchen zu verstehen, was geschieht, wenn `/(a*)*b/` mit einem kleineren Eingabestring wie `&apos;aaa&apos;` abgeglichen wird. Dieses Muster enthält verschachtelte Quantifizierer, sodass wir Irregexp bitten, eine *Sequenz von Sequenzen* von `&apos;a&apos;` zu matchen und dann `&apos;b&apos;` zu matchen. Offensichtlich gibt es keinen Treffer, da der Eingabestring kein `&apos;b&apos;` enthält. Jedoch matcht `/(a*)*/`, und dies in exponentiell vielen verschiedenen Wegen:

```js
&apos;aaa&apos;           &apos;aa&apos;, &apos;a&apos;           &apos;aa&apos;, &apos;&apos;
&apos;a&apos;, &apos;aa&apos;       &apos;a&apos;, &apos;a&apos;, &apos;a&apos;       &apos;a&apos;, &apos;a&apos;, &apos;&apos;
…
```

A priori kann Irregexp nicht ausschließen, dass das Scheitern beim Matchen des finalen `/b/` daran liegt, dass die falsche Möglichkeit gewählt wurde, `/(a*)*/` zu matchen, sodass es alle Varianten ausprobieren muss. Dieses Problem wird als „exponentielles“ oder „katastrophales“ Backtracking bezeichnet.

## RegExps als Automaten und Bytecode

Um einen alternativen Algorithmus zu verstehen, der gegen katastrophales Backtracking immun ist, müssen wir einen kurzen Exkurs über [Automaten](https://de.wikipedia.org/wiki/Nichtdeterministischer_endlicher_Automat) machen. Jeder reguläre Ausdruck ist einem Automaten äquivalent. Der RegExp `/(a*)*b/` oben entspricht z. B. dem folgenden Automaten:

![Automat, der `/(a*)*b/` entspricht](/_img/non-backtracking-regexp/example-automaton.svg)

Beachten Sie, dass der Automat nicht eindeutig durch das Muster bestimmt ist; der oben gezeigte ist der Automat, der durch einen mechanischen Übersetzungsprozess erzeugt wurde, und er ist derjenige, der in der neuen RegExp-Engine von V8 für `/(a*)*/` verwendet wird.
Die nicht gekennzeichneten Kanten sind Epsilon-Übergänge: Sie verbrauchen keine Eingabe. Epsilon-Übergänge sind notwendig, um die Größe des Automaten etwa in der Größe des Musters zu halten. Ein naives Eliminieren von Epsilon-Übergängen kann zu einer quadratischen Zunahme der Übergänge führen.
Epsilon-Übergänge ermöglichen auch die Konstruktion des Automaten, der einer RegExp entspricht, aus den folgenden vier grundlegenden Typen von Zuständen:

![RegExp Bytecode-Anweisungen](/_img/non-backtracking-regexp/state-types.svg)

Hier klassifizieren wir nur die Übergänge *ausgehend* vom Zustand, während die Übergänge in den Zustand weiterhin beliebig sein dürfen. Automaten, die nur aus diesen Arten von Zuständen bestehen, können als *Bytecode-Programme* dargestellt werden, wobei jeder Zustand einer Anweisung entspricht. Zum Beispiel wird ein Zustand mit zwei Epsilon-Übergängen als eine `FORK`-Anweisung dargestellt.

## Der Backtracking-Algorithmus

Lassen Sie uns den Backtracking-Algorithmus, auf dem Irregexp basiert, noch einmal betrachten und in Bezug auf Automaten beschreiben. Angenommen, wir haben ein Bytecode-Array `code`, das dem Muster entspricht, und möchten testen, ob eine `input`-Zeichenkette mit dem Muster übereinstimmt. Angenommen, `code` sieht ungefähr so aus:

```js
const code = [
  {opcode: &apos;FORK&apos;, forkPc: 4},
  {opcode: &apos;CONSUME&apos;, char: &apos;1&apos;},
  {opcode: &apos;CONSUME&apos;, char: &apos;2&apos;},
  {opcode: &apos;JMP&apos;, jmpPc: 6},
  {opcode: &apos;CONSUME&apos;, char: &apos;a&apos;},
  {opcode: &apos;CONSUME&apos;, char: &apos;b&apos;},
  {opcode: &apos;ACCEPT&apos;}
];
```

Dieser Bytecode entspricht dem (sticky) Muster `/12|ab/y`. Das `forkPc`-Feld der `FORK`-Anweisung ist der Index („Program Counter“) des alternativen Zustands/der alternativen Anweisung, bei der wir fortfahren können, und ähnlich verhält es sich bei `jmpPc`. Indizes sind nullbasiert. Der Backtracking-Algorithmus kann nun in JavaScript wie folgt implementiert werden.

```js
let ip = 0; // Eingabeposition.
let pc = 0; // Program Counter: Index der nächsten Anweisung.
const stack = []; // Backtracking-Stack.
while (true) {
  const inst = code[pc];
  switch (inst.opcode) {
    case &apos;CONSUME&apos;:
      if (ip < input.length && input[ip] === inst.char) {
        // Die Eingabe stimmt überein: Weiter.
        ++ip;
        ++pc;
      } else if (stack.length > 0) {
        // Falsches Eingabezeichen, aber wir können zurückgehen.
        const back = stack.pop();
        ip = back.ip;
        pc = back.pc;
      } else {
        // Falsches Zeichen, kann nicht zurückgehen.
        return false;
      }
      break;
    case &apos;FORK&apos;:
      // Alternative für späteres Backtracking speichern.
      stack.push({ip: ip, pc: inst.forkPc});
      ++pc;
      break;
    case &apos;JMP&apos;:
      pc = inst.jmpPc;
      break;
    case &apos;ACCEPT&apos;:
      return true;
  }
}
```

Diese Implementierung läuft unendlich oft, wenn das Bytecode-Programm Schleifen enthält, die kein Zeichen verbrauchen, d.h. wenn der Automat eine Schleife enthält, die nur aus Epsilon-Übergängen besteht. Dieses Problem kann durch einen Lookahead mit einem einzelnen Zeichen gelöst werden. Irregexp ist weitaus ausgefeilter als diese einfache Implementierung, basiert jedoch letztendlich auf demselben Algorithmus.

## Der Non-Backtracking-Algorithmus

Der Backtracking-Algorithmus entspricht der *tiefenorientierten* Traversierung des Automaten: Wir erkunden immer die erste Alternative einer `FORK`-Anweisung vollständig und gehen dann, falls erforderlich, zur zweiten Alternative zurück. Die Alternative dazu, der Non-Backtracking-Algorithmus, basiert daher wenig überraschend auf der *breitenorientierten* Traversierung des Automaten. Hier betrachten wir alle Alternativen gleichzeitig, im Gleichschritt in Bezug auf die aktuelle Position in der Eingabezeichenkette. Wir führen eine Liste der aktuellen Zustände und gehen dann mit jedem Eingabezeichen durch Übergänge zu allen Zuständen weiter. Wichtig ist, dass wir Duplikate aus der Liste der aktuellen Zustände entfernen.

Eine einfache Implementierung in JavaScript sieht etwa so aus:

```js
// Eingabeposition.
let ip = 0;
// Liste der aktuellen pc-Werte oder `&apos;ACCEPT&apos;`, wenn wir eine Übereinstimmung gefunden haben. Wir starten bei
// pc 0 und folgen Epsilon-Übergängen.
let pcs = followEpsilons([0]);

while (true) {
  // Wir sind fertig, wenn wir eine Übereinstimmung gefunden haben...
  if (pcs === &apos;ACCEPT&apos;) return true;
  // ...oder wenn wir die Eingabezeichenkette erschöpft haben.
  if (ip >= input.length) return false;

  // Nur mit den pcs fortfahren, die das richtige Zeichen CONSUME.
  pcs = pcs.filter(pc => code[pc].char === input[ip]);
  // Die verbleibenden pcs zur nächsten Anweisung weiterleiten.
  pcs = pcs.map(pc => pc + 1);
  // Epsilon-Übergängen folgen.
  pcs = followEpsilons(pcs);

  ++ip;
}
```

Hier ist `followEpsilons` eine Funktion, die eine Liste von Programmcountern erhält und die Liste von Programmcountern bei `CONSUME`-Anweisungen berechnet, die über Epsilon-Übergänge erreicht werden können (d.h. nur durch Ausführen von FORK und JMP). Die zurückgegebene Liste darf keine Duplikate enthalten. Wenn eine `ACCEPT`-Anweisung erreicht werden kann, gibt die Funktion `&apos;ACCEPT&apos;` zurück. Sie kann so implementiert werden:

```js
function followEpsilons(pcs) {
  // Satz der pcs, die wir bisher gesehen haben.
  const visitedPcs = new Set();
  const result = [];

  while (pcs.length > 0) {
    const pc = pcs.pop();

    // Wir können pc ignorieren, wenn wir es zuvor gesehen haben.
    if (visitedPcs.has(pc)) continue;
    visitedPcs.add(pc);

    const inst = code[pc];
    switch (inst.opcode) {
      case &apos;CONSUME&apos;:
        result.push(pc);
        break;
      case &apos;FORK&apos;:
        pcs.push(pc + 1, inst.forkPc);
        break;
      case &apos;JMP&apos;:
        pcs.push(inst.jmpPc);
        break;
      case &apos;ACCEPT&apos;:
        return &apos;ACCEPT&apos;;
    }
  }

  return result;
}
```

Aufgrund der Eliminierung von Duplikaten über die `visitedPcs`-Menge wissen wir, dass jeder Programmzähler in `followEpsilons` nur einmal untersucht wird. Dies garantiert, dass die `result`-Liste keine Duplikate enthält und dass die Laufzeit von `followEpsilons` durch die Größe des `code`-Arrays, d.h. die Größe des Musters, begrenzt ist. `followEpsilons` wird höchstens `input.length`-Mal aufgerufen, sodass die Gesamtlaufzeit des RegExp-Matchings durch `𝒪(pattern.length * input.length)` begrenzt ist.

Der nicht-backtracking Algorithmus kann erweitert werden, um die meisten Funktionen von JavaScript-RegExps zu unterstützen, beispielsweise Wortgrenzen oder die Berechnung von (Unter-)Matchgrenzen. Leider können Rückverweise, Lookahead und Lookbehind ohne wesentliche Änderungen, die die asymptotische Worst-Case-Komplexität verändern, nicht unterstützt werden.

Die neue RegExp-Engine von V8 basiert auf diesem Algorithmus und seiner Implementierung in den [re2](https://github.com/google/re2)- und [Rust regex](https://github.com/rust-lang/regex)-Bibliotheken. Der Algorithmus wird in einer hervorragenden [Blog-Serie](https://swtch.com/~rsc/regexp/) von Russ Cox, der auch der ursprüngliche Autor der re2-Bibliothek ist, wesentlich ausführlicher als hier diskutiert.
