---
title: "Schéma de numérotation des versions de V8"
description: "Ce document explique le schéma de numérotation des versions de V8."
---
Les numéros de version de V8 ont la forme `x.y.z.w`, où :

- `x.y` correspond au jalon de Chromium divisé par 10 (par exemple M60 → `6.0`)
- `z` est incrémenté automatiquement lorsqu’il y a un nouveau [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms) (en général plusieurs fois par jour)
- `w` est incrémenté pour les correctifs fusionnés manuellement après un point de branche

Si `w` vaut `0`, il est omis du numéro de version. Par exemple, v5.9.211 (au lieu de “v5.9.211.0”) passe à v5.9.211.1 après la fusion d’un correctif.

## Quelle version de V8 devrais-je utiliser ?

Les intégrateurs de V8 devraient généralement utiliser *la tête de la branche correspondant à la version mineure de V8 qui est livrée dans Chrome*.

### Trouver la version mineure de V8 correspondant à la dernière version stable de Chrome

Pour découvrir quelle est cette version,

1. Allez sur https://chromiumdash.appspot.com/releases
2. Trouvez la dernière version stable de Chrome dans le tableau
3. Cliquez sur le (i) et vérifiez la colonne `V8`


### Trouver la tête de la branche correspondante

Les branches liées aux versions de V8 n’apparaissent pas dans le dépôt en ligne à https://chromium.googlesource.com/v8/v8.git ; seuls les tags apparaissent. Pour trouver la tête de cette branche, allez à l’URL sous cette forme :

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

Exemple : pour la version mineure de V8 12.1 trouvée ci-dessus, nous allons à https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1, trouvant un commit intitulé « Version 12.1.285.2 ».

**Attention :** Vous ne devez *pas* simplement trouver le tag numériquement le plus élevé correspondant à la version mineure de V8 ci-dessus, car parfois ceux-ci ne sont pas pris en charge, par exemple ils sont tagués avant de décider où couper les versions mineures. Ces versions ne reçoivent pas de rétroportages ou autres.

Exemple : les tags V8 `5.9.212`, `5.9.213`, `5.9.214`, `5.9.214.1`, …, et `5.9.223` sont abandonnés, bien qu’ils soient numériquement supérieurs à la **tête de branche** de 5.9.211.33.

### Vérifier la tête de la branche correspondante

Si vous avez déjà le code source, vous pouvez vérifier la tête directement. Si vous avez récupéré le code source en utilisant `depot_tools`, vous devriez être en mesure de faire

```bash
git branch --remotes | grep branch-heads/
```

pour lister les branches pertinentes. Vous devrez vérifier celle correspondant à la version mineure de V8 que vous avez trouvée ci-dessus, et l’utiliser. Le tag sur lequel vous finissez est la version de V8 appropriée pour vous en tant qu’intégrateur.

Si vous n’avez pas utilisé `depot_tools`, modifiez `.git/config` et ajoutez la ligne ci-dessous dans la section `[remote "origin"]` :

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
