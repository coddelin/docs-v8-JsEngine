---
title: "Compilation croisée pour iOS"
description: "Ce document explique comment effectuer une compilation croisée de V8 pour iOS."
---
Cette page sert d'introduction brève à la construction de V8 pour les cibles iOS.

## Exigences

- Une machine hôte sous macOS (OS X) avec Xcode installé.
- Un appareil iOS cible 64 bits (les appareils iOS 32 bits anciens ne sont pas pris en charge).
- V8 v7.5 ou plus récent.
- jitless est une exigence incontournable pour iOS (depuis décembre 2020). Veuillez donc utiliser les options '--expose_gc --jitless'

## Configuration initiale

Suivez [les instructions pour construire V8](/docs/build).

Récupérez des outils supplémentaires nécessaires à la compilation croisée pour iOS en ajoutant `target_os` dans votre fichier de configuration `.gclient`, situé dans le répertoire parent du répertoire source `v8` :

```python
# [... autres contenus de .gclient tels que la variable 'solutions' ...]
target_os = ['ios']
```

Après avoir mis à jour `.gclient`, exécutez `gclient sync` pour télécharger les outils supplémentaires.

## Construction manuelle

Cette section montre comment créer une version monolithique de V8 à utiliser sur un appareil iOS physique ou le simulateur iOS d'Xcode. Le résultat de cette construction est un fichier `libv8_monolith.a` qui contient toutes les bibliothèques V8 ainsi que le snapshot V8.

Configurez les fichiers de construction GN en exécutant `gn args out/release-ios` et en insérant les clés suivantes :

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # "x64" pour une construction de simulateur.
target_os = "ios"
use_custom_libcxx = false             # Utilise libcxx d'Xcode.
v8_enable_i18n_support = false        # Produit un binaire plus petit.
v8_monolithic = true                  # Active la cible v8_monolith.
v8_use_external_startup_data = false  # Le snapshot est inclus dans le binaire.
v8_enable_pointer_compression = false # Non pris en charge sur iOS.
```

Construisez maintenant :

```bash
ninja -C out/release-ios v8_monolith
```

Enfin, ajoutez le fichier généré `libv8_monolith.a` à votre projet Xcode en tant que bibliothèque statique. Pour plus de documentation sur l'intégration de V8 dans votre application, consultez [Commencer avec l'intégration de V8](/docs/embed).
