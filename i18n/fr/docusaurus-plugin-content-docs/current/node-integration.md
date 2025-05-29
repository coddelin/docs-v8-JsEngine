---
title: 'Que faire si votre CL a cassé la construction d'intégration Node.js'
description: 'Ce document explique que faire si votre CL a cassé la construction d'intégration Node.js.'
---
[Node.js](https://github.com/nodejs/node) utilise V8 stable ou bêta. Pour une intégration supplémentaire, l'équipe V8 construit Node avec la [branche principale de V8](https://chromium.googlesource.com/v8/v8/+/refs/heads/main), c'est-à-dire avec une version de V8 actuelle. Nous fournissons un bot d'intégration pour [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64), tandis que [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) et [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) sont en cours de développement.

Si le bot [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) échoue sur la file d'attente des commits V8, il y a soit un problème légitime avec votre CL (corrigez-le), soit [Node](https://github.com/v8/node/) doit être modifié. Si les tests de Node ont échoué, recherchez « Not OK » dans les fichiers journaux. **Ce document décrit comment reproduire le problème localement et comment apporter des modifications au [fork Node de V8](https://github.com/v8/node/) si votre CL V8 fait échouer la construction.**

## Source

Suivez les [instructions](https://chromium.googlesource.com/v8/node-ci) dans le dépôt node-ci pour vérifier la source.

## Tester les modifications sur V8

V8 est configuré comme une dépendance DEPS de node-ci. Vous souhaiterez peut-être appliquer des modifications à V8 pour tester ou reproduire des échecs. Pour ce faire, ajoutez votre répertoire principal V8 comme télécommande :

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

N'oubliez pas d'exécuter les hooks gclient avant de compiler.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Apportez des modifications à Node.js

Node.js est également configuré comme une dépendance `DEPS` de node-ci. Vous pouvez vouloir appliquer des modifications à Node.js pour corriger les ruptures que les modifications de V8 peuvent causer. V8 teste contre un [fork de Node.js](https://github.com/v8/node). Vous aurez besoin d'un compte GitHub pour effectuer des modifications sur ce fork.

### Obtenir les sources de Node

Forkez [le dépôt Node.js de V8 sur GitHub](https://github.com/v8/node/) (cliquez sur le bouton fork) à moins que vous ne l'ayez déjà fait.

Ajoutez votre fork et celui de V8 comme télécommandes au dépôt existant :

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **Remarque** `<sync-date>` est la date à laquelle nous avons synchronisé avec Node.js en amont. Choisissez la date la plus récente.

Apportez vos modifications au dépôt Node.js et validez-les. Ensuite, poussez les modifications sur GitHub :

```bash
git push <your-user-name> $BRANCH_NAME
```

Et créez une pull request contre la branche `node-ci-<sync-date>`.


Une fois que la pull request a été fusionnée dans le fork Node.js de V8, vous devez mettre à jour le fichier `DEPS` de node-ci, et créer un CL.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Mettre à jour Node'
git cl upload
```
