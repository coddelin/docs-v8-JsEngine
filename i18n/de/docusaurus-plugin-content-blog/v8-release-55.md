---
title: "V8-Version v5.5"
author: "das V8-Team"
date: "2016-10-24 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v5.5 bietet reduzierte Speicherauslastung und erweiterte Unterstützung für ECMAScript-Sprachfunktionen."
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vor einer Chrome-Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch [V8-Version 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5) bekannt zu geben, der bis zur Freigabe in Kombination mit Chrome 55 Stable in einigen Wochen in der Beta-Phase sein wird. V8 v5.5 ist voller neuer Funktionen für Entwickler, und wir möchten Ihnen einen Vorgeschmack auf einige Highlights geben, die in der Veröffentlichung enthalten sind.

<!--truncate-->
## Sprachfunktionen

### Asynchrone Funktionen

In v5.5 führt V8 die JavaScript ES2017 [async Funktionen](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) ein, die das Schreiben von Code, der Promises nutzt und erstellt, erleichtern. Mit asynchronen Funktionen ist das Warten auf die Auflösung eines Promises so einfach wie das Tippen von await davor und das Fortfahren, als ob der Wert synchron verfügbar wäre - keine Rückruffunktionen erforderlich. Lesen Sie [diesen Artikel](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions) als Einführung.

Hier ist ein Beispiel einer Funktion, die eine URL abruft und den Text der Antwort zurückgibt, geschrieben im typischen asynchronen, Promise-basierten Stil.

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('Abruf fehlgeschlagen', err);
    });
}
```

Hier ist derselbe Code, um Rückruffunktionen zu entfernen, mit async Funktionen neu geschrieben.

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('Abruf fehlgeschlagen', err);
  }
}
```

## Leistungsverbesserungen

V8 v5.5 bietet eine Reihe von wichtigen Verbesserungen des Speicherverbrauchs.

### Speicher

Die Speicherauslastung ist eine wichtige Dimension im Performance-Trade-off-Bereich der JavaScript-VM. In den letzten Versionen hat das V8-Team die Speicherauslastung mehrerer Websites analysiert und erheblich reduziert, die als repräsentativ für moderne Webentwicklungsstile identifiziert wurden. V8 5.5 reduziert den gesamten Speicherverbrauch von Chrome um bis zu 35 % auf **Geräten mit geringem Speicher** (verglichen mit V8 5.3 in Chrome 53) aufgrund von Reduzierungen der V8-Heap-Größe und der Zonenspeicher-Nutzung. Auch andere Gerätetypen profitieren von den Reduzierungen der Zonenspeicher-Nutzung. Bitte lesen Sie den [dedizierten Blog-Post](/blog/optimizing-v8-memory), um einen detaillierten Überblick zu erhalten.

## V8-API

Bitte werfen Sie einen Blick auf unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

### V8-Inspector migriert

Der V8-Inspector wurde von Chromium zu V8 migriert. Der Inspector-Code befindet sich jetzt vollständig im [V8-Repository](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/).

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.5 -t branch-heads/5.5` verwenden, um die neuen Funktionen in V8 5.5 auszuprobieren. Alternativ können Sie sich für [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und bald die neuen Funktionen selbst ausprobieren.
