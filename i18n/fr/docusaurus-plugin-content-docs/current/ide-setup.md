---
title: 'Configuration de GUI et IDE'
description: 'Ce document contient des astuces spécifiques à l&apos;interface graphique (GUI) et aux IDE pour travailler sur le code source de V8.'
---
Le code source de V8 peut être consulté en ligne avec [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/).

Le dépôt Git de ce projet peut être accessible à l&apos;aide de nombreux autres programmes clients et plug-ins. Consultez la documentation de votre client pour plus d&apos;informations.

## Visual Studio Code et clangd

Pour des instructions sur la configuration de VSCode pour V8, voir ce [document](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/). C&apos;est actuellement (2021) la configuration recommandée.

## Eclipse

Pour des instructions sur la configuration d&apos;Eclipse pour V8, voir ce [document](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/). Note : Depuis 2020, l&apos;indexation de V8 avec Eclipse ne fonctionne pas bien.

## Visual Studio Code et cquery

VSCode et cquery offrent de bonnes capacités de navigation dans le code. Ils permettent des opérations telles que « aller à la définition » ainsi que « trouver toutes les références » pour les symboles C++ et fonctionnent assez bien. Cette section décrit comment configurer une installation de base sur un système *nix.

### Installer VSCode

Installez VSCode de votre manière préférée. Le reste de ce guide suppose que vous pouvez exécuter VSCode depuis la ligne de commande via la commande `code`. 

### Installer cquery

Clonez cquery depuis [cquery](https://github.com/cquery-project/cquery) dans un répertoire de votre choix. Nous utiliserons `CQUERY_DIR="$HOME/cquery"` dans ce guide.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

Si quelque chose ne fonctionne pas, assurez-vous de consulter le [guide de démarrage cquery](https://github.com/cquery-project/cquery/wiki).

Vous pouvez utiliser `git pull && git submodule update` pour mettre à jour cquery ultérieurement (n&apos;oubliez pas de recompiler via `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`).

### Installer et configurer le plugin cquery pour VSCode

Installez l&apos;extension cquery depuis le marketplace dans VSCode. Ouvrez VSCode dans votre répertoire de V8 :

```bash
cd v8
code .
```

Accédez aux paramètres dans VSCode, par exemple, via le raccourci <kbd>Ctrl</kbd> + <kbd>,</kbd>.

Ajoutez ce qui suit à votre configuration de l&apos;espace de travail, en remplaçant `YOURUSERNAME` et `YOURV8CHECKOUTDIR` de manière appropriée.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### Fournir `compile_commands.json` à cquery

La dernière étape consiste à générer un compile_commands.json pour cquery. Ce fichier contiendra les lignes de commande spécifiques du compilateur utilisées pour bâtir V8 avec cquery. Exécutez la commande suivante dans le répertoire V8 :

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

Il sera nécessaire d&apos;exécuter cette commande régulièrement pour permettre à cquery de découvrir de nouveaux fichiers sources. En particulier, vous devriez toujours la relancer après un changement dans un fichier `BUILD.gn`.

### Autres paramètres utiles

La fermeture automatique des parenthèses dans Visual Studio Code ne fonctionne pas très bien. Elle peut être désactivée avec :

```json
"editor.autoClosingBrackets": false
```

Dans les paramètres utilisateur.

Les masques d&apos;exclusion suivants permettent d&apos;éviter des résultats indésirables lors de la recherche (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>) :

```js
"files.exclude": {
  "**/.vscode": true,  // ceci est une valeur par défaut
},
"search.exclude": {
  "**/out*": true,     // ceci est une valeur par défaut
  "**/build*": true    // ceci est une valeur par défaut
},
```
