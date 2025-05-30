---
title: "`Intl.ListFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) und Frank Yung-Fong Tang"
avatars: 
  - "mathias-bynens"
  - "frank-tang"
date: 2018-12-18
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Die Intl.ListFormat-API ermöglicht die lokalisierte Formatierung von Listen, ohne die Leistung zu beeinträchtigen."
tweet: "1074966915557351424"
---
Moderne Webanwendungen verwenden oft Listen mit dynamischen Daten. Zum Beispiel könnte eine Fotoanzeige-App etwas wie das Folgende darstellen:

> Dieses Foto beinhaltet **Ada, Edith, _und_ Grace**.

Ein textbasiertes Spiel könnte eine andere Art von Liste haben:

> Wähle deine Superkraft: **Unsichtbarkeit, Psychokinese, _oder_ Empathie**.

Da jede Sprache unterschiedliche Listformatierungsgewohnheiten und Wörter hat, ist die Implementierung eines lokalisierten Listenformatierers nicht trivial. Dies erfordert nicht nur eine Liste aller Wörter (wie „und“ oder „oder“ in den obigen Beispielen) für jede unterstützte Sprache – zusätzlich müssen auch die genauen Formatierungsgewohnheiten für all diese Sprachen kodiert werden! [Das Unicode CLDR](http://cldr.unicode.org/translation/lists) stellt diese Daten bereit, aber um sie in JavaScript zu verwenden, müssen sie eingebettet und zusammen mit anderem Bibliothekscode ausgeliefert werden. Leider erhöht dies die Paketgröße solcher Bibliotheken, was sich negativ auf Ladezeiten, Parser-/Kompilierungskosten und Speicherverbrauch auswirkt.

<!--truncate-->
Die brandneue `Intl.ListFormat`-API verlagert diese Last auf die JavaScript-Engine, die die lokalen Daten ausliefern und direkt JavaScript-Entwicklern zur Verfügung stellen kann. `Intl.ListFormat` ermöglicht die lokalisierte Formatierung von Listen, ohne die Leistung zu beeinträchtigen.

## Beispielanwendungen

Das folgende Beispiel zeigt, wie man einen Listenformatierer für Konjunktionen mit der englischen Sprache erstellt:

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

Disjunktionen („oder“ im Englischen) werden ebenfalls durch den optionalen `options`-Parameter unterstützt:

```js
const lf = new Intl.ListFormat('en', { type: 'disjunction' });
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank or Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, or Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, or Harrison'
```

Hier ist ein Beispiel für die Verwendung einer anderen Sprache (Chinesisch mit dem Sprachcode `zh`):

```js
const lf = new Intl.ListFormat('zh');
lf.format(['永鋒']);
// → '永鋒'
lf.format(['永鋒', '新宇']);
// → '永鋒和新宇'
lf.format(['永鋒', '新宇', '芳遠']);
// → '永鋒、新宇和芳遠'
lf.format(['永鋒', '新宇', '芳遠', '澤遠']);
// → '永鋒、新宇、芳遠和澤遠'
```

Der `options`-Parameter ermöglicht fortgeschrittenere Anwendungen. Hier ist ein Überblick über die verschiedenen Optionen und ihre Kombinationen sowie darüber, wie sie den Listenmustern entsprechen, die von [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns) definiert sind:


| Typ                   | Optionen                                    | Beschreibung                                                                                     | Beispiele                         |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| Standard (oder kein Typ) | `{}` (Standard)                            | Eine typische „und“-Liste für beliebige Platzhalter                                             | `'Januar, Februar, und März'` |
| oder                 | `{ type: 'disjunction' }`                 | Eine typische „oder“-Liste für beliebige Platzhalter                                            | `'Januar, Februar, oder März'` |
| Einheit              | `{ type: 'unit' }`                        | Eine Liste, die für breite Einheiten geeignet ist                                                | `'3 Fuß, 7 Zoll'`                |
| unit-kurz            | `{ type: 'unit', style: 'short' }`        | Eine Liste, die für kurze Einheiten geeignet ist                                                 | `'3 ft, 7 in'`                   |
| unit-schmal          | `{ type: 'unit', style: 'narrow' }`       | Eine Liste, die für schmale Einheiten geeignet ist, wenn der Platz auf dem Bildschirm sehr begrenzt ist  | `'3′ 7″'`                        |


Beachten Sie, dass es in vielen Sprachen (wie Englisch) möglicherweise keinen Unterschied zwischen vielen dieser Listen gibt. In anderen können sich der Abstand, die Länge oder das Vorhandensein einer Konjunktion und die Trennzeichen ändern.

## Fazit

Da die `Intl.ListFormat`-API immer breiter verfügbar wird, werden Bibliotheken ihre Abhängigkeit von fest codierten CLDR-Datenbanken zugunsten der nativen Listenformatierungsfunktionalität aufgeben, wodurch die Ladezeit-, Parse- und Kompilierungszeit-, Laufzeitleistung sowie die Speichernutzung verbessert werden.

## Unterstützung für `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="nicht unterstützt"
                 safari="nicht unterstützt"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="nicht unterstützt"></feature-support>
