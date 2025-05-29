---
title: &apos;Publication de V8 version 8.1&apos;
author: &apos;Dominik Inführ, l&apos;homme international de mystère&apos;
avatars:
  - &apos;dominik-infuehr&apos;
date: 2020-02-25
tags:
  - sortie
description: &apos;V8 v8.1 offre un support international amélioré grâce à la nouvelle API Intl.DisplayNames.&apos;
---

Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du dépôt maître Git de V8 immédiatement avant une étape de Chrome Beta. Aujourd&apos;hui, nous sommes heureux d&apos;annoncer notre toute nouvelle branche, [V8 version 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), qui est en phase bêta jusqu&apos;à sa sortie simultanée avec Chrome 81 Stable dans plusieurs semaines. V8 v8.1 regorge de trésors à destination des développeurs. Ce post propose un aperçu de certains des points forts en prévision de sa publication.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

La nouvelle API `Intl.DisplayNames` permet aux programmeurs d&apos;afficher aisément les noms traduits de langues, régions, scripts et devises.

```js
const zhLanguageNames = new Intl.DisplayNames([&apos;zh-Hant&apos;], { type: &apos;language&apos; });
const enRegionNames = new Intl.DisplayNames([&apos;en&apos;], { type: &apos;region&apos; });
const itScriptNames = new Intl.DisplayNames([&apos;it&apos;], { type: &apos;script&apos; });
const deCurrencyNames = new Intl.DisplayNames([&apos;de&apos;], {type: &apos;currency&apos;});

zhLanguageNames.of(&apos;fr&apos;);
// → &apos;Français&apos;
enRegionNames.of(&apos;US&apos;);
// → &apos;États-Unis&apos;
itScriptNames.of(&apos;Latn&apos;);
// → &apos;latino&apos;
deCurrencyNames.of(&apos;JPY&apos;);
// → &apos;Yen Japonais&apos;
```

Déchargez dès aujourd&apos;hui la maintenance des données de traduction sur le runtime ! Consultez [notre explication des fonctionnalités](https://v8.dev/features/intl-displaynames) pour des détails sur l&apos;API complète et d&apos;autres exemples.

## API V8

Veuillez utiliser `git log branch-heads/8.0..branch-heads/8.1 include/v8.h` pour obtenir une liste des changements de l&apos;API.

Les développeurs avec un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 8.1 -t branch-heads/8.1` pour expérimenter les nouvelles fonctionnalités de V8 v8.1. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
