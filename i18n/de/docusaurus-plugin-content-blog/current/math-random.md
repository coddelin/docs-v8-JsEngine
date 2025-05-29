---
title: "Es gibt `Math.random()`, und dann gibt es `Math.random()`"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), Softwareingenieur und Würfeldesigner"
avatars:
  - "yang-guo"
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - Interna
description: "Die Implementierung von V8s Math.random verwendet jetzt einen Algorithmus namens xorshift128+, der die Zufälligkeit im Vergleich zur alten MWC1616-Implementierung verbessert."
---
> `Math.random()` gibt einen `Number`-Wert mit positivem Vorzeichen zurück, der größer oder gleich `0`, aber kleiner als `1` ist, zufällig oder pseudozufällig mit ungefähr gleichmäßiger Verteilung über diesen Bereich ausgewählt, unter Verwendung eines implementationsabhängigen Algorithmus oder einer Strategie. Diese Funktion nimmt keine Argumente entgegen.

<!--truncate-->
— _[ES 2015, Abschnitt 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` ist die bekannteste und am häufigsten genutzte Quelle für Zufälligkeit in JavaScript. In V8 und den meisten anderen JavaScript-Engines wird es mittels eines [Pseudozufallszahlengenerators](https://de.wikipedia.org/wiki/Pseudozufallszahlengenerator) (PRNG) implementiert. Wie bei allen PRNGs wird die Zufallszahl aus einem internen Zustand abgeleitet, der mit einem festen Algorithmus für jede neue Zufallszahl verändert wird. Für einen gegebenen Anfangszustand ist die Sequenz der Zufallszahlen deterministisch. Da die Bitgröße n des internen Zustands begrenzt ist, werden sich die durch einen PRNG generierten Zahlen letztendlich wiederholen. Die obere Grenze für die Periodenlänge dieses [Permutationszyklus](https://de.wikipedia.org/wiki/Zyklische_Permutation) beträgt 2<sup>n</sup>.

Es gibt viele verschiedene PRNG-Algorithmen; unter den bekanntesten sind [Mersenne-Twister](https://de.wikipedia.org/wiki/Mersenne-Twister) und [LCG](https://de.wikipedia.org/wiki/Lineare_Kongruenzmethode). Jeder hat seine spezifischen Eigenschaften, Vor- und Nachteile. Idealerweise sollte er so wenig Speicher wie möglich für den Anfangszustand verwenden, schnell sein, eine große Periodenlänge haben und eine hochwertige Zufallsverteilung bieten. Während Speicherverbrauch, Leistung und Periodenlänge leicht gemessen oder berechnet werden können, ist die Qualität schwieriger zu bestimmen. Es gibt viele mathematische Tests, um die Qualität der Zufallszahlen zu überprüfen. Die De-facto-Standard-Test-Suite für PRNGs, [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html), implementiert viele dieser Tests.

Bis [Ende 2015](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143) (bis Version 4.9.40) war V8s Wahl des PRNG MWC1616 (multiply with carry, eine Kombination aus zwei 16-Bit-Komponenten). Es verwendet 64 Bit internen Zustand und sieht ungefähr so aus:

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

Der 32-Bit-Wert wird dann entsprechend der Spezifikation in eine Gleitpunktzahl zwischen 0 und 1 umgewandelt.

MWC1616 verwendet wenig Speicher und ist relativ schnell berechenbar, bietet jedoch leider eine minderwertige Qualität:

- Die Anzahl der generierbaren Zufallswerte ist auf 2<sup>32</sup> begrenzt, im Vergleich zu den 2<sup>52</sup> Zahlen zwischen 0 und 1, die mit doppelter Genauigkeit darstellbar sind.
- Die obere signifikantere Hälfte des Ergebnisses hängt fast vollständig vom Wert von state0 ab. Die Periodenlänge wäre höchstens 2<sup>32</sup>, aber anstelle weniger großer Permutationszyklen gibt es viele kurze. Mit einem schlecht gewählten Anfangszustand könnte die Zykluslänge weniger als 40 Millionen betragen.
- Es fällt in vielen statistischen Tests der TestU01-Suite durch.

Dies wurde uns [aufgezeigt](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d), und nachdem wir das Problem verstanden und einige Nachforschungen angestellt hatten, entschieden wir uns, `Math.random` auf der Grundlage eines Algorithmus namens [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) neu zu implementieren. Es verwendet 128 Bit internen Zustand, hat eine Periodenlänge von 2<sup>128</sup> - 1 und besteht alle Tests der TestU01-Suite.

Die Implementierung wurde [in V8 v4.9.41.0 integriert](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102), nur wenige Tage nachdem wir auf das Problem aufmerksam geworden waren. Sie wurde mit Chrome 49 verfügbar. Sowohl [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99) als auch [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641) wechselten ebenfalls zu xorshift128+.

In V8 v7.1 wurde die Implementierung nochmals überarbeitet [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5), sodass nur noch state0 verwendet wird. Weitere Implementierungsdetails finden Sie im [Quellcode](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium).

Machen Sie jedoch keinen Fehler: Auch wenn xorshift128+ eine enorme Verbesserung gegenüber MWC1616 darstellt, ist es dennoch nicht [kryptographisch sicher](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator). Für Anwendungsfälle wie Hashing, Signaturerstellung und Verschlüsselung/Entschlüsselung sind gewöhnliche PRNGs ungeeignet. Die Web Cryptography API führt [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues) ein, eine Methode, die kryptographisch sichere Zufallswerte zurückgibt, jedoch auf Kosten der Leistung.

Bitte beachten Sie: Wenn Sie Verbesserungsmöglichkeiten in V8 und Chrome finden, auch solche, die – wie diese – die Spezifikationstreue, Stabilität oder Sicherheit nicht direkt beeinflussen, reichen Sie bitte [einen Fehlerbericht auf unserem Bugtracker ein](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user).
