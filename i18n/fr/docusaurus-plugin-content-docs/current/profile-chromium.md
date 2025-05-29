---
title: &apos;Profilage de Chromium avec V8&apos;
description: &apos;Ce document explique comment utiliser les profileurs CPU et heap de V8 avec Chromium.&apos;
---
[Les profileurs CPU et heap de V8](/docs/profile) sont faciles à utiliser depuis les shells de V8, mais leur utilisation avec Chromium peut sembler déroutante. Cette page devrait vous aider à y voir plus clair.

## Pourquoi l&apos;utilisation des profileurs de V8 avec Chromium est-elle différente de leur utilisation avec les shells de V8 ?

Chromium est une application complexe, contrairement aux shells de V8. Vous trouverez ci-dessous la liste des fonctionnalités de Chromium qui affectent l&apos;utilisation du profileur :

- chaque processus de rendu est un processus séparé (OK, pas exactement chaque, mais omettons ce détail), de sorte qu&apos;ils ne peuvent pas partager le même fichier journal ;
- le sandbox autour du processus de rendu l&apos;empêche d&apos;écrire sur un disque ;
- les outils de développement configurent les profileurs pour leurs propres besoins ;
- le code de journalisation de V8 contient des optimisations pour simplifier les vérifications de l&apos;état de la journalisation.

## Comment exécuter Chromium pour obtenir un profil CPU ?

Voici comment exécuter Chromium pour obtenir un profil CPU dès le début du processus :

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags=&apos;--prof&apos;
```

Veuillez noter que vous ne verrez pas les profils dans les outils de développement, car toutes les données sont enregistrées dans un fichier, pas dans les outils de développement.

### Description des drapeaux

`--no-sandbox` désactive le sandbox du processus de rendu pour que Chrome puisse écrire dans le fichier journal.

`--user-data-dir` est utilisé pour créer un profil vierge, utilisez-le pour éviter les caches et les effets secondaires potentiels des extensions installées (facultatif).

`--incognito` est utilisé pour éviter davantage la pollution de vos résultats (facultatif).

`--js-flags` contient les drapeaux transmis à V8 :

- `--logfile=%t.log` spécifie un modèle de nom pour les fichiers journaux. `%t` est remplacé par l&apos;heure actuelle en millisecondes, de sorte que chaque processus obtienne son propre fichier journal. Vous pouvez utiliser des préfixes et des suffixes si vous le souhaitez, comme ceci : `prefix-%t-suffix.log`. Par défaut, chaque isolat obtient un fichier journal séparé.
- `--prof` indique à V8 d&apos;écrire des informations de profilage statistiques dans le fichier journal.

## Android

Chrome sur Android présente un certain nombre de particularités qui rendent le profilage un peu plus complexe.

- La ligne de commande doit être écrite via `adb` avant de démarrer Chrome sur l&apos;appareil. En conséquence, les guillemets dans la ligne de commande se perdent parfois, et il est préférable de séparer les arguments dans `--js-flags` par une virgule plutôt que d&apos;essayer d&apos;utiliser des espaces et des guillemets.
- Le chemin pour le fichier journal doit être spécifié comme un chemin absolu vers un endroit accessible en écriture sur le système de fichiers Android.
- Le sandbox utilisé pour les processus de rendu sur Android empêche toujours le processus de rendu d&apos;écrire sur les fichiers du système, même avec `--no-sandbox`. Par conséquent, `--single-process` doit être passé pour exécuter le processus de rendu dans le même processus que le processus navigateur.
- Le fichier `.so` est intégré dans l&apos;APK de Chrome, ce qui signifie que la symbolisation doit convertir les adresses mémoire de l&apos;APK vers le fichier `.so` non tronqué dans les builds.

Les commandes suivantes permettent d&apos;activer le profilage sur Android :

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags=&apos;--logfile=/storage/emulated/0/Download/%t.log,--prof&apos;
<Fermez et redémarrez Chrome sur l&apos;appareil Android>
adb pull /storage/emulated/0/Download/<logfile>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <logfile>
```

## Remarques

Sur Windows, assurez-vous d&apos;activer la création de fichiers `.MAP` pour `chrome.dll`, mais pas pour `chrome.exe`.
