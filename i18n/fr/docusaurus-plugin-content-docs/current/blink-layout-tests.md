---
title: 'Tests web Blink (a.k.a. tests de mise en page)'
description: 'L’infrastructure de V8 exécute en continu les tests web de Blink pour prévenir les problèmes d’intégration avec Chromium. Ce document décrit quoi faire en cas d’échec d’un tel test.'
---
Nous exécutons en continu [les tests web Blink (anciennement appelés “tests de mise en page”)](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md) sur notre [console d’intégration](https://ci.chromium.org/p/v8/g/integration/console) pour prévenir les problèmes d’intégration avec Chromium.

En cas d’échec de test, les robots comparent les résultats de V8 Tip-of-Tree avec la version de V8 intégrée dans Chromium, pour signaler uniquement les nouveaux problèmes introduits dans V8 (avec moins de 5 % de faux positifs). L’attribution des responsabilités est triviale car le robot [Linux release](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux) teste toutes les révisions.

Les validations introduisant de nouvelles défaillances sont généralement annulées pour débloquer le processus d’auto-rolling dans Chromium. Si vous remarquez que vous cassez les tests de mise en page ou que votre validation est annulée à cause d’une telle cassure, et si les modifications sont prévues, suivez cette procédure pour ajouter des bases actualisées dans Chromium avant de (re-)valider votre CL :

1. Validez un changement dans Chromium définissant `[ Failure Pass ]` pour les tests modifiés ([plus d’informations](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)).
1. Validez votre CL V8 et attendez 1 à 2 jours qu’il s’intègre dans Chromium.
1. Suivez [ces instructions](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests) pour générer manuellement les nouvelles bases. Notez que si vous effectuez uniquement des modifications à Chromium, [cette procédure automatique préférée](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline) devrait fonctionner pour vous.
1. Supprimez l’entrée `[ Failure Pass ]` du fichier des attentes des tests et validez-la avec les nouvelles bases dans Chromium.

Veuillez associer tous les CL à un pied de page `Bug: …`.
