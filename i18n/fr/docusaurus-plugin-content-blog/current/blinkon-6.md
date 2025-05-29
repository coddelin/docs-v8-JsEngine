---
title: "V8 à la conférence BlinkOn 6"
author: "l'équipe V8"
date: "2016-07-21 13:33:37"
tags: 
  - présentations
description: "Un aperçu des présentations de l'équipe V8 à BlinkOn 6."
---
BlinkOn est une réunion semestrielle des contributeurs de Blink, V8 et Chromium. BlinkOn 6 a eu lieu à Munich les 16 et 17 juin. L'équipe V8 a donné plusieurs présentations sur l'architecture, la conception, les initiatives de performance et l'implémentation des langages.

<!--truncate-->
Les présentations de V8 à BlinkOn sont intégrées ci-dessous.

## Performances JavaScript en conditions réelles

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Durée : 31:41
- [Slides](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

Présente l'histoire de la façon dont V8 mesure les performances JavaScript, les différentes époques de benchmarking, et une nouvelle technique pour mesurer les chargements de page sur des sites populaires réels avec une répartition détaillée du temps par composant V8.

## Ignition : un interprète pour V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Durée : 36:39
- [Slides](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

Introduit le nouvel interprète Ignition de V8, expliquant l'architecture globale du moteur et comment Ignition affecte l'utilisation de la mémoire et les performances de démarrage.

## Comment nous mesurons et optimisons pour RAIL dans le GC de V8

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Durée : 27:11
- [Slides](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

Explique comment V8 utilise les métriques Response, Animation, Idle, Loading (RAIL) pour cibler une collecte des déchets de faible latence et les optimisations récentes que nous avons réalisées pour réduire les décalages sur mobile.

## ECMAScript 2015 et au-delà

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Durée : 28:52
- [Slides](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

Fournit une mise à jour sur l'implémentation des nouvelles fonctionnalités linguistiques dans V8, la manière dont ces fonctionnalités s'intègrent avec la plateforme web, et le processus de normalisation qui continue de faire évoluer le langage ECMAScript.

## Traçage des wrappers de V8 à Blink (présentation éclair)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- Durée : 2:31
- [Slides](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

Met en lumière le traçage des wrappers entre les objets V8 et Blink et comment ils aident à prévenir les fuites de mémoire et à réduire la latence.
