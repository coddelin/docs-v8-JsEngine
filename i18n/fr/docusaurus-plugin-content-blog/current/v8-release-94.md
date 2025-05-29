---
title: 'Version V8 v9.4'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-09-06
tags:
 - release
description: 'La version V8 v9.4 apporte des blocs d'initialisation statique de classe à JavaScript.'
tweet: '1434915404418277381'
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du master Git de V8 immédiatement avant une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4), qui est en version bêta jusqu'à sa sortie en coordination avec Chrome 94 Stable dans plusieurs semaines. V8 v9.4 est rempli de toutes sortes de nouveautés pour les développeurs. Ce post offre un aperçu de certains des points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### Blocs d'initialisation statique de classe

Les classes obtiennent la capacité de grouper du code devant s'exécuter une seule fois par évaluation de classe via des blocs d'initialisation statique.

```javascript
class C {
  // Ce bloc s'exécutera lorsque la classe elle-même sera évaluée
  static { console.log("Bloc statique de C"); }
}
```

À partir de la version 9.4, les blocs d'initialisation statique de classe seront disponibles sans nécessité d'utiliser le drapeau `--harmony-class-static-blocks`. Pour tous les détails concernant la sémantique de portée de ces blocs, veuillez consulter [notre explicatif](https://v8.dev/features/class-static-initializer-blocks).

## API V8

Veuillez utiliser `git log branch-heads/9.3..branch-heads/9.4 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant un checkout V8 actif peuvent utiliser `git checkout -b 9.4 -t branch-heads/9.4` pour expérimenter les nouvelles fonctionnalités de V8 v9.4. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer vous-même bientôt les nouvelles fonctionnalités.
