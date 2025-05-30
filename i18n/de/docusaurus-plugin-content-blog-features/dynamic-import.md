---
title: "Dynamisches `import()`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-11-21
tags: 
  - ECMAScript
  - ES2020
description: "Dynamisches import() eröffnet neue Möglichkeiten im Vergleich zum statischen Import. Dieser Artikel vergleicht beide und gibt einen Überblick über die neuen Funktionen."
tweet: "932914724060254208"
---
[Dynamisches `import()`](https://github.com/tc39/proposal-dynamic-import) führt eine neue, funktionsähnliche Form von `import` ein, die im Vergleich zum statischen `import` neue Möglichkeiten bietet. Dieser Artikel vergleicht beide und gibt einen Überblick über die neuen Funktionen.

<!--truncate-->
## Statisches `import` (Rückblick)

Chrome 61 wurde mit Unterstützung für die ES2015 `import`-Anweisung innerhalb von [Modulen](/features/modules) ausgeliefert.

Betrachten Sie das folgende Modul, das unter `./utils.mjs` gespeichert ist:

```js
// Standard-Export
export default () => {
  console.log('Hallo vom Standard-Export!');
};

// Benannter Export `doStuff`
export const doStuff = () => {
  console.log('Sachen erledigen…');
};
```

So können Sie das Modul `./utils.mjs` statisch importieren und verwenden:

```html
<script type="module">
  import * as module from './utils.mjs';
  module.default();
  // → logs 'Hallo vom Standard-Export!'
  module.doStuff();
  // → logs 'Sachen erledigen…'
</script>
```

:::note
**Hinweis:** Das vorherige Beispiel verwendet die `.mjs`-Erweiterung, um zu signalisieren, dass es sich um ein Modul handelt und nicht um ein reguläres Skript. Im Web spielen Dateierweiterungen keine wirkliche Rolle, solange die Dateien mit dem richtigen MIME-Typ (z. B. `text/javascript` für JavaScript-Dateien) im `Content-Type`-HTTP-Header bereitgestellt werden.

Die `.mjs`-Erweiterung ist besonders nützlich auf anderen Plattformen wie [Node.js](https://nodejs.org/api/esm.html#esm_enabling) und [`d8`](/docs/d8), wo es kein Konzept von MIME-Typen oder anderen obligatorischen Hooks wie `type="module"` gibt, um festzustellen, ob es sich um ein Modul oder ein reguläres Skript handelt. Wir verwenden hier dieselbe Erweiterung, um Konsistenz über Plattformen hinweg zu gewährleisten und deutliche Unterschiede zwischen Modulen und regulären Skripten zu machen.
:::

Diese syntaktische Form des Modulimports ist eine *statische* Deklaration: Sie akzeptiert nur ein Zeichenliteral als Modulspezifizierer und führt Bindungen in den lokalen Geltungsbereich über einen Vor-Runtime-Verknüpfungsprozess ein. Die statische `import`-Syntax kann nur auf der obersten Ebene der Datei verwendet werden.

Statisches `import` ermöglicht wichtige Anwendungsfälle wie statische Analyse, Bündelwerkzeuge und Tree-Shaking.

In einigen Fällen ist es nützlich:

- ein Modul nach Bedarf (oder bedingt) zu importieren
- den Modulspezifizierer zur Laufzeit zu berechnen
- ein Modul aus einem regulären Skript (im Gegensatz zu einem Modul) zu importieren

Keine dieser Fälle sind mit statischem `import` möglich.

## Dynamisches `import()` 🔥

[Dynamisches `import()`](https://github.com/tc39/proposal-dynamic-import) führt eine neue, funktionsähnliche Form von `import` ein, die diese Anwendungsfälle unterstützt. `import(moduleSpecifier)` gibt ein Versprechen für das Modul-Namespace-Objekt des angeforderten Moduls zurück, das nach dem Abrufen, Instanziieren und Bewerten aller Abhängigkeiten des Moduls sowie des Moduls selbst erstellt wird.

So können Sie das Modul `./utils.mjs` dynamisch importieren und verwenden:

```html
<script type="module">
  const moduleSpecifier = './utils.mjs';
  import(moduleSpecifier)
    .then((module) => {
      module.default();
      // → logs 'Hallo vom Standard-Export!'
      module.doStuff();
      // → logs 'Sachen erledigen…'
    });
</script>
```

Da `import()` ein Versprechen zurückgibt, ist es möglich, `async`/`await` anstelle des `then`-basierten Callback-Stils zu verwenden:

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './utils.mjs';
    const module = await import(moduleSpecifier)
    module.default();
    // → logs 'Hallo vom Standard-Export!'
    module.doStuff();
    // → logs 'Sachen erledigen…'
  })();
</script>
```

:::note
**Hinweis:** Obwohl `import()` _wie_ ein Funktionsaufruf aussieht, wird es als *Syntax* spezifiziert, die zufällig Klammern verwendet (ähnlich wie [`super()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super)). Das bedeutet, dass `import` nicht von `Function.prototype` erbt, sodass Sie es weder `call` noch `apply` können, und Dinge wie `const importAlias = import` funktionieren nicht — tatsächlich ist `import` nicht einmal ein Objekt! Dies ist jedoch in der Praxis nicht wirklich relevant.
:::

Hier ist ein Beispiel dafür, wie dynamisches `import()` das Lazy-Loading von Modulen bei der Navigation in einer kleinen Single-Page-Anwendung ermöglicht:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>Meine Bibliothek</title>
<nav>
  <a href="books.html" data-entry-module="books">Bücher</a>
  <a href="movies.html" data-entry-module="movies">Filme</a>
  <a href="video-games.html" data-entry-module="video-games">Videospiele</a>
</nav>
<main>Dies ist ein Platzhalter für den Inhalt, der bei Bedarf geladen wird.</main>
<script>
  const main = document.querySelector('main');
  const links = document.querySelectorAll('nav > a');
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const module = await import(`/${link.dataset.entryModule}.mjs`);
        // Das Modul exportiert eine Funktion namens `loadPageInto`.
        module.loadPageInto(main);
      } catch (error) {
        main.textContent = error.message;
      }
    });
  }
</script>
```

Die durch dynamisches `import()` aktivierten Lazy-Loading-Fähigkeiten können bei korrekter Anwendung äußerst leistungsstark sein. Zum Demonstrationszweck hat [Addy](https://twitter.com/addyosmani) [ein Beispiel einer Hacker News PWA](https://hnpwa-vanilla.firebaseapp.com/) geändert, die anfangs alle ihre Abhängigkeiten, einschließlich Kommentare, statisch importierte. [Die aktualisierte Version](https://dynamic-import.firebaseapp.com/) nutzt dynamisches `import()`, um Kommentare nach Bedarf zu laden. Dadurch werden die Lade-, Parse- und Kompilierungskosten vermieden, bis der Benutzer sie wirklich benötigt.

:::note
**Hinweis:** Wenn Ihre App Skripte von einer anderen Domain importiert (entweder statisch oder dynamisch), müssen diese Skripte mit gültigen CORS-Headern (wie `Access-Control-Allow-Origin: *`) zurückgegeben werden. Dies liegt daran, dass im Gegensatz zu regulären Skripten Modulskripte (und deren Importe) mit CORS abgerufen werden.
:::

## Empfehlungen

Sowohl statisches `import` als auch dynamisches `import()` sind nützlich. Beide haben ihre eigenen, sehr unterschiedlichen Anwendungsfälle. Verwenden Sie statische `import`s für anfängliche Abhängigkeitsladevorgänge, insbesondere für Inhalte oberhalb der Falte. In anderen Fällen sollten Sie das Laden von Abhängigkeiten nach Bedarf mit dynamischem `import()` in Betracht ziehen.

## Unterstützung für dynamisches `import()`

<feature-support chrome="63"
                 firefox="67"
                 safari="11.1"
                 nodejs="13.2 https://nodejs.medium.com/announcing-core-node-js-support-for-ecmascript-modules-c5d6dc29b663"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import"></feature-support>
