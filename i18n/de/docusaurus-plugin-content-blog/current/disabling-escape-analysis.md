---
title: &apos;Vorübergehende Deaktivierung der Escape-Analyse&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)), Sandbox-Escape-Analytiker&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-22 13:33:37
tags:
  - sicherheit
description: &apos;Wir haben die Escape-Analyse von V8 in Chrome 61 deaktiviert, um Benutzer vor einer Sicherheitslücke zu schützen.&apos;
tweet: &apos;911339802884284416&apos;
---
In JavaScript _entweicht_ ein zugewiesenes Objekt, wenn es von außerhalb der aktuellen Funktion zugänglich ist. Normalerweise weist V8 neue Objekte auf dem JavaScript-Heap zu, aber mithilfe der _Escape-Analyse_ kann ein optimierender Compiler feststellen, wann ein Objekt speziell behandelt werden kann, da seine Lebensdauer nachweislich an die Aktivierung der Funktion gebunden ist. Wenn die Referenz zu einem neu zugewiesenen Objekt die Funktion, die es erstellt, nicht verlässt, müssen JavaScript-Engines das Objekt nicht explizit auf dem Heap zuweisen. Sie können stattdessen die Werte des Objekts effektiv als lokale Variablen der Funktion behandeln. Dies ermöglicht wiederum verschiedene Optimierungen, wie das Speichern dieser Werte auf dem Stack oder in Registern oder in einigen Fällen das vollständige Weglassen der Werte. Objekte, die entweichen (genauer gesagt, Objekte, bei denen nicht bewiesen werden kann, dass sie nicht entweichen), müssen auf dem Heap zugewiesen werden.

<!--truncate-->
Zum Beispiel ermöglicht die Escape-Analyse V8, den folgenden Code effektiv umzuschreiben:

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // Hinweis: `object` entweicht nicht.
}
```

…in diesen Code, der verschiedene Optimierungen unter der Haube ermöglicht:

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 und ältere Versionen verwendeten eine Escape-Analyse-Implementierung, die komplex war und seit ihrer Einführung viele Fehler generierte. Diese Implementierung wurde mittlerweile entfernt, und eine komplett neue Escape-Analyse-Codebasis ist in [V8 v6.2](/blog/v8-release-62) verfügbar.

Es wurde jedoch [eine Sicherheitslücke in Chrome](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html) entdeckt und verantwortungsvoll offengelegt, die die alte Escape-Analyse-Implementierung in V8 v6.1 betrifft. Um unsere Benutzer zu schützen, haben wir die Escape-Analyse in Chrome 61 deaktiviert. Node.js sollte nicht betroffen sein, da der Exploit davon abhängt, dass nicht vertrauenswürdige JavaScript ausgeführt wird.

Das Deaktivieren der Escape-Analyse wirkt sich negativ auf die Leistung aus, da die oben genannten Optimierungen deaktiviert werden. Insbesondere könnten die folgenden ES2015-Features vorübergehend langsamer werden:

- Destrukturierung
- `for`-`of`-Iteration
- Array Spread
- Rest-Parameter

Beachten Sie, dass die Deaktivierung der Escape-Analyse nur eine vorübergehende Maßnahme ist. Mit Chrome 62 liefern wir die brandneue — und vor allem aktivierte — Implementierung der Escape-Analyse, wie sie in V8 v6.2 zu sehen ist.
