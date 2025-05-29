---
title: "Importattribute"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2024-01-31
tags:
  - ECMAScript
description: "Importattribute: die Entwicklung von Import Assertions"
tweet: ""
---

## Bisher

V8 hat die Funktion [Import Assertions](https://chromestatus.com/feature/5765269513306112) in Version 9.1 veröffentlicht. Diese Funktion erlaubte es Importanweisungen für Module, zusätzliche Informationen mit dem Schlüsselwort `assert` hinzuzufügen. Diese zusätzlichen Informationen werden aktuell verwendet, um JSON- und CSS-Module innerhalb von JavaScript-Modulen zu importieren.

<!--truncate-->
## Importattribute

Seitdem hat sich Import Assertions zu [Importattribute](https://github.com/tc39/proposal-import-attributes) weiterentwickelt. Der Zweck der Funktion bleibt derselbe: Es soll Importanweisungen für Module ermöglichen, zusätzliche Informationen hinzuzufügen.

Der wichtigste Unterschied besteht darin, dass Import Assertions nur eine rein assert-basierte Semantik hatten, während Importattribute eine entspanntere Semantik aufweisen. Eine rein assert-basierte Semantik bedeutet, dass die zusätzlichen Informationen keinen Einfluss darauf haben, _wie_ ein Modul geladen wird, sondern nur darauf, _ob_ es geladen wird. Zum Beispiel wird ein JSON-Modul immer als JSON-Modul aufgrund seines MIME-Typs geladen, und die Klausel `assert { type: 'json' }` kann nur zu einem Ladefehler führen, wenn der MIME-Typ des angeforderten Moduls nicht `application/json` ist.

Allerdings hatte die rein assert-basierte Semantik einen grundlegenden Fehler. Im Web unterscheidet sich die Form von HTTP-Anfragen je nach der Art der angeforderten Ressource. Beispielsweise beeinflusst der [`Accept`-Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept) den MIME-Typ der Antwort, und der [`Sec-Fetch-Dest`-Metaheader](https://web.dev/articles/fetch-metadata) beeinflusst, ob der Webserver die Anfrage akzeptiert oder ablehnt. Da ein Import-Assertion keinen Einfluss darauf hatte, _wie_ ein Modul geladen wird, konnte es die Form der HTTP-Anfrage nicht ändern. Die Art der angeforderten Ressource beeinflusst auch, welche [Content-Security-Richtlinien](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) verwendet werden: Import Assertions konnten nicht korrekt mit dem Sicherheitsmodell des Webs arbeiten.

Importattribute entspannen die rein assert-basierte Semantik, um den Attributen zu erlauben, zu beeinflussen, wie ein Modul geladen wird. Mit anderen Worten, Importattribute können HTTP-Anfragen generieren, die die passenden `Accept`- und `Sec-Fetch-Dest`-Header enthalten. Um die Syntax an die neue Semantik anzupassen, wird das alte Schlüsselwort `assert` durch `with` ersetzt:

```javascript
// main.mjs
//
// Neue 'with'-Syntax.
import json from './foo.json' with { type: 'json' };
console.log(json.answer); // 42
```

## Dynamisches `import()`

Ähnlich wird [dynamisches `import()`](https://v8.dev/features/dynamic-import#dynamic) ebenfalls aktualisiert, um eine `with`-Option zu akzeptieren.

```javascript
// main.mjs
//
// Neue 'with'-Option.
const jsonModule = await import('./foo.json', {
  with: { type: 'json' }
});
console.log(jsonModule.default.answer); // 42
```

## Verfügbarkeit von `with`

Importattribute sind standardmäßig in V8 v12.3 aktiviert.

## Außerkraftsetzung und zukünftige Entfernung von `assert`

Das Schlüsselwort `assert` ist seit V8 v12.3 veraltet und soll mit Version 12.6 entfernt werden. Bitte verwenden Sie `with` statt `assert`! Die Verwendung der `assert`-Klausel wird eine Warnung in der Konsole ausgeben, die zur Verwendung von `with` auffordert.

## Unterstützung für Importattribute

<feature-support chrome="123 https://chromestatus.com/feature/5205869105250304"
                 firefox="no"
                 safari="17.2 https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes"
                 nodejs="20.10 https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes"
                 babel="yes https://babeljs.io/blog/2023/05/26/7.22.0#import-attributes-15536-15620"></feature-support>
