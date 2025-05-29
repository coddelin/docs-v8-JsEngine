---
title: 'Devenir un committer'
description: 'Comment devient-on un committer de V8 ? Ce document explique.'
---
Techniquement, les committers sont des personnes qui ont un accès en écriture au dépôt V8. Tous les correctifs doivent être revus par au moins deux committers (y compris l'auteur). Indépendamment de cette exigence, les correctifs doivent également être rédigés ou examinés par un OWNER.

Ce privilège est accordé avec une certaine attente de responsabilité : les committers sont des personnes qui se soucient du projet V8 et veulent contribuer à atteindre ses objectifs. Les committers ne sont pas seulement des personnes capables de faire des modifications, mais des personnes qui ont démontré leur capacité à collaborer avec l'équipe, à obtenir les avis des personnes les plus compétentes, à contribuer à un code de haute qualité et à suivre pour corriger les problèmes (dans le code ou les tests).

Un committer est un contributeur au succès du projet V8 et un citoyen aidant le projet à réussir. Voir [Responsabilité des committers](/docs/committer-responsibility).

## Comment devenir un committer ?

*Note pour les employés de Google : il existe une [approche légèrement différente pour les membres de l'équipe V8](http://go/v8/setup_permissions.md).*

Si vous ne l'avez pas encore fait, **vous devrez configurer une clé de sécurité sur votre compte avant d'être ajouté à la liste des committers.**

En résumé, contribuez avec 20 correctifs non triviaux et faites-les examiner par au moins trois personnes différentes (vous aurez besoin de trois personnes pour vous soutenir). Ensuite, demandez à quelqu'un de vous désigner. Vous démontrez ainsi votre :

- engagement envers le projet (20 bons correctifs nécessitent beaucoup de votre temps précieux),
- capacité de collaborer avec l'équipe,
- compréhension du fonctionnement de l'équipe (politiques, processus de test et de revue de code, etc.),
- compréhension de la base de code et du style de codage du projet, et
- capacité à écrire du bon code (dernier point mais certainement pas le moindre)

Un committer actuel vous désigne en envoyant un email à [v8-committers@chromium.org](mailto:v8-committers@chromium.org) contenant :

- votre prénom et nom de famille
- votre adresse email dans Gerrit
- une explication de pourquoi vous devriez être un committer,
- une liste intégrée de liens vers les révisions (environ le top 10) contenant vos correctifs

Deux autres committers doivent soutenir votre nomination. Si personne ne s'oppose dans les 5 jours ouvrables, vous êtes committer. Si quelqu'un s'oppose ou demande davantage d'informations, les committers discutent et parviennent généralement à un consensus (dans les 5 jours ouvrables). Si les problèmes ne peuvent pas être résolus, un vote est organisé parmi les committers actuels.

Une fois que vous obtenez l'approbation des committers existants, des permissions supplémentaires de revue vous sont accordées. Vous serez également ajouté à la liste de diffusion [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com).

Dans le pire des cas, le processus peut durer jusqu'à deux semaines. Continuez à écrire des correctifs ! Même dans les cas rares où une nomination échoue, l'objection est généralement quelque chose de facile à résoudre, comme « plus de correctifs » ou « pas suffisamment de personnes connaissent le travail de cette personne ».

## Maintenir le statut de committer

Vous n'avez pas vraiment besoin de faire beaucoup pour maintenir votre statut de committer : continuez simplement à être génial et à aider le projet V8 !

Dans le cas malheureux où un committer continue d'ignorer la bonne citoyenneté (ou perturbe activement le projet), nous pourrions avoir besoin de révoquer le statut de cette personne. Le processus est le même que pour désigner un nouveau committer : quelqu'un suggère la révocation avec une bonne raison, deux personnes soutiennent la motion, et un vote peut être organisé si le consensus ne peut pas être atteint. J'espère que c'est suffisamment simple et que nous n'aurons jamais à le tester en pratique.

De plus, par mesure de sécurité, si vous êtes inactif sur Gerrit (aucun upload, aucun commentaire et aucune revue) pendant plus d'un an, nous pourrions révoquer vos privilèges de committer. Une notification par email est envoyée environ 7 jours avant la suppression. Ceci n'est pas une punition, donc si vous souhaitez reprendre votre contribution après cela, contactez [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com) pour demander sa restauration, et nous le ferons normalement.

(Ce document a été inspiré par [devenir-un-committer](https://dev.chromium.org/getting-involved/become-a-committer).)
