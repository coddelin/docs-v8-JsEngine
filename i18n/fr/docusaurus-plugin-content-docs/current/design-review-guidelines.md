---
title: &apos;Directives pour la revue de conception&apos;
description: &apos;Ce document explique les directives de revue de conception du projet V8.&apos;
---
Veuillez vous assurer de suivre les directives suivantes lorsque cela est applicable.

Il existe plusieurs objectifs pour la formalisation des revues de conception de V8 :

1. clarifier aux Contributeurs Individuels (CI) qui sont les décideurs et mettre en évidence le chemin à suivre en cas de désaccord technique empêchant l'avancement des projets
1. créer un forum pour des discussions de conception simples et directes
1. garantir que les Leads Techniques (TL) de V8 soient informés de tous les changements significatifs et aient l'opportunité d'apporter leur avis au niveau des Tech Leads (TL)
1. accroître l'implication de tous les contributeurs de V8 à travers le monde

## Résumé

![Aperçu des directives de revue de conception de V8](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

Important :

1. supposez des bonnes intentions
1. soyez aimable et civilisé
1. soyez pragmatique

La solution proposée repose sur les hypothèses/piliers suivants :

1. Le processus proposé met le Contributeur Individuel (CI) aux commandes. Ils sont ceux qui facilitent le processus.
1. Leurs TLs les guident afin de les aider à naviguer et trouver les bons fournisseurs de LGTM.
1. Si une fonctionnalité est non controversée, il ne devrait y avoir presque aucun surcoût.
1. S'il y a beaucoup de controverses, la fonctionnalité peut être &apos;escaladée&apos; à la réunion des propriétaires des revues techniques de V8, où des étapes supplémentaires sont décidées.

## Rôles

### Contributeur Individuel (CI)

LGTM : N/A
Cette personne est le créateur de la fonctionnalité et de la documentation de conception.

### Le Lead Technique (TL) du CI

LGTM : Obligatoire
Cette personne est le TL d'un projet ou composant donné. Probablement, cette personne est responsable du composant principal que votre fonctionnalité va toucher. Si vous n'êtes pas sûr(e) de qui est le TL, veuillez demander aux propriétaires des revues technique de V8 via v8-eng-review-owners@googlegroups.com. Les TLs sont responsables d'ajouter plus de personnes à la liste des LGTMs requis si nécessaire.

### Fournisseur de LGTM

LGTM : Obligatoire
C'est une personne qui doit donner un LGTM. Cela peut être un CI ou un TL(M).

### Relecteur “Aléatoire” du document (RRotD)

LGTM : Non requis
C'est quelqu'un qui fait simplement la relecture et commente la proposition. Leur avis doit être pris en considération, bien que leur LGTM ne soit pas requis.

### Propriétaires des Revues Techniques de V8

LGTM : Non requis
Les propositions bloquées peuvent être escaladées aux propriétaires des revues techniques de V8 via  &lt;v8-eng-review-owners@googlegroups.com>. Cas d'utilisation potentiels d'une telle escalade :

- un fournisseur de LGTM ne répond pas
- aucun consensus sur la conception ne peut être atteint

Les propriétaires des revues techniques de V8 peuvent passer outre les non-LGTMs ou les LGTMs.

## Workflow détaillé

![Aperçu des directives de revue de conception de V8](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

1. Début : le CI décide de travailler sur une fonctionnalité/se voit attribuer une fonctionnalité
1. Le CI envoie leur documentation de conception/de présentation précoce/une page à quelques RRotDs
    1. Les prototypes sont considérés comme partie intégrante du « document de conception »
1. Le CI ajoute des personnes à la liste des fournisseurs de LGTM que le CI pense devoir fournir leur LGTM. Le TL est obligatoire sur la liste des fournisseurs de LGTM.
1. Le CI intègre les retours.
1. Le TL ajoute des personnes supplémentaires à la liste des fournisseurs de LGTM.
1. Le CI envoie la documentation de conception/de présentation précoce/une page à  &lt;v8-dev+design@googlegroups.com>.
1. Le CI collecte les LGTMs. Le TL les aide.
    1. Le fournisseur de LGTM relit le document, ajoute des commentaires et donne soit un LGTM soit un non-LGTM au début du document. S'ils ajoutent un non-LGTM, ils sont obligés d'énumérer la ou les raison(s).
    1. Facultatif : les fournisseurs de LGTM peuvent se retirer de la liste des fournisseurs de LGTM et/ou suggérer d'autres fournisseurs de LGTM
    1. Le CI et le TL travaillent ensemble pour résoudre les problèmes non résolus.
    1. Si tous les LGTM sont rassemblés, envoyez un email à v8-dev@googlegroups.com (par exemple, en relançant le fil original) et annoncez la mise en œuvre.
1. Facultatif : Si le CI et le TL sont bloqués et/ou souhaitent avoir une discussion plus large, ils peuvent escalader le problème aux propriétaires des revues techniques de V8.
    1. Le CI envoie un mail à v8-eng-review-owners@googlegroups.com
        1. TL en CC
        1. Lien vers le document de conception dans le mail
    1. Chaque membre des propriétaires des revues techniques de V8 est obligé de passer en revue le document et peut, en option, s'ajouter à la liste des fournisseurs de LGTM.
    1. Les prochaines étapes pour débloquer la fonctionnalité sont décidées.
    1. Si le blocage persiste ou si de nouveaux obstacles insurmontables sont découverts, retournez au point 8.
1. Facultatif : Si des « non-LGTMs » sont ajoutés après que la fonctionnalité ait déjà été approuvée, ils devraient être traités comme des problèmes normaux et non résolus.
    1. Le CI et le TL travaillent pour résoudre les problèmes non résolus.
1. Fin : le CI continue avec la fonctionnalité.

Et souvenez-vous toujours :

1. supposez des bonnes intentions
1. soyez aimable et civilisé
1. soyez pragmatique

## FAQ

### Comment décider si la fonctionnalité mérite un document de conception ?

Quelques indications pour savoir quand un document de conception est approprié :

- Affecte au moins deux composants
- Nécessite une réconciliation avec des projets non-V8, par exemple Debugger, Blink
- Prend plus d'une semaine d'effort à implémenter
- Est une fonctionnalité linguistique
- Du code spécifique à la plateforme sera modifié
- Changements visibles pour l'utilisateur
- Présente des considérations de sécurité particulières ou l'impact sur la sécurité n'est pas évident

En cas de doute, demandez au TL.

### Comment décider qui ajouter à la liste des fournisseurs LGTM ?

Quelques conseils pour savoir quand des personnes doivent être ajoutées à la liste des fournisseurs LGTM :

- Propriétaires des fichiers/dossiers sources que vous prévoyez de modifier
- Experts principaux des composants que vous prévoyez de modifier
- Consommateurs finaux des modifications que vous apportez, par exemple lorsque vous modifiez une API

### Qui est « mon » TL ?

Il est probable que ce soit la personne qui possède le composant principal que votre fonctionnalité va toucher. Si ce n'est pas clair qui est le TL, veuillez demander aux Propriétaires de la Revue Eng V8 via &lt;v8-eng-review-owners@googlegroups.com>.

### Où puis-je trouver un modèle pour les documents de conception ?

[Ici](https://docs.google.com/document/d/1CWNKvxOYXGMHepW31hPwaFz9mOqffaXnuGqhMqcyFYo/template/preview).

### Que se passe-t-il si quelque chose change radicalement ?

Assurez-vous d'avoir encore les LGTM, par exemple en contactant les fournisseurs LGTM avec une date limite claire et raisonnable pour opposer leur veto.

### Les fournisseurs LGTM ne commentent pas mon document, que dois-je faire ?

Dans ce cas, vous pouvez suivre ce chemin d'escalade :

- Contactez-les directement par e-mail, Hangouts ou commentaire/attribution dans le document et demandez-leur spécifiquement d'ajouter un LGTM ou un non-LGTM.
- Impliquez votre TL et demandez leur aide.
- Faites remonter à &lt;v8-eng-review-owners@googlegroups.com>.

### Quelqu'un m'a ajouté comme fournisseur LGTM à un document, que dois-je faire ?

V8 vise à rendre les décisions plus transparentes et l'escalade plus simple. Si vous pensez que la conception est suffisamment bonne et qu'elle devrait être mise en œuvre, ajoutez un « LGTM » dans la cellule du tableau à côté de votre nom.

Si vous avez des préoccupations ou remarques bloquantes, ajoutez « Pas de LGTM, en raison de \<raison> » dans la cellule du tableau à côté de votre nom. Préparez-vous à être sollicité pour une autre série de revue.

### Comment cela fonctionne-t-il avec le processus Blink Intents ?

Les directives de revue de conception de V8 complètent [le processus Intent+Errata de Blink de V8](/docs/feature-launch-process). Si vous lancez une nouvelle fonctionnalité WebAssembly ou un langage JavaScript, veuillez suivre le processus Intent+Errata de Blink de V8 et les directives de revue de conception de V8. Il est probablement judicieux d'avoir tous les LGTM réunis au moment où vous enverrez une intention d'implémentation.
