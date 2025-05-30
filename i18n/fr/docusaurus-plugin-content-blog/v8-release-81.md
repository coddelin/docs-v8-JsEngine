---
title: "Publication de V8 version 8.1"
author: "Dominik Inführ, l'homme international de mystère"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - sortie
description: "V8 v8.1 offre un support international amélioré grâce à la nouvelle API Intl.DisplayNames."
---

Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du dépôt maître Git de V8 immédiatement avant une étape de Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre toute nouvelle branche, [V8 version 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), qui est en phase bêta jusqu'à sa sortie simultanée avec Chrome 81 Stable dans plusieurs semaines. V8 v8.1 regorge de trésors à destination des développeurs. Ce post propose un aperçu de certains des points forts en prévision de sa publication.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

La nouvelle API `Intl.DisplayNames` permet aux programmeurs d'afficher aisément les noms traduits de langues, régions, scripts et devises.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → 'Français'
enRegionNames.of('US');
// → 'États-Unis'
itScriptNames.of('Latn');
// → 'latino'
deCurrencyNames.of('JPY');
// → 'Yen Japonais'
```

Déchargez dès aujourd'hui la maintenance des données de traduction sur le runtime ! Consultez [notre explication des fonctionnalités](https://v8.dev/features/intl-displaynames) pour des détails sur l'API complète et d'autres exemples.

## API V8

Veuillez utiliser `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` pour obtenir une liste des changements de l'API.

Les développeurs avec un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 8.1 -t branch-heads/8.1` pour expérimenter les nouvelles fonctionnalités de V8 v8.1. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
