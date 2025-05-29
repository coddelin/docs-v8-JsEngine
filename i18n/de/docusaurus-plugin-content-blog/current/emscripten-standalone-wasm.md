---
title: &apos;Außerhalb des Webs: eigenständige WebAssembly-Binärdateien mit Emscripten&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2019-11-21
tags:
  - WebAssembly
  - Tools
description: &apos;Emscripten unterstützt jetzt eigenständige Wasm-Dateien, die kein JavaScript benötigen.&apos;
tweet: &apos;1197547645729988608&apos;
---
Emscripten hat sich immer zuerst auf das Kompilieren für das Web und andere JavaScript-Umgebungen wie Node.js konzentriert. Aber da WebAssembly beginnt, *ohne* JavaScript verwendet zu werden, entstehen neue Anwendungsfälle, und deshalb haben wir daran gearbeitet, [**eigenständige Wasm**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone)-Dateien aus Emscripten zu generieren, die nicht auf die Emscripten-JavaScript-Laufzeit angewiesen sind! Dieser Beitrag erklärt, warum das interessant ist.

<!--truncate-->
## Verwendung des eigenständigen Modus in Emscripten

Sehen wir uns zunächst an, was Sie mit dieser neuen Funktion tun können! Ähnlich wie [dieser Beitrag](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/) beginnen wir mit einem Programm vom Typ „Hello World“, das eine einzelne Funktion exportiert, die zwei Zahlen addiert:

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

Normalerweise würden wir dies mit einem Befehl wie `emcc -O3 add.c -o add.js` kompilieren, der `add.js` und `add.wasm` generiert. Stattdessen fordern wir `emcc` auf, nur Wasm auszugeben:

```
emcc -O3 add.c -o add.wasm
```

Wenn `emcc` erkennt, dass wir nur Wasm möchten, erzeugt es eine "eigenständige" Datei – eine Wasm-Datei, die so eigenständig wie möglich ohne JavaScript-Laufzeitcode von Emscripten ausgeführt werden kann.

Beim Disassemblieren ist es sehr minimal – nur 87 Bytes! Es enthält die offensichtliche `add`-Funktion

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

und eine weitere Funktion, `_start`,

```lisp
(func $_start
 (nop)
)
```

`_start` ist Teil der [WASI](https://github.com/WebAssembly/WASI)-Spezifikation und Emscriptens eigenständiger Modus gibt es aus, damit wir es in WASI-Laufzeiten ausführen können. (Normalerweise würde `_start` globale Initialisierungen vornehmen, aber hier brauchen wir keine, sodass es leer ist.)

### Eigene JavaScript-Ladeprogramme schreiben

Eine nette Sache an einer eigenständigen Wasm-Datei wie dieser ist, dass Sie eigenes, minimales JavaScript schreiben können, um es zu laden und auszuführen, je nach Anwendungsfall. Beispielsweise können wir dies in Node.js tun:

```js
// load-add.js
const binary = require(&apos;fs&apos;).readFileSync(&apos;add.wasm&apos;);

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

Nur 4 Zeilen! Das Ausführen davon gibt erwartungsgemäß `42` aus. Beachten Sie, dass dieses Beispiel sehr einfach ist, aber es gibt Fälle, in denen Sie einfach nicht viel JavaScript benötigen und möglicherweise besser abschneiden als die Standard-JavaScript-Laufzeit von Emscripten (die eine Vielzahl von Umgebungen und Optionen unterstützt). Ein reales Beispiel dafür findet sich in [zeux&apos; meshoptimizer](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js) – nur 57 Zeilen, einschließlich Speicherverwaltung, Wachstum usw.!

### Ausführung in Wasm-Laufzeiten

Eine weitere nette Sache an eigenständigen Wasm-Dateien ist, dass Sie sie in Wasm-Laufzeiten wie [wasmer](https://wasmer.io), [wasmtime](https://github.com/bytecodealliance/wasmtime) oder [WAVM](https://github.com/WAVM/WAVM) ausführen können. Betrachten Sie beispielsweise dieses Hello World:

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

Wir können das in einer beliebigen dieser Laufzeiten kompilieren und ausführen:

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

Emscripten verwendet so weit wie möglich WASI-APIs, sodass Programme wie dieses letztendlich zu 100 % WASI verwenden und in WASI-unterstützenden Laufzeiten ausgeführt werden können (siehe Anmerkungen darüber, welche Programme mehr als WASI benötigen).

### Erstellung von Wasm-Plugins

Abgesehen vom Web und dem Server ist ein spannender Bereich für Wasm **Plugins**. Beispielsweise könnte ein Bildbearbeitungsprogramm Wasm-Plugins haben, die Filter und andere Operationen auf dem Bild ausführen können. Für diese Art von Anwendungsfall möchten Sie eine eigenständige Wasm-Binärdatei, wie in den bisherigen Beispielen, aber mit einer passenden API für die Einbettung der Anwendung.

Plugins sind manchmal mit dynamischen Bibliotheken verbunden, da diese eine Möglichkeit zur Implementierung darstellen. Emscripten unterstützt dynamische Bibliotheken mit der [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking)-Option, und dies war eine Möglichkeit, Wasm-Plugins zu erstellen. Die hier beschriebene neue Standalone-Wasm-Option verbessert das in mehrere Richtungen: Erstens hat eine dynamische Bibliothek relocierbaren Speicher, was einen Overhead verursacht, wenn Sie ihn nicht benötigen (und Sie benötigen ihn nicht, wenn Sie das Wasm nach dem Laden nicht mit einem anderen Wasm verbinden). Zweitens ist der Standalone-Ausgang darauf ausgelegt, auch in Wasm-Runtimes ausgeführt zu werden, wie bereits erwähnt.

Okay, soweit so gut: Emscripten kann entweder wie immer JavaScript + WebAssembly ausgeben, und jetzt kann es auch nur WebAssembly allein ausgeben, sodass Sie es an Orten ausführen können, die nicht JavaScript haben, wie Wasm-Runtimes, oder Sie können Ihre eigene benutzerdefinierte JavaScript-Ladecode schreiben usw. Reden wir jetzt über den Hintergrund und die technischen Details!

## WebAssemblys zwei Standard-APIs

WebAssembly kann nur auf die APIs zugreifen, die es als Imports erhält - die Kern-Wasm-Spezifikation hat keine konkreten API-Details. Angesichts der aktuellen Entwicklung von Wasm scheint es, dass es drei Hauptkategorien von APIs geben wird, die Menschen importieren und verwenden:

- **Web-APIs**: Das verwenden Wasm-Programme im Web, dabei handelt es sich um die bestehenden standardisierten APIs, die JavaScript ebenfalls verwenden kann. Derzeit werden diese indirekt über JS-Glue-Code aufgerufen, aber in Zukunft mit [interface types](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md) werden sie direkt aufgerufen.
- **WASI-APIs**: WASI konzentriert sich auf die Standardisierung von APIs für Wasm auf dem Server.
- **Andere APIs**: Verschiedene benutzerdefinierte Einbettungen definieren ihre eigenen anwendungsspezifischen APIs. Zum Beispiel haben wir früher das Beispiel eines Bildeditors mit Wasm-Plugins gegeben, die eine API implementieren, um visuelle Effekte zu erzielen. Beachten Sie, dass ein Plugin möglicherweise auch Zugriff auf „System“-APIs hat, wie es eine native dynamische Bibliothek hätte, oder dass es sehr stark isoliert ist und überhaupt keine Imports hat (wenn die Einbettung lediglich ihre Methoden aufruft).

WebAssembly befindet sich in der interessanten Position, [zwei standardisierte Sets von APIs](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so) zu haben. Das macht Sinn, da eines fürs Web und eines für den Server ist, und diese Umgebungen haben unterschiedliche Anforderungen; Aus ähnlichen Gründen hat Node.js keine identischen APIs zu JavaScript im Web.

Es gibt jedoch mehr als das Web und den Server, insbesondere gibt es auch Wasm-Plugins. Zum einen können Plugins innerhalb einer Anwendung ausgeführt werden, die entweder im Web ist (wie [JS-Plugins](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)) oder außerhalb des Webs; zum anderen, unabhängig davon, wo die Einbettungsanwendung ist, ist eine Plugin-Umgebung weder eine Web- noch eine Serverumgebung. Es ist also nicht sofort offensichtlich, welche API-Sets verwendet werden - das könnte vom portierten Code, der eingebetteten Wasm-Laufzeit usw. abhängen.

## Lassen Sie uns so viel wie möglich vereinheitlichen

Eine konkrete Möglichkeit, wie Emscripten hier helfen kann, besteht darin, dass wir durch die Verwendung von WASI-APIs so viel wie möglich **unnötige** API-Unterschiede vermeiden können. Wie bereits erwähnt, greift Emscripten-Code im Web indirekt über JavaScript auf Web-APIs zu. Wenn diese JavaScript-API wie WASI aussehen könnte, würden wir einen unnötigen API-Unterschied beseitigen, und dasselbe Binary kann auch auf dem Server ausgeführt werden. Anders gesagt: Wenn Wasm einige Informationen protokollieren möchte, muss es in JS aufrufen, etwa so:

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` ist eine Implementierung der Linux-Syscall-Schnittstelle, die [musl libc](https://www.musl-libc.org) verwendet, um Daten in eine Datei zu schreiben, und die letztendlich `console.log` mit den richtigen Daten aufruft. Das Wasm-Modul importiert und ruft diese `musl_writev` auf, die eine ABI zwischen JS und Wasm definiert. Diese ABI ist willkürlich (und in der Tat hat Emscripten seine ABI im Laufe der Zeit geändert, um sie zu optimieren). Wenn wir das durch eine ABI ersetzen, die mit WASI übereinstimmt, können wir Folgendes erhalten:

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

Das ist keine große Veränderung, erfordert lediglich ein paar Refaktorisierungen der ABI, und beim Ausführen in einer JS-Umgebung spielt es nicht viel Rolle. Aber jetzt kann das Wasm ohne JS ausgeführt werden, da diese WASI-API von WASI-Runtimes erkannt wird! So funktionieren die früher genannten Standalone-Wasm-Beispiele, indem Emscripten einfach refaktoriert wird, um WASI-APIs zu verwenden.

Ein weiterer Vorteil der Verwendung von WASI-APIs durch Emscripten ist, dass wir der WASI-Spezifikation helfen können, indem wir reale Probleme finden. Zum Beispiel fanden wir heraus, dass [die Änderung der WASI-"whence"-Konstanten](https://github.com/WebAssembly/WASI/pull/106) nützlich wäre, und haben einige Diskussionen über [Codegröße](https://github.com/WebAssembly/WASI/issues/109) und [POSIX-Kompatibilität](https://github.com/WebAssembly/WASI/issues/122) begonnen.

Die Verwendung von WASI durch Emscripten so weit wie möglich ist auch hilfreich, da Benutzer einen einzigen SDK verwenden können, um Web-, Server- und Plugin-Umgebungen zu adressieren. Emscripten ist nicht das einzige SDK, das dies ermöglicht, da die Ausgabe des WASI-SDKs im Web mit der [WASI-Web-Polyfill](https://wasi.dev/polyfill/) oder Wasmers [wasmer-js](https://github.com/wasmerio/wasmer-js) ausgeführt werden kann, aber die Web-Ausgabe von Emscripten ist kompakter, sodass ein einziges SDK verwendet werden kann, ohne die Web-Leistung zu beeinträchtigen.

Übrigens, Sie können eine eigenständige Wasm-Datei mit optionalem JS mithilfe eines einzelnen Befehls aus Emscripten erstellen:

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

Dies erzeugt `add.js` und `add.wasm`. Die Wasm-Datei ist eigenständig, genau wie früher, als wir nur eine Wasm-Datei alleine erzeugt haben (`STANDALONE_WASM` wurde automatisch gesetzt, als wir `-o add.wasm` angaben). Jetzt gibt es zusätzlich eine JS-Datei, die sie laden und ausführen kann. Das JS ist nützlich, um es im Web auszuführen, falls Sie Ihr eigenes JS hierfür nicht schreiben möchten.

## Benötigen wir *nicht*-eigenständiges Wasm?

Warum gibt es die `STANDALONE_WASM`-Option? Theoretisch könnte Emscripten immer `STANDALONE_WASM` setzen, was einfacher wäre. Aber eigenständige Wasm-Dateien können nicht von JS abhängen, und das hat einige Nachteile:

- Wir können die Import- und Exportnamen von Wasm nicht minimieren, da die Minimierung nur funktioniert, wenn beide Seiten übereinstimmen, das Wasm und das, was es lädt.
- Normalerweise erzeugen wir den Wasm-Speicher in JS, damit JS während des Starts anfangen kann, ihn zu nutzen, was parallele Arbeit ermöglicht. Aber in eigenständigem Wasm müssen wir den Speicher im Wasm erzeugen.
- Einige APIs lassen sich einfach besser in JS implementieren. Zum Beispiel [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558), das aufgerufen wird, wenn eine C-Assertion fehlschlägt, wird normalerweise [in JS implementiert](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235). Es benötigt nur eine Zeile und selbst wenn man die JS-Funktionen mit einbezieht, die es aufruft, bleibt die Codegröße insgesamt recht klein. Andererseits können wir in einem eigenständigen Build nicht von JS abhängen, also verwenden wir [musls `assert.c`](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4). Dies benutzt `fprintf`, was bedeutet, dass es eine Vielzahl von C-`stdio`-Unterstützung einbindet, einschließlich indirekter Aufrufe, die es erschweren, unbenutzte Funktionen zu entfernen. Insgesamt gibt es viele solche Details, die am Ende einen Unterschied in der Gesamtdateigröße ausmachen.

Wenn Sie sowohl im Web als auch anderswo ausführen möchten und dabei 100 % optimale Codegröße und Startzeiten wünschen, sollten Sie zwei separate Builds erstellen, einen mit `-s STANDALONE` und einen ohne. Das ist sehr einfach, da es nur das Umschalten einer Option ist!

## Notwendige API-Unterschiede

Wir haben gesehen, dass Emscripten WASI-APIs so weit wie möglich verwendet, um **unnötige** API-Unterschiede zu vermeiden. Gibt es irgendwelche **notwendigen**? Leider ja - einige WASI-APIs erfordern Kompromisse. Zum Beispiel:

- WASI unterstützt verschiedene POSIX-Funktionen nicht, wie [Benutzer-/Gruppen-/Welt-Dateiberechtigungen](https://github.com/WebAssembly/WASI/issues/122), wodurch Sie beispielsweise kein vollständiges (Linux-)System `ls` implementieren können (siehe Details in diesem Link). Emscriptens existierende Dateisystem-Ebene unterstützt einige dieser Dinge, also würden wir [etwas POSIX-Unterstützung verlieren](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711), wenn wir auf WASI-APIs für alle Dateisystemoperationen umstellen würden.
- WASIs `path_open` [hat Kosten in Bezug auf die Codegröße](https://github.com/WebAssembly/WASI/issues/109), weil es zusätzliche Berechtigungshandhabung direkt im Wasm erzwingt. Dieser Code ist im Web unnötig.
- WASI bietet keine [Benachrichtigungs-API für Speicherwachstum](https://github.com/WebAssembly/WASI/issues/82), und daher müssen JS-Laufzeiten ständig überprüfen, ob der Speicher gewachsen ist, und ihre Ansichten bei jedem Import und Export aktualisieren. Um diesen Overhead zu vermeiden, bietet Emscripten eine Benachrichtigungs-API, `emscripten_notify_memory_growth`, die [man in einer einzigen Zeile implementiert sehen kann](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10) in zeuxs meshoptimizer, den wir früher erwähnten.

Mit der Zeit könnte WASI weitere POSIX-Unterstützung, eine Benachrichtigung bei Speicherwachstum usw. hinzufügen - WASI ist noch hochgradig experimentell und wird voraussichtlich erheblich verändert werden. Für den Moment, um Rückschritte in Emscripten zu vermeiden, erzeugen wir keine 100% WASI-Binaries, wenn Sie bestimmte Funktionen verwenden. Insbesondere wird beim Öffnen von Dateien eine POSIX-Methode anstelle von WASI verwendet, was bedeutet, dass, wenn Sie `fopen` aufrufen, die resultierende Wasm-Datei nicht 100% WASI ist - jedoch, wenn Sie nur `printf` verwenden, das auf dem bereits geöffneten `stdout` operiert, dann wird es 100% WASI sein, wie in dem „Hello World“-Beispiel, das wir am Anfang gesehen haben, wo Emscriptens Ausgabe in WASI-Laufzeiten funktioniert.

Wenn dies für Benutzer hilfreich wäre, könnten wir eine `PURE_WASI`-Option hinzufügen, die Codegröße opfert, um strenge WASI-Kompatibilität zu gewährleisten. Aber falls das nicht dringend ist (und die meisten bisher gesehenen Plugin-Anwendungsfälle benötigen keinen vollständigen Datei-I/O), könnten wir warten, bis WASI sich so weit verbessert, dass Emscripten diese nicht-WASI-APIs entfernen kann. Das wäre das bestmögliche Ergebnis, und wir arbeiten darauf hin, wie Sie in den oben genannten Links sehen können.

Jedoch, selbst wenn WASI verbessert wird, lässt sich nicht vermeiden, dass Wasm, wie bereits erwähnt, zwei standardisierte APIs besitzt. Ich erwarte, dass Emscripten in Zukunft Web-APIs direkt über Interface-Typen aufruft, da dies kompakter wäre, als zuerst eine WASI-ähnliche JS-API aufzurufen, die anschließend eine Web-API aufruft (wie im `musl_writev`-Beispiel zuvor). Wir könnten hier eine Polyfill- oder Übersetzungsschicht irgendeiner Art verwenden, aber wir möchten diese nicht unnötig einsetzen, weswegen wir separate Builds für Web- und WASI-Umgebungen benötigen. (Das ist etwas unglücklich; theoretisch hätte man dies vermeiden können, wenn WASI ein Superset der Web-APIs wäre, aber offensichtlich hätte das Kompromisse auf der Serverseite bedeutet.)

## Aktueller Status

Schon jetzt funktioniert vieles! Die Hauptbeschränkungen sind:

- **WebAssembly-Einschränkungen**: Verschiedene Funktionen, wie C++-Ausnahmen, setjmp und pthreads, hängen aufgrund der Einschränkungen von Wasm von JavaScript ab, und es gibt noch keinen guten Ersatz ohne JS. (Emscripten könnte anfangen, einige davon [mit Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s) zu unterstützen, oder wir warten einfach auf [native Wasm-Funktionen](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md), die in VMs integriert werden.)
- **WASI-Einschränkungen**: Bibliotheken und APIs wie OpenGL und SDL haben noch keine entsprechenden WASI-APIs.

Sie **können** all diese Dinge dennoch im Standalone-Modus von Emscripten verwenden, aber die Ausgabe wird Aufrufe an JS-Runtime-Unterstützungscode enthalten. Dadurch ist die Ausgabe nicht zu 100 % WASI (aus ähnlichen Gründen funktionieren diese Funktionen auch nicht im WASI SDK). Diese Wasm-Dateien können nicht in WASI-Runtimes ausgeführt werden, aber Sie können sie im Web verwenden und Ihre eigene JS-Runtime dafür schreiben. Sie können sie auch als Plugins verwenden; beispielsweise könnte eine Spiel-Engine Plugins haben, die mit OpenGL rendern, und der Entwickler würde diese im Standalone-Modus kompilieren und anschließend die OpenGL-Imports in der Wasm-Runtime der Engine implementieren. Der Standalone-Wasm-Modus hilft hier immer noch, da er die Ausgabe so unabhängig macht, wie Emscripten es ermöglichen kann.

Sie könnten auch auf APIs stoßen, die **eine Nicht-JS-Alternative** haben, die wir noch nicht konvertiert haben, da die Arbeit noch im Gange ist. Bitte [reizt Fehler an](https://github.com/emscripten-core/emscripten/issues), und wie immer ist Hilfe willkommen!
