---
title: "Liste de contrôle pour la mise en scène et l'expédition des fonctionnalités WebAssembly"
description: "Ce document fournit des listes de contrôle des exigences techniques sur le moment où mettre en scène et expédier une fonctionnalité WebAssembly dans V8."
---
Ce document fournit des listes de contrôle des exigences techniques pour la mise en scène et l'expédition des fonctionnalités WebAssembly dans V8. Ces listes de contrôle sont conçues comme une ligne directrice et peuvent ne pas s'appliquer à toutes les fonctionnalités. Le processus de lancement réel est décrit dans le [processus de lancement V8](https://v8.dev/docs/feature-launch-process).

# Mise en scène

## Quand mettre en scène une fonctionnalité WebAssembly

La [mise en scène](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE) d'une fonctionnalité WebAssembly définit la fin de sa phase de mise en œuvre. La phase de mise en œuvre est terminée lorsque la liste de contrôle suivante est accomplie :

- La mise en œuvre dans V8 est terminée. Cela inclut :
    - Mise en œuvre dans TurboFan (si applicable)
    - Mise en œuvre dans Liftoff (si applicable)
    - Mise en œuvre dans l'interpréteur (si applicable)
- Des tests dans V8 sont disponibles
- Les tests de spécification sont intégrés dans V8 en exécutant [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)
- Tous les tests de spécification proposés existants réussissent. Les tests de spécification manquants sont regrettables mais ne devraient pas bloquer la mise en scène.

Notez que l'étape de la proposition de fonctionnalité dans le processus de normalisation n'a pas d'importance pour la mise en scène de la fonctionnalité dans V8. La proposition devrait, cependant, être principalement stable.

## Comment mettre en scène une fonctionnalité WebAssembly

- Dans [`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h), déplacez le drapeau de fonctionnalité de la liste macro `FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG` vers la liste macro `FOREACH_WASM_STAGING_FEATURE_FLAG`.
- Dans [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh), ajoutez le nom du dépôt de la proposition à la liste `repos` des dépôts.
- Exécutez [`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh) pour créer et télécharger les tests de spécification de la nouvelle proposition.
- Dans [`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py), ajoutez le nom du dépôt de la proposition et le drapeau de fonctionnalité à la liste `proposal_flags`.
- Dans [`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py), ajoutez le nom du dépôt de la proposition et le drapeau de fonctionnalité à la liste `proposal_flags`.

Voir la [mise en scène de la réflexion de type](https://crrev.com/c/1771791) comme référence.

# Expédition

## Quand une fonctionnalité WebAssembly est-elle prête à être expédiée

- Le [processus de lancement V8](https://v8.dev/docs/feature-launch-process) est satisfait.
- La mise en œuvre est couverte par un outil de fuzzing (si applicable).
- La fonctionnalité a été mise en scène pendant plusieurs semaines pour obtenir une couverture de fuzzing.
- La proposition de fonctionnalité est au [stade 4](https://github.com/WebAssembly/proposals).
- Tous les [tests de spécification](https://github.com/WebAssembly/spec/tree/master/test) réussissent.
- La [liste de contrôle des DevTools Chromium pour les nouvelles fonctionnalités WebAssembly](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview) est satisfaite.

## Comment expédier une fonctionnalité WebAssembly

- Dans [`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h), déplacez le drapeau de fonctionnalité de la liste macro `FOREACH_WASM_STAGING_FEATURE_FLAG` vers la liste macro `FOREACH_WASM_SHIPPED_FEATURE_FLAG`.
    - Assurez-vous d'ajouter un bot CQ blink sur le CL pour vérifier les échecs des [tests de mise en page blink](https://v8.dev/docs/blink-layout-tests) causés par l'activation de la fonctionnalité (ajoutez cette ligne dans le pied de description du CL : `Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`).
- De plus, activez la fonctionnalité par défaut en modifiant le troisième paramètre dans `FOREACH_WASM_SHIPPED_FEATURE_FLAG` à `true`.
- Définissez un rappel pour supprimer le drapeau de fonctionnalité après deux versions.
