---
title: &apos;Fusionner et appliquer des correctifs&apos;
description: &apos;Ce document explique comment fusionner des correctifs V8 dans une branche de publication.&apos;
---
Si vous avez un correctif dans la branche `main` (par exemple, une correction de bogue important) qui doit être fusionné dans l'une des branches de publication de V8 (refs/branch-heads/12.5), lisez ce qui suit.

Les exemples suivants utilisent une version 12.3 de V8. Remplacez `12.3` par votre numéro de version. Consultez la documentation sur [la numérotation des versions de V8](/docs/version-numbers) pour plus d'informations.

Un problème associé dans le suivi des problèmes de V8 est **obligatoire** si un correctif est fusionné. Cela aide à suivre les fusions.

## Qu'est-ce qui qualifie un candidat à la fusion ?

- Le correctif corrige un problème *grave* (par ordre d'importance) :
    1. Bogue de sécurité
    1. Bogue de stabilité
    1. Bogue de validité
    1. Problème de performance
- Le correctif ne modifie pas les API.
- Le correctif ne change pas le comportement présent avant la création de la branche (sauf si le changement de comportement corrige un bogue).

Plus d'informations sont disponibles sur [la page pertinente de Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md). En cas de doute, envoyez un email à &lt;v8-dev@googlegroups.com>.

## Le processus de fusion

Le processus de fusion dans le suivi de V8 est piloté par des Attributs. Veuillez donc définir l'attribut &apos;Merge-Request&apos; sur la version correspondante de Chrome Milestone. Si la fusion n'affecte qu'un [port](https://v8.dev/docs/ports) de V8, veuillez définir l'attribut HW en conséquence. Par exemple :

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

Après révision, cela sera ajusté lors de la revue en :

```
Merge: Approved-123
ou
Merge: Rejected-123
```

Après l'intégration de la modification, cela sera ajusté une fois de plus en :

```
Merge: Merged-123, Merged-12.3
```

## Comment vérifier si un commit a déjà été fusionné/reversé/a une couverture Canary

Utilisez [chromiumdash](https://chromiumdash.appspot.com/commit/) pour vérifier si la modification pertinente a une couverture Canary.


En haut, la section **Releases** devrait afficher un Canary.

## Comment créer le correctif de fusion

### Option 1 : Utiliser [gerrit](https://chromium-review.googlesource.com/) - Recommandé


1. Ouvrez la modification que vous voulez fusionner.
1. Sélectionnez "Cherry pick" dans le menu étendu (trois points verticaux dans le coin supérieur droit).
1. Indiquez "refs/branch-heads/*XX.X*" comme branche de destination (remplacez *XX.X* par la branche appropriée).
1. Modifiez le message de commit :
   1. Préfixez le titre avec "Merged: ".
   1. Supprimez les lignes du pied de page correspondant à la modification originale ("Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"). Gardez impérativement la ligne "(cherry picked from commit XXX)", car elle est nécessaire à certains outils pour relier les fusions aux modifications originales.
1. En cas de conflit de fusion, allez-y et créez la modification. Pour résoudre les conflits (si nécessaire) - soit en utilisant l'interface utilisateur de gerrit, soit en téléchargeant le correctif localement via la commande "download patch" dans le menu (trois points verticaux dans le coin supérieur droit).
1. Envoyez pour examen.

### Option 2 : Utilisation du script automatisé

Supposons que vous fusionnez la révision af3cf11 dans la branche 12.2 (veuillez spécifier les hachages git complets - les abréviations sont utilisées ici pour simplifier).

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### Après l'intégration : Observez le [branch waterfall](https://ci.chromium.org/p/v8)

Si l'un des constructeurs n'est pas vert après le traitement de votre correctif, annulez immédiatement la fusion. Un bot (`AutoTagBot`) se chargera de la version correcte après un délai de 10 minutes.

## Appliquer un correctif à une version utilisée sur Canary/Dev

Si vous devez appliquer un correctif à une version Canary/Dev (ce qui ne devrait pas arriver souvent), mettez vahl@ ou machenbach@ en copie du problème. Googlers : consultez le [site interne](http://g3doc/company/teams/v8/patching_a_version) avant de créer la modification.

