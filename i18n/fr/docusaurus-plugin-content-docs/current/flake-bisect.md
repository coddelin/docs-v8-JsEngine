---
title: 'Analyse des flocons'
description: 'Ce document explique comment analyser les tests instables.'
---
Les tests instables sont signalés dans une étape distincte sur les robots ([exemple de build](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)).

Chaque journal de test fournit une ligne de commande préremplie pour déclencher une analyse automatisée des flocons, comme :

```
Déclencher l'analyse des flocons via la ligne de commande :
bb add v8/try.triggered/v8_flako -p 'to_revision="deadbeef"' -p 'test_name="MyTest"' ...
```

Avant de déclencher une analyse des flocons pour la première fois, les utilisateurs doivent se connecter avec un compte google.com :

```bash
bb auth-login
```

Ensuite, exécutez la commande fournie, qui retourne une URL de build exécutant l'analyse des flocons ([exemple](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)).

Si vous avez de la chance, l'analyse vous dirigera vers un suspect. Sinon, vous pourriez vouloir lire davantage…

## Description détaillée

Pour les détails techniques, consultez également le [bug de suivi de l'implémentation](https://crbug.com/711249). L'approche de l'analyse des flocons a les mêmes intentions que [findit](https://sites.google.com/chromium.org/cat/findit), mais utilise une implémentation différente.

### Comment ça fonctionne?

Un travail d'analyse a 3 phases : calibration, analyse en arrière et en profondeur. Pendant la calibration, les tests sont répétés en doublant le délai total (ou le nombre de répétitions) jusqu'à ce que suffisamment de flocons soient détectés en une exécution. Ensuite, l'analyse en arrière double l'intervalle Git jusqu'à ce qu'une révision sans instabilités soit trouvée. Enfin, nous procédons à une analyse dans l'intervalle entre la bonne révision et la plus ancienne mauvaise révision. Notez que l'analyse ne produit pas de nouveaux produits de build, elle repose uniquement sur les builds créés précédemment sur l'infrastructure continue de V8.

### L'analyse échoue lorsque…

- Aucune confiance ne peut être obtenue lors de la calibration. Cela est typique des flocons rares ou d'un comportement instable uniquement visible lorsque d'autres tests s'exécutent en parallèle (ex. tests gourmands en mémoire).
- Le coupable est trop ancien. L'analyse abandonne après un certain nombre d'étapes ou si les builds plus anciens ne sont plus disponibles sur le serveur d'isolation.
- Le travail d'analyse global dépasse le délai. Dans ce cas, il peut être possible de le redémarrer avec une révision connue comme mauvaise plus ancienne.

## Propriétés pour personnaliser l'analyse des flocons

- `extra_args`: Arguments supplémentaires transmis au script `run-tests.py` de V8.
- repetitions: Nombre initial de répétitions de test (transmis à l'option `--random-seed-stress-count` de `run-tests.py`; non utilisé si `total_timeout_sec` est utilisé).
- `timeout_sec`: Paramètre de délai transmis à `run-tests.py`.
- `to_revision`: Révision connue comme mauvaise. C'est là que l'analyse commencera.
- `total_timeout_sec`: Délai total initial pour une étape complète d'analyse. Pendant la calibration, ce délai est doublé plusieurs fois si nécessaire. Réglez à 0 pour désactiver et utilisez à la place la propriété `repetitions`.
- `variant`: Nom de la variante de test transmis à `run-tests.py`.

## Propriétés qu'il n'est pas nécessaire de modifier

- `bisect_buildername`: Nom principal du constructeur ayant produit les builds pour l'analyse.
- `bisect_mastername`: Nom du constructeur ayant produit les builds pour l'analyse.
- `build_config`: Configuration de build transmise au script `run-tests.py` de V8 (là le nom du paramètre est `--mode`, exemple : `Release` ou `Debug`).
- `isolated_name`: Nom du fichier isolé (ex. `bot_default`, `mjsunit`).
- `swarming_dimensions`: Dimensions de swarming classifiant le type de robot sur lequel les tests doivent s'exécuter. Transmis comme une liste de chaînes, chacune au format `nom:valeur`.
- `test_name`: Nom complet du test transmis à run-tests.py. Ex. `mjsunit/foobar`.

## Conseils et astuces

### Analyser un test bloqué (ex. verrou mortel)

Si une exécution échoue en expirant, tandis qu'un succès s'exécute très rapidement, il est utile de régler le paramètre timeout_sec pour que l'analyse ne soit pas retardée en attendant l'expiration des exécutions bloquées. Par ex., si le succès est généralement atteint en &lt;1 seconde, réglez le délai à une valeur faible, par ex. 5 secondes.

### Obtenir davantage de confiance sur un suspect

Dans certaines exécutions, la confiance est très faible. Par ex., la calibration est satisfaisante si quatre flocons sont observés en une exécution. Pendant l'analyse, chaque exécution avec un ou plusieurs flocons est comptée comme mauvaise. Dans de tels cas, il peut être utile de redémarrer le travail d'analyse en réglant to_revision au coupable et en utilisant un nombre de répétitions ou un délai total plus élevé qu'au départ pour confirmer que la même conclusion est atteinte.

### Résoudre les problèmes de délai

Dans le cas où l'option de délai global provoque des blocages des builds, il est préférable d'estimer un nombre de répétitions approprié et de régler `total_timeout_sec` à `0`.

### Comportement des tests dépendant de la graine aléatoire
