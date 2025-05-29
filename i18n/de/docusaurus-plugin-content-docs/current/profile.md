---
title: &apos;Verwendung von V8s Sample-basiertem Profiler&apos;
description: &apos;Dieses Dokument erklärt, wie man den Sample-basierten Profiler von V8 verwendet.&apos;
---
V8 verfügt über einen eingebauten Sample-basierten Profiler. Das Profiling ist standardmäßig deaktiviert, kann jedoch über die Befehlszeilenoption `--prof` aktiviert werden. Der Sampler zeichnet Stapel von JavaScript- und C/C++-Code auf.

## Build

Erstellen Sie die `d8`-Shell gemäß den Anweisungen unter [Building with GN](/docs/build-gn).

## Befehlszeile

Um mit dem Profiling zu beginnen, verwenden Sie die Option `--prof`. Beim Profiling erzeugt V8 eine `v8.log`-Datei, die Profildaten enthält.

Windows:

```bash
build\Release\d8 --prof script.js
```

Andere Plattformen (ersetzen Sie `ia32` durch `x64`, wenn Sie den `x64`-Build profilieren möchten):

```bash
out/ia32.release/d8 --prof script.js
```

## Verarbeiten der generierten Ausgabe

Die Verarbeitung der Log-Datei erfolgt mit JS-Skripten, die in der `d8`-Shell ausgeführt werden. Damit dies funktioniert, muss sich eine `d8`-Binärdatei (oder ein Symlink oder `d8.exe` unter Windows) im Stammverzeichnis Ihrer V8-Auscheckung befinden oder im Pfad, der durch die Umgebungsvariable `D8_PATH` angegeben wird. Hinweis: Diese Binärdatei wird nur zur Verarbeitung des Logs verwendet, nicht für das eigentliche Profiling. Daher spielt es keine Rolle, welche Version usw. verwendet wird.

**Stellen Sie sicher, dass `d8`, das für die Analyse verwendet wird, nicht mit `is_component_build` erstellt wurde!**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## Web-UI für `--prof`

Verarbeiten Sie das Log mit `--preprocess` (um C++-Symbole usw. aufzulösen).

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

Öffnen Sie [`tools/profview/index.html`](https://v8.dev/tools/head/profview) in Ihrem Browser und wählen Sie die Datei `v8.json` dort aus.

## Beispielausgabe

```
Statistische Profilierungsergebnisse von benchmarks\v8.log, (4192 Ticks, 0 nicht zugeordnet, 0 ausgeschlossen).

 [Gemeinsame Bibliotheken]:
   Ticks  Gesamt  Nicht-Bibl.   Name
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   Ticks  Gesamt  Nicht-Bibl.   Name
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   Ticks  Gesamt  Nicht-Bibl.   Name
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   Ticks  Gesamt  Nicht-Bibl.   Name
    458   10.9%

 [Bottom up (Heavy) Profil]:
  Hinweis: Der Prozentsatz zeigt den Anteil eines bestimmten Aufrufers an der Gesamtmenge seiner Elternaufrufe.
  Aufrufer mit weniger als 2.0% werden nicht angezeigt.

   Ticks Eltern  Name
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## Profiling von Webanwendungen

Die hochoptimierten virtuellen Maschinen von heute können Webanwendungen mit beeindruckender Geschwindigkeit ausführen. Aber man sollte sich nicht nur darauf verlassen, um eine großartige Leistung zu erzielen: Ein sorgfältig optimierter Algorithmus oder eine weniger teure Funktion kann oft viele Male schneller sein, auf allen Browsern. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)’ [CPU Profiler](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) hilft Ihnen, die Engpässe in Ihrem Code zu analysieren. Aber manchmal muss man tiefer und detaillierter gehen: Hier kommt der interne Profiler von V8 ins Spiel.

Lassen Sie uns diesen Profiler verwenden, um die [Mandelbrot-Explorer-Demo](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/) zu untersuchen, die Microsoft [veröffentlicht hat](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) zusammen mit IE10. Nach der Veröffentlichung der Demo hat V8 einen Fehler behoben, der die Berechnung unnötig verlangsamte (daher die schlechte Leistung von Chrome in dem Demo-Blogpost), und die Engine weiter optimiert, indem eine schnellere `exp()`-Approximation implementiert wurde, als es die Standard-Bibliotheken bieten. Nach diesen Änderungen **lief die Demo 8× schneller als zuvor gemessen** in Chrome.

Aber was wäre, wenn Sie den Code auf allen Browsern schneller laufen lassen möchten? Zuerst sollten Sie **verstehen, was Ihre CPU beschäftigt**. Starten Sie Chrome (Windows und Linux [Canary](https://tools.google.com/dlpage/chromesxs)) mit den folgenden Befehlszeilenschaltern, die dazu führen, dass Profiler-Tick-Informationen (in der Datei `v8.log`) für die angegebene URL ausgegeben werden, die in unserem Fall eine lokale Version der Mandelbrot-Demo ohne Webworker war:

```bash
./chrome --js-flags=&apos;--prof&apos; --no-sandbox &apos;http://localhost:8080/&apos;
```

Stellen Sie beim Vorbereiten des Testfalls sicher, dass er seine Arbeit sofort nach dem Laden beginnt, und schließen Sie Chrome, wenn die Berechnung abgeschlossen ist (drücken Sie Alt+F4), damit Sie nur die relevanten Ergebnisse im Protokoll haben. Beachten Sie auch, dass Webworker mit dieser Technik noch nicht korrekt profiliert werden.

Verarbeiten Sie anschließend die Datei `v8.log` mit dem `tick-processor`-Skript, das mit V8 geliefert wird (oder der neuen praktischen Webversion):

```bash
v8/tools/linux-tick-processor v8.log
```

Hier ist ein interessanter Ausschnitt aus der verarbeiteten Ausgabe, der Ihre Aufmerksamkeit erregen sollte:

```
Statistisches Profilierungsergebnis aus null, (14306 Ticks, 0 nicht zugeordnet, 0 ausgeschlossen).
 [Freigegebene Bibliotheken]:
   Ticks  insgesamt  nicht lib  Name
   6326   44.2%     0.0%       /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%     0.0%       /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%     0.0%       /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%     0.0%       /.../chrome/src/out/Release/lib/libwebkit.so
```

Der obere Abschnitt zeigt, dass V8 mehr Zeit in einer systemspezifischen Systembibliothek verbringt als in seinem eigenen Code. Werfen wir einen Blick darauf, was dafür verantwortlich ist, indem wir den Abschnitt "Bottom up" der Ausgabe prüfen, wo eingerückte Zeilen als "wurde aufgerufen von" gelesen werden können (und Zeilen, die mit einem `*` beginnen, bedeuten, dass die Funktion von TurboFan optimiert wurde):

```
[Bottom up (heavy) profile]:
  Hinweis: Der Prozentsatz zeigt den Anteil eines bestimmten Aufrufers an der Gesamtmenge seiner Elternaufrufe.
  Aufrufer, die weniger als 2.0% belegen, werden nicht angezeigt.

   Ticks Eltern  Name
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

**Mehr als 44% der gesamten Zeit werden damit verbracht, die Funktion `exp()` in einer Systembibliothek auszuführen!** Mit zusätzlichem Overhead für das Aufrufen von Systembibliotheken bedeutet dies, dass etwa zwei Drittel der Gesamtzeit für die Auswertung von `Math.exp()` verwendet werden.

Wenn Sie sich den JavaScript-Code ansehen, werden Sie feststellen, dass `exp()` ausschließlich verwendet wird, um eine glatte Graustufenpalette zu erzeugen. Es gibt unzählige Möglichkeiten, eine glatte Graustufenpalette zu erstellen, aber nehmen wir an, Sie mögen exponentielle Farbverläufe wirklich sehr. Hier kommt die algorithmische Optimierung ins Spiel.

Sie werden feststellen, dass `exp()` mit einem Argument im Bereich `-4 < x < 0` aufgerufen wird. Wir können es sicher durch seine [Taylor-Approximation](https://de.wikipedia.org/wiki/Taylor-Reihe) für diesen Bereich ersetzen, die denselben glatten Verlauf mit nur einer Multiplikation und ein paar Divisionen liefert:

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) für -4 < x < 0
```

Durch die Optimierung des Algorithmus auf diese Weise wird die Leistung um zusätzliche 30% im Vergleich zum neuesten Canary erhöht und um den Faktor 5 im Vergleich zur Systembibliothek-basierten `Math.exp()` in Chrome Canary.

![](/_img/docs/profile/mandelbrot.png)

Dieses Beispiel zeigt, wie der interne Profiler von V8 Ihnen helfen kann, tiefer in die Identifizierung von Code-Engpässen einzutauchen, und dass ein intelligenterer Algorithmus die Leistung noch weiter steigern kann.

Um mehr darüber zu erfahren, wie Benchmarks heutige komplexe und anspruchsvolle Webanwendungen darstellen, lesen Sie [Wie V8 die reale Leistung misst](/blog/real-world-performance).

