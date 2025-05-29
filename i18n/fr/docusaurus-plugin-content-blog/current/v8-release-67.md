---
title: "V8 release v6.7"
author: 'l'équipe V8'
date: 2018-05-04 13:33:37
tags:
  - sortie
tweet: "992506342391742465"
description: 'V8 v6.7 ajoute plus de mesures d'atténuation pour le code non fiable et introduit la prise en charge de BigInt.'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](/docs/release-process). Chaque version est dérivée du dépôt principal de V8 juste avant un jalon Chrome Beta. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7), qui est en version bêta jusqu'à sa sortie en coordination avec Chrome 67 Stable dans plusieurs semaines. V8 v6.7 regorge de nouveautés à destination des développeurs. Cet article offre un aperçu de certaines des principales nouveautés en prévision de la sortie.

<!--truncate-->
## Fonctionnalités du langage JavaScript

V8 v6.7 inclut la prise en charge de BigInt activée par défaut. Les BigInts sont une nouvelle primitive numérique en JavaScript qui peut représenter des entiers avec une précision arbitraire. Lisez [notre explication des fonctionnalités de BigInt](/features/bigint) pour en savoir plus sur l'utilisation des BigInts en JavaScript, et consultez [notre article avec plus de détails sur l'implémentation dans V8](/blog/bigint).

## Atténuation du code non fiable

Dans V8 v6.7, nous avons introduit [davantage de mesures d'atténuation pour les vulnérabilités des canaux auxiliaires](/docs/untrusted-code-mitigations) afin d'empêcher les fuites d'informations vers le code JavaScript et WebAssembly non fiable.

## API V8

Veuillez utiliser `git log branch-heads/6.6..branch-heads/6.7 include/v8.h` pour obtenir une liste des changements de l'API.

Les développeurs disposant d'un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 6.7 -t branch-heads/6.7` pour expérimenter avec les nouvelles fonctionnalités de V8 v6.7. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et bientôt essayer directement les nouvelles fonctionnalités vous-même.
