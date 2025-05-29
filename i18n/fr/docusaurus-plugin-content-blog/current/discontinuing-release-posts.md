---
title: "Abandon des articles de blog sur les versions"
author: "Shu-yu Guo ([@shu_](https://twitter.com/_shu))"
avatars:
 - "shu-yu-guo"
date: 2022-06-17
tags:
 - release
description: "V8 abandonne les articles de blog sur les versions au profit du calendrier de sortie de Chrome et des articles sur les fonctionnalités."
tweet: "1537857497825824768"
---

Historiquement, il y avait un article de blog pour chaque nouvelle branche de version de V8. Vous avez peut-être remarqué qu'il n'y a pas eu d'article de blog sur les versions depuis la v9.9. À partir de la v10.0, nous abandonnons les articles de blog sur les versions pour chaque nouvelle branche. Mais ne vous inquiétez pas, toutes les informations auxquelles vous étiez habitué via les articles de blog sur les versions sont toujours disponibles ! Lisez la suite pour découvrir où trouver ces informations à l'avenir.

<!--truncate-->
## Calendrier des versions et version actuelle

Lisiez-vous les articles de blog sur les versions pour déterminer la version la plus récente de V8 ?

V8 suit le calendrier de sortie de Chrome. Pour obtenir la version stable la plus récente de V8, veuillez consulter la [feuille de route des versions de Chrome](https://chromestatus.com/roadmap).

Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](https://v8.dev/docs/release-process). Chaque version est dérivée de la branche principale Git de V8 juste avant une étape bêta de Chrome. Ces branches sont en bêta et deviennent des versions en coordination avec la [feuille de route des versions de Chrome](https://chromestatus.com/roadmap).

Pour trouver une branche V8 particulière pour une version de Chrome :

1. Prenez la version de Chrome et divisez-la par 10 pour obtenir la version de V8. Par exemple, Chrome 102 est V8 10.2.
1. Pour un numéro de version X.Y, sa branche peut être trouvée à l'URL de la forme suivante :

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

Par exemple, la branche 10.2 peut être trouvée à https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2.

Pour en savoir plus sur les numéros de version et les branches, veuillez consulter [notre article détaillé](https://v8.dev/docs/version-numbers).

Pour une version V8 X.Y, les développeurs avec un accès actif à V8 peuvent utiliser `git checkout -b X.Y -t branch-heads/X.Y` pour expérimenter les nouvelles fonctionnalités de cette version.

## Nouvelles fonctionnalités JavaScript ou WebAssembly

Lisiez-vous les articles de blog sur les versions pour découvrir quelles nouvelles fonctionnalités JavaScript ou WebAssembly ont été mises en œuvre derrière un drapeau ou activées par défaut ?

Veuillez consulter la [feuille de route des versions de Chrome](https://chromestatus.com/roadmap), qui répertorie les nouvelles fonctionnalités et leurs étapes pour chaque version.

Notez que [les articles de blog distincts approfondis sur les fonctionnalités](/features) peuvent être publiés avant ou après la mise en œuvre de la fonctionnalité dans V8.

## Améliorations notables des performances

Lisiez-vous les articles de blog sur les versions pour en apprendre davantage sur les améliorations notables des performances ?

À l'avenir, nous rédigerons des articles de blog indépendants sur les améliorations de performances que nous souhaitons mettre en avant, comme nous l'avons fait par le passé pour des améliorations comme [Sparkplug](https://v8.dev/blog/sparkplug).

## Changements d’API

Lisiez-vous les articles de blog sur les versions pour en apprendre davantage sur les changements d’API ?

Pour voir la liste des commits qui ont modifié l'API de V8 entre une version antérieure A.B et une version ultérieure X.Y, veuillez utiliser `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h` dans un accès actif à V8.
