---
title: 'Implémentation et expédition des fonctionnalités de langage JavaScript/WebAssembly'
description: 'Ce document explique le processus d'implémentation et d'expédition des fonctionnalités de langage JavaScript ou WebAssembly dans V8.'
---
En général, V8 suit le [processus d'intention Blink pour les standards consensuels déjà définis](https://www.chromium.org/blink/launching-features/#process-existing-standard) pour les fonctionnalités de langage JavaScript et WebAssembly. Les errata spécifiques à V8 sont décrits ci-dessous. Veuillez suivre le processus d'intention Blink, sauf indication contraire dans les errata.

Si vous avez des questions sur ce sujet concernant des fonctionnalités JavaScript, veuillez envoyer un e-mail à syg@chromium.org et v8-dev@googlegroups.com.

Pour les fonctionnalités WebAssembly, veuillez envoyer un e-mail à gdeepti@chromium.org et v8-dev@googlegroups.com.

## Errata

### Les fonctionnalités JavaScript attendent généralement jusqu'à l'étape 3+

En règle générale, V8 attend pour implémenter les propositions de fonctionnalités JavaScript jusqu'à ce qu'elles avancent à [l'étape 3 ou ultérieure dans TC39](https://tc39.es/process-document/). TC39 a son propre processus de consensus, et l'étape 3 ou ultérieure signale un consensus explicite parmi les délégués TC39, y compris tous les vendeurs de navigateurs, qu'une proposition de fonctionnalité est prête à être implémentée. Ce processus de consensus externe signifie que les fonctionnalités à l'étape 3+ n'ont pas besoin d'envoyer des e-mails d'intention autres que l'intention de livrer.

### Revue TAG

Pour les petites fonctionnalités JavaScript ou WebAssembly, une revue TAG n'est pas nécessaire, car TC39 et Wasm CG offrent déjà une supervision technique significative. Si la fonctionnalité est grande ou transversale (par exemple, nécessite des modifications aux autres API de la plateforme Web ou des modifications de Chromium), il est recommandé de faire une revue TAG.

### Des indicateurs V8 et blink sont nécessaires

Lors de l'implémentation d'une fonctionnalité, un indicateur V8 ainsi qu'un `base::Feature` blink sont requis.

Les fonctionnalités blink sont nécessaires pour que Chrome puisse désactiver des fonctionnalités sans distribuer de nouveaux binaires en cas d'urgence. Cela est généralement implémenté dans [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h), [`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc), et [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc).

### Le fuzzing est requis pour livrer

Les fonctionnalités JavaScript et WebAssembly doivent être soumises à un processus de fuzzing pendant une période minimale de 4 semaines, ou un (1) jalon de version, avec tous les bugs corrigés, avant de pouvoir être livrées.

Pour les fonctionnalités JavaScript complètes, démarrez le fuzzing en déplaçant l'indicateur de fonctionnalité vers la macro `JAVASCRIPT_STAGED_FEATURES_BASE` dans [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h).

Pour WebAssembly, consultez la [checklist d'expédition WebAssembly](/docs/wasm-shipping-checklist).

### [Chromestatus](https://chromestatus.com/) et étapes de revue

Le processus d'intention blink inclut une série d'étapes de revue qui doivent être approuvées dans l'entrée de la fonctionnalité sur [Chromestatus](https://chromestatus.com/) avant qu'une intention de livrer ne soit envoyée pour obtenir les approbations des PROPRIÉTAIRES API.

Ces étapes sont adaptées aux API web, et certaines étapes peuvent ne pas être applicables aux fonctionnalités JavaScript et WebAssembly. Ce qui suit est une directive générale. Les détails diffèrent d'une fonctionnalité à l'autre ; ne suivez pas la directive de manière aveugle !

#### Confidentialité

La plupart des fonctionnalités JavaScript et WebAssembly n'affectent pas la confidentialité. De manière rare, certaines fonctionnalités peuvent ajouter de nouveaux vecteurs d'empreintes digitales qui révèlent des informations sur le système d'exploitation ou le matériel d'un utilisateur.

#### Sécurité

Bien que JavaScript et WebAssembly soient des vecteurs d'attaque courants dans les exploits de sécurité, la plupart des nouvelles fonctionnalités n'ajoutent pas de surface d'attaque supplémentaire. Le [fuzzing](#fuzzing) est requis et atténue certains risques.

Les fonctionnalités qui affectent des vecteurs d'attaque populaires connus, tels que `ArrayBuffer` en JavaScript, et les fonctionnalités qui pourraient permettre des attaques par canal latéral, nécessitent une attention supplémentaire et doivent être examinées.

#### Entreprises

Tout au long de leur processus de standardisation dans TC39 et Wasm CG, les fonctionnalités JavaScript et WebAssembly sont déjà soumises à une forte surveillance de compatibilité rétroactive. Il est extrêmement rare que des fonctionnalités soient volontairement incompatibles avec le passé.

Pour JavaScript, les fonctionnalités récemment livrées peuvent également être désactivées via `chrome://flags/#disable-javascript-harmony-shipping`.

#### Débogabilité

La débogabilité des fonctionnalités JavaScript et WebAssembly varie considérablement d'une fonctionnalité à l'autre. Les fonctionnalités JavaScript qui ajoutent uniquement de nouvelles méthodes intégrées n'ont pas besoin de support supplémentaire pour le débogueur, tandis que les fonctionnalités WebAssembly qui ajoutent de nouvelles capacités peuvent nécessiter un support supplémentaire significatif pour le débogueur.

Pour plus de détails, consultez la [checklist de débogage des fonctionnalités JavaScript](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) et la [checklist de débogage des fonctionnalités WebAssembly](https://goo.gle/devtools-wasm-checklist).

En cas de doute, cette porte est applicable.

#### Tests

Au lieu de WPT, les tests Test262 sont suffisants pour les fonctionnalités JavaScript, et les tests de spécification WebAssembly sont suffisants pour les fonctionnalités WebAssembly.

L’ajout de tests de la plateforme Web (WPT) n’est pas obligatoire, car les fonctionnalités du langage JavaScript et WebAssembly ont leurs propres dépôts de tests interopérables qui sont exécutés par plusieurs implémentations. N’hésitez pas à en ajouter si vous pensez que cela est bénéfique.

Pour les fonctionnalités JavaScript, des tests explicites de corréction dans [Test262](https://github.com/tc39/test262) sont requis. Notez que les tests dans le [répertoire staging](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging) suffisent.

Pour les fonctionnalités WebAssembly, des tests explicites de corréction dans le dépôt [de tests de spécification WebAssembly](https://github.com/WebAssembly/spec/tree/master/test) sont requis.

Pour les tests de performance, JavaScript sous-tend déjà la plupart des benchmarks de performance existants, comme Speedometer.

### Qui copier en CC

**Chaque** email d’« intention de `$quelque chose` » (par exemple « intention de mettre en œuvre ») doit inclure en copie &lt;v8-users@googlegroups.com> en plus de &lt;blink-dev@chromium.org>. Ainsi, les autres intégrateurs de V8 sont également tenus informés.

### Lien vers le dépôt de spécifications

Le processus Blink Intent nécessite un document explicatif. Au lieu d’écrire un nouveau document, n’hésitez pas à ajouter un lien vers le dépôt de spécifications correspondant (par exemple [`import.meta`](https://github.com/tc39/proposal-import-meta)).
