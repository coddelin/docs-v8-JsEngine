---
title: "Contribuer à V8"
description: "Ce document explique comment contribuer à V8."
---
Les informations figurant sur cette page expliquent comment contribuer à V8. Assurez-vous de tout lire avant de nous envoyer une contribution.

## Obtenir le code

Voir [Vérification du code source de V8](/docs/source-code).

## Avant de contribuer

### Posez des questions sur la liste de diffusion de V8 pour obtenir des conseils

Avant de commencer à travailler sur une contribution V8 plus importante, vous devriez d'abord nous contacter via [la liste de diffusion des contributeurs de V8](https://groups.google.com/group/v8-dev) pour que nous puissions vous aider et éventuellement vous guider. Coordonner au préalable rend les choses beaucoup plus faciles et évite les frustrations par la suite.

### Signez le CLA

Avant que nous puissions utiliser votre code, vous devez signer l'[Accord de Licence de Contributeur Individuel de Google](https://cla.developers.google.com/about/google-individual), que vous pouvez faire en ligne. Cela est principalement dû au fait que vous possédez les droits d'auteur de vos modifications, même après que votre contribution devient une partie de notre base de code, nous avons donc besoin de votre permission pour utiliser et distribuer votre code. Nous devons également nous assurer de divers autres points, par exemple que vous nous informerez si vous savez que votre code enfreint les brevets d'autrui. Vous n'avez pas à le faire avant d'avoir soumis votre code pour examen et qu'un membre l'a approuvé, mais vous devrez le faire avant que nous puissions intégrer votre code dans notre base de code.

Les contributions faites par des entreprises sont régies par un accord différent de celui mentionné ci-dessus, l'[Accord de Licence de Contributeur Corporatif et de Subvention Logicielle](https://cla.developers.google.com/about/google-corporate).

Signez-les en ligne [ici](https://cla.developers.google.com/).

## Soumettez votre code

Le code source de V8 suit le [Guide de Style C++ de Google](https://google.github.io/styleguide/cppguide.html), vous devez donc vous familiariser avec ces directives. Avant de soumettre du code, vous devez réussir tous nos [tests](/docs/test) et accomplir avec succès les vérifications d'avant-soumission:

```bash
git cl presubmit
```

Le script d'avant-soumission utilise un linter de Google, [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py). Il fait partie de [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools), et doit être dans votre `PATH` — donc si vous avez `depot_tools` dans votre `PATH`, tout devrait fonctionner.

### Téléchargez sur l'outil de revue de code de V8

Toutes les soumissions, y compris celles des membres du projet, nécessitent une révision. Nous utilisons les mêmes outils et processus de revue de code que le projet Chromium. Pour soumettre un patch, vous devez obtenir les [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) et suivre ces instructions sur [la demande de révision](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md) (en utilisant votre espace de travail V8 à la place de l'espace de travail Chromium).

### Soyez attentif aux erreurs ou régressions

Une fois que vous avez obtenu l'approbation de la revue de code, vous pouvez intégrer votre patch à l'aide de la file d'attente de commit. Celle-ci exécute une batterie de tests et engage votre patch si tous les tests réussissent. Une fois votre changement intégré, il est judicieux de surveiller [la console](https://ci.chromium.org/p/v8/g/main/console) jusqu'à ce que les bots passent au vert après votre modification, car la console exécute quelques tests supplémentaires par rapport à la file d'attente de commit.
