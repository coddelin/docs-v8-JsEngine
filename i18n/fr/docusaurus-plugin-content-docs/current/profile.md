---
title: &apos;Utilisation du profileur basé sur échantillons de V8&apos;
description: &apos;Ce document explique comment utiliser le profileur basé sur échantillons de V8.&apos;
---
V8 dispose d'un profilage intégré basé sur des échantillons. Le profilage est désactivé par défaut, mais peut être activé via l'option de ligne de commande `--prof`. L'échantillonneur enregistre les piles de code JavaScript et de code C/C++.

## Construction

Construisez l'interpréteur `d8` en suivant les instructions de [Construction avec GN](/docs/build-gn).

## Ligne de commande

Pour commencer le profilage, utilisez l'option `--prof`. Lors du profilage, V8 génère un fichier `v8.log` contenant les données de profilage.

Windows :

```bash
build\Release\d8 --prof script.js
```

Autres plateformes (remplacez `ia32` par `x64` si vous souhaitez profiler la version `x64`) :

```bash
out/ia32.release/d8 --prof script.js
```

## Traiter la sortie générée

Le traitement des fichiers journaux se fait à l'aide de scripts JavaScript exécutés par l'interpréteur `d8`. Pour que cela fonctionne, un binaire `d8` (ou lien symbolique, ou `d8.exe` sous Windows) doit se trouver à la racine de votre copie de V8, ou dans le chemin spécifié par la variable d'environnement `D8_PATH`. Remarque : ce binaire est utilisé uniquement pour traiter le journal, et non pour le profilage proprement dit, donc la version importe peu.

**Assurez-vous que `d8` utilisé pour l'analyse n'a pas été construit avec `is_component_build` !**

Windows :

```bash
tools\windows-tick-processor.bat v8.log
```

Linux :

```bash
tools/linux-tick-processor v8.log
```

macOS :

```bash
tools/mac-tick-processor v8.log
```

## Interface web pour `--prof`

Pré-traitez le journal avec `--preprocess` (pour résoudre les symboles C++, etc.).

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

Ouvrez [`tools/profview/index.html`](https://v8.dev/tools/head/profview) dans votre navigateur et sélectionnez le fichier `v8.json`.

## Exemple de sortie

```
Résultat du profilage statistique provenant de benchmarks\v8.log, (4192 ticks, 0 non comptabilisés, 0 exclus).

 [Bibliothèques partagées] :
   ticks  total  nonlib   nom
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript] :
   ticks  total  nonlib   nom
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++] :
   ticks  total  nonlib   nom
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC] :
   ticks  total  nonlib   nom
    458   10.9%

 [Profil bas (lourd)] :
  Remarque : le pourcentage indique la part d’un appelant particulier dans le total
  des appels de son parent.
  Les appelants occupant moins de 2.0% ne sont pas montrés.

   ticks parent  nom
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## Profilage des applications web

Les machines virtuelles hautement optimisées d'aujourd'hui peuvent exécuter les applications web à une vitesse fulgurante. Mais il ne faut pas se fier uniquement à elles pour obtenir des performances exceptionnelles : un algorithme soigneusement optimisé ou une fonction moins coûteuse peut souvent atteindre des améliorations de vitesse plusieurs fois meilleures sur tous les navigateurs. [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)’ [CPU Profiler](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) vous aide à analyser les goulots d'étranglement de votre code. Mais parfois, vous devez aller plus loin et être plus précis : c'est là que le profileur interne de V8 est utile.

Utilisons ce profileur pour examiner la démo [Mandelbrot Explorer](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/) que Microsoft [a publiée](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) avec IE10. Après la publication de la démo, V8 a corrigé un bug qui ralentissait inutilement la computation (d'où les faibles performances de Chrome dans le billet de blog de la démo) et a, en outre, optimisé le moteur en implémentant une approximation plus rapide de `exp()` que celle fournie par les bibliothèques systèmes standard. Suite à ces changements, **la démo a fonctionné 8× plus rapidement qu'auparavant mesuré** dans Chrome.

Mais que faire si vous voulez que le code s'exécute plus rapidement sur tous les navigateurs ? Vous devriez d'abord **comprendre ce qui occupe votre CPU**. Exécutez Chrome (Windows et Linux [Canary](https://tools.google.com/dlpage/chromesxs)) avec les options de ligne de commande suivantes, ce qui lui permet de générer des informations sur les ticks du profileur (dans le fichier `v8.log`) pour l'URL que vous spécifiez, ce qui dans notre cas était une version locale de la démo Mandelbrot sans web workers :

```bash
./chrome --js-flags=&apos;--prof&apos; --no-sandbox &apos;http://localhost:8080/&apos;
```

Lors de la préparation du cas de test, assurez-vous qu'il commence son travail immédiatement après le chargement et fermez Chrome une fois le calcul terminé (appuyez sur Alt+F4), afin que seuls les ticks pertinents soient dans le fichier journal. Notez également que les web workers ne sont pas encore correctement profilés avec cette technique.

Ensuite, traitez le fichier `v8.log` avec le script `tick-processor` fourni avec V8 (ou la nouvelle version pratique en ligne) :

```bash
v8/tools/linux-tick-processor v8.log
```

Voici un extrait intéressant de la sortie traitée qui devrait attirer votre attention :

```
Résultat du profiling statistique depuis null, (14306 ticks, 0 non comptabilisé, 0 exclu).
 [Bibliothèques partagées] :
   ticks  total  nonlib   nom
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

La section supérieure montre que V8 passe plus de temps dans une bibliothèque système spécifique au système d'exploitation que dans son propre code. Voyons ce qui en est responsable en examinant la section de sortie “bottom up”, où vous pouvez lire les lignes indentées comme "a été appelé par" (et les lignes commençant par un `*` signifient que la fonction a été optimisée par TurboFan) :

```
[Profil "bottom up" (lourd)] :
  Remarque : le pourcentage montre la part d'un appelant particulier dans le total
  du nombre d'appels de son parent.
  Les appelants occupant moins de 2.0% ne sont pas affichés.

   ticks parent  nom
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

Plus de **44% du temps total est passé à exécuter la fonction `exp()` dans une bibliothèque système** ! En ajoutant un certain surcoût pour l'appel des bibliothèques système, cela signifie qu'environ deux tiers du temps global sont consacrés à l'évaluation de `Math.exp()`.

Si vous regardez le code JavaScript, vous verrez que `exp()` est utilisé uniquement pour produire une palette de gris lisse. Il existe d'innombrables façons de produire une palette de gris lisse, mais supposons que vous aimez vraiment les gradients exponentiels. C'est là qu'entre en jeu l'optimisation algorithmique.

Vous remarquerez que `exp()` est appelé avec un argument dans la plage `-4 < x < 0`, nous pouvons donc le remplacer en toute sécurité par son [approximation de Taylor](https://en.wikipedia.org/wiki/Taylor_series) pour cette plage, qui offre le même gradient lisse avec seulement une multiplication et quelques divisions :

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) pour -4 < x < 0
```

Modifier l'algorithme de cette manière augmente les performances de 30% supplémentaires par rapport à la dernière version Canary et 5× par rapport à la bibliothèque système basée sur `Math.exp()` sur Chrome Canary.

![](/_img/docs/profile/mandelbrot.png)

Cet exemple montre comment le profileur interne de V8 peut vous aider à comprendre plus profondément les points de blocage de votre code, et qu'un algorithme plus intelligent peut améliorer les performances encore davantage.

Pour en savoir plus sur la façon dont les benchmarks représentent les applications web complexes et exigeantes d'aujourd'hui, lisez [Comment V8 mesure les performances dans le monde réel](/blog/real-world-performance).
