---
title: "Processus de publication"
description: "Ce document explique le processus de publication de V8."
---
Le processus de publication de V8 est étroitement lié aux [canaux de Chrome](https://www.chromium.org/getting-involved/dev-channel). L’équipe V8 utilise les quatre canaux de publication de Chrome pour distribuer de nouvelles versions aux utilisateurs.

Si vous souhaitez savoir quelle version de V8 est incluse dans une publication Chrome, vous pouvez consulter [Chromiumdash](https://chromiumdash.appspot.com/releases). Pour chaque publication Chrome, une branche distincte est créée dans le dépôt V8 pour faciliter la traçabilité, par exemple pour [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1).

## Versions Canary

Chaque jour, une nouvelle version Canary est proposée aux utilisateurs via [le canal Canary de Chrome](https://www.google.com/chrome/browser/canary.html?platform=win64). Normalement, la version livrée est la dernière version stable du [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main).

Les branches pour une version Canary ressemblent généralement à ceci :

## Versions Dev

Chaque semaine, une nouvelle version Dev est proposée aux utilisateurs via [le canal Dev de Chrome](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64). Normalement, la version livrée inclut la dernière version suffisamment stable de V8 sur le canal Canary.


## Versions Bêta

Environ toutes les deux semaines, une nouvelle branche majeure est créée, par exemple [pour Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4). Cela se fait en synchronisation avec la création du [canal Bêta de Chrome](https://www.google.com/chrome/browser/beta.html?platform=win64). Le Chrome Bêta est épinglé à la tête de la branche de V8. Après environ 2 semaines, la branche est promue comme Stable.

Les modifications ne sont intégrées à la branche que pour stabiliser la version.

Les branches pour une version Bêta ressemblent généralement à ceci :

```
refs/branch-heads/12.1
```

Elles sont basées sur une branche Canary.

## Versions Stables

Environ toutes les 4 semaines, une nouvelle version stable majeure est publiée. Aucune branche spéciale n’est créée car la dernière branche Bêta est simplement promue comme Stable. Cette version est proposée aux utilisateurs via [le canal Stable de Chrome](https://www.google.com/chrome/browser/desktop/index.html?platform=win64).

Les branches pour une version Stable ressemblent généralement à ceci :

```
refs/branch-heads/12.1
```

Ce sont des branches Bêta qui ont été promues (réutilisées).

## API

Chromiumdash propose également une API pour collecter les mêmes informations :

```
https://chromiumdash.appspot.com/fetch_milestones (pour obtenir le nom de la branche V8, par exemple refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (pour obtenir le hash git de la branche V8)
```

Les paramètres suivants sont utiles :
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## Quelle version devrais-je intégrer dans mon application ?

La tête de la même branche que celle utilisée par le canal Stable de Chrome.

Nous fusionnons souvent d’importantes corrections de bugs dans une branche stable, donc si vous accordez de l’importance à la stabilité, la sécurité et l’exactitude, vous devriez inclure ces mises à jour également — c’est pourquoi nous recommandons « la tête de la branche », plutôt qu’une version exacte.

Dès qu’une nouvelle branche est promue comme Stable, nous cessons de maintenir la branche stable précédente. Cela se produit tous les quatre semaines, donc vous devriez être prêt à effectuer des mises à jour au moins aussi souvent.

**Lié :** [Quelle version de V8 devrais-je utiliser ?](/docs/version-numbers#which-v8-version-should-i-use%3F)
