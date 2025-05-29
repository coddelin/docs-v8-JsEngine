---
title: "V8-Version v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), steht inline"
avatars:
 - "ingvar-stepanyan"
date: 2021-03-17
tags:
 - Veröffentlichung
description: "Die V8-Version v9.0 bringt Unterstützung für RegExp-Match-Indizes und verschiedene Leistungsverbesserungen."
tweet: "1372227274712494084"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus V8s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0), ankündigen zu können, der bis zur Veröffentlichung in Zusammenarbeit mit Chrome 90 Stable in einigen Wochen in der Beta-Version bleibt. V8 v9.0 ist vollgepackt mit allerlei Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige der Highlights zur Vorbereitung auf die Veröffentlichung.

<!--truncate-->
## JavaScript

### RegExp-Match-Indizes

Ab Version 9.0 können Entwickler optional ein Array mit den Start- und Endpositionen der übereinstimmenden Erfassungsgruppen in regulären Ausdrucks-Matches erhalten. Dieses Array ist über die Eigenschaft `.indices` von Match-Objekten verfügbar, wenn der reguläre Ausdruck das `/d`-Flag hat.

```javascript
const re = /(a)(b)/d;      // Beachten Sie das /d-Flag.
const m = re.exec('ab');
console.log(m.indices[0]); // Index 0 ist das gesamte Match.
// → [0, 2]
console.log(m.indices[1]); // Index 1 ist die 1. Erfassungsgruppe.
// → [0, 1]
console.log(m.indices[2]); // Index 2 ist die 2. Erfassungsgruppe.
// → [1, 2]
```

Bitte lesen Sie [unsere Erklärung](https://v8.dev/features/regexp-match-indices) für einen ausführlichen Überblick.

### Schnellere `super`-Eigenschaftszugriffe

Der Zugriff auf `super`-Eigenschaften (z. B. `super.x`) wurde durch die Nutzung des Inline-Cache-Systems von V8 und die optimierte Codegenerierung in TurboFan optimiert. Mit diesen Änderungen ist der Zugriff auf `super`-Eigenschaften nun näher am normalen Eigenschaftszugriff, wie in den unten stehenden Diagrammen zu sehen ist.

![Vergleich des Zugriffs auf super-Eigenschaften mit normalem Eigenschaftszugriff, optimiert](/_img/fast-super/super-opt.svg)

Bitte lesen Sie [den ausführlichen Blogbeitrag](https://v8.dev/blog/fast-super) für weitere Details.

### `for ( async of` nicht mehr erlaubt

Eine [Grammatik-Unklarheit](https://github.com/tc39/ecma262/issues/2034) wurde kürzlich entdeckt und in V8 v9.0 [behoben](https://chromium-review.googlesource.com/c/v8/v8/+/2683221).

Die Token-Sequenz `for ( async of` wird jetzt nicht mehr analysiert.

## WebAssembly

### Schnellere JS-zu-Wasm-Aufrufe

V8 verwendet unterschiedliche Darstellungen für die Parameter von WebAssembly- und JavaScript-Funktionen. Deshalb wird beim Aufruf einer exportierten WebAssembly-Funktion aus JavaScript der Aufruf durch eine sogenannte *JS-zu-Wasm-Wrapper*-Funktion geleitet, die für die Anpassung von Parametern zwischen JavaScript und WebAssembly sowie für die entgegengesetzte Anpassung der Ergebnisse verantwortlich ist.

Dies führt jedoch zu Leistungseinbußen, weshalb Aufrufe von JavaScript zu WebAssembly nicht so schnell waren wie Aufrufe von JavaScript zu JavaScript. Um diesen Overhead zu minimieren, kann die JS-zu-Wasm-Wrapper-Funktion jetzt direkt am Aufrufpunkt eingebettet werden, wodurch der Code vereinfacht und dieses zusätzliche Frame entfernt wird.

Angenommen, wir haben eine WebAssembly-Funktion, die zwei Double-Floating-Point-Zahlen addiert, wie diese:

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

und wir rufen diese Funktion aus JavaScript auf, um einige Vektoren (als typisierte Arrays dargestellt) zu addieren:

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// Aufwärmen.
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// Messen.
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

Bei diesem vereinfachten Mikro-Benchmark sehen wir folgende Verbesserungen:

![Vergleich der Mikrobenchmarks](/_img/v8-release-90/js-to-wasm.svg)

Die Funktion ist noch experimentell und kann mit dem Flag `--turbo-inline-js-wasm-calls` aktiviert werden.

Für weitere Details siehe [das Design-Dokument](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit).

## V8 API

Bitte verwenden Sie `git log branch-heads/8.9..branch-heads/9.0 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 9.0 -t branch-heads/9.0` verwenden, um die neuen Funktionen in V8 v9.0 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html), um die neuen Funktionen bald selbst auszuprobieren.
