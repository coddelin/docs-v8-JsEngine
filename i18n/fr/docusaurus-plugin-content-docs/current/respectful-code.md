---
title: "Code respectueux"
description: "L'inclusivité est au cœur de la culture de V8, et nos valeurs incluent le respect mutuel. Ainsi, il est important que chacun puisse contribuer sans être confronté aux effets nuisibles des préjugés et de la discrimination."
---

L'inclusivité est au cœur de la culture de V8, et nos valeurs incluent le respect mutuel. Ainsi, il est important que chacun puisse contribuer sans être confronté aux effets nuisibles des préjugés et de la discrimination. Cependant, les termes dans notre base de code, nos interfaces utilisateurs et notre documentation peuvent perpétuer cette discrimination. Ce document propose des directives visant à traiter la terminologie irrespectueuse dans le code et la documentation.

## Politique

La terminologie qui est dénigrante, blessante ou qui perpétue la discrimination, directement ou indirectement, doit être évitée.

## Qu'est-ce qui est couvert par cette politique ?

Tout ce qu'un contributeur pourrait lire en travaillant sur V8, y compris :

- Noms de variables, types, fonctions, fichiers, règles de build, binaires, variables exportées, ...
- Données de test
- Sortie et affichages du système
- Documentation (à l'intérieur et à l'extérieur des fichiers source)
- Messages de commit

## Principes

- Soyez respectueux : le langage dénigrant ne devrait pas être nécessaire pour décrire le fonctionnement des choses.
- Respectez le langage culturellement sensible : certains mots peuvent avoir des significations historiques ou politiques importantes. Soyez attentif à cela et utilisez des alternatives.

## Comment savoir si une terminologie particulière est acceptable ou non ?

Appliquez les principes ci-dessus. Si vous avez des questions, vous pouvez contacter [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

## Quels sont des exemples de terminologie à éviter ?

Cette liste n'est PAS censée être exhaustive. Elle contient quelques exemples auxquels les gens sont souvent confrontés.


| Terme       | Alternatives suggérées                                       |
| ----------- | ----------------------------------------------------------- |
| master      | primaire, contrôleur, leader, hôte                          |
| slave       | réplique, subordonné, secondaire, suiveur, dispositif, périphérique |
| whitelist   | liste d'autorisation, liste d'exceptions, liste d'inclusion |
| blacklist   | liste de refus, liste de blocage, liste d'exclusion        |
| insane      | inattendu, catastrophique, incohérent                       |
| sane        | attendu, approprié, sensé, valide                           |
| crazy       | inattendu, catastrophique, incohérent                       |
| redline     | ligne prioritaire, limite, limite souple                    |


## Que faire si je travaille avec quelque chose qui enfreint cette politique ?

Cette situation s'est produite à quelques reprises, en particulier pour le code implémentant des spécifications. Dans ces circonstances, différer du langage employé dans la spécification peut nuire à la compréhension de l'implémentation. Dans ces cas, nous suggérons l'une des approches suivantes, par ordre de préférence décroissante :

1. Si l'utilisation d'une terminologie alternative n'interfère pas avec la compréhension, utilisez une terminologie alternative.
2. À défaut, ne propagez pas la terminologie au-delà de la couche de code effectuant l'interface. Si nécessaire, utilisez une terminologie alternative aux limites de l'API.
