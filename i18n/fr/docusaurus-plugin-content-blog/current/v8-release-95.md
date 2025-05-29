---
title: "Version v9.5 de V8"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-09-21
tags: 
 - release
description: "La version v9.5 de V8 apporte des API de mise à jour pour l'internationalisation ainsi que la prise en charge de la gestion des exceptions WebAssembly."
tweet: "1440296019623759872"
---
Toutes les quatre semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est issue du dépôt principal Git de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre dernière branche, [V8 version 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5), qui est en bêta jusqu'à sa sortie en coordination avec Chrome 95 Stable dans plusieurs semaines. V8 v9.5 regorge de nouveautés pour les développeurs. Ce post donne un aperçu des points forts en prévision de la sortie.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

Dans V8.1, nous avons lancé l'API [`Intl.DisplayNames`](https://v8.dev/features/intl-displaynames) dans Chrome 81, avec des types supportés comme “langue”, “région”, “script” et “devise”. Avec v9.5, nous avons ajouté deux nouveaux types pris en charge : “calendar” et “dateTimeField”. Ils retournent les noms affichés des différents types de calendriers et champs de date/heure respectivement :

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

Nous avons également amélioré la prise en charge du type “langue” avec une nouvelle option languageDisplay, qui peut être soit “standard” soit “dialecte” (valeur par défaut si non spécifiée) :

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' , languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### Option étendue `timeZoneName`

L'API `Intl.DateTimeFormat` dans v9.5 prend désormais en charge quatre nouvelles valeurs pour l'option `timeZoneName` :

- “shortGeneric” pour afficher le nom du fuseau horaire dans un format générique court non localisé, comme “PT”, “ET”, sans indiquer s'il est en heure d'été.
- “longGeneric” pour afficher le nom du fuseau horaire dans un format générique long non localisé, comme “Heure du Pacifique”, “Heure des montagnes”, sans indiquer s'il est en heure d'été.
- “shortOffset” pour afficher le nom du fuseau horaire dans un format GMT court localisé, comme “GMT-8”.
- “longOffset” pour afficher le nom du fuseau horaire dans un format GMT long localisé, comme “GMT-0800”.

## WebAssembly

### Gestion des exceptions

V8 prend désormais en charge la [proposition de gestion des exceptions WebAssembly (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md), permettant aux modules compilés avec une chaîne d'outils compatible (par exemple, [Emscripten](https://emscripten.org/docs/porting/exceptions.html)) de s'exécuter dans V8. La proposition est conçue pour maintenir un faible coût par rapport aux solutions précédentes utilisant JavaScript.

Par exemple, nous avons compilé l'optimiseur [Binaryen](https://github.com/WebAssembly/binaryen/) en WebAssembly avec les anciennes et les nouvelles implémentations de gestion des exceptions.

Lorsqu'on active la gestion des exceptions, l'augmentation de la taille du code [diminue d'environ 43 % avec l'ancienne gestion des exceptions basée sur JavaScript à seulement 9 % avec la nouvelle fonctionnalité Wasm EH](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209).

Lorsque nous avons exécuté `wasm-opt.wasm -O3` sur quelques gros fichiers de test, la version Wasm EH n'a montré aucune perte de performance par rapport à la ligne de base sans exceptions, tandis que la version basée sur JavaScript prenait environ 30 % de temps supplémentaire.

Cependant, Binaryen utilise les vérifications d'exception avec parcimonie. Dans des charges de travail intensives en exceptions, la différence de performance devrait être encore plus grande.

## API V8

Le fichier d'en-tête principal v8.h a été divisé en plusieurs parties pouvant être incluses séparément. Par exemple, `v8-isolate.h` contient désormais la classe `v8::Isolate`. De nombreux fichiers d'en-tête déclarant des méthodes passant `v8::Local<T>` peuvent désormais importer `v8-forward.h` pour obtenir la définition de `v8::Local` et de tous les types d'objets du tas V8.

Veuillez utiliser `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h` pour obtenir une liste des modifications de l'API.
