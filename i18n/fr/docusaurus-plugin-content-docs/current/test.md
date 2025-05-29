---
title: &apos;Test&apos;
description: &apos;Ce document explique le cadre de test qui fait partie du dépôt V8.&apos;
---
V8 inclut un cadre de test qui vous permet de tester le moteur. Ce cadre vous permet d’exécuter nos propres suites de tests incluses avec le code source et d’autres, comme [la suite de tests Test262](https://github.com/tc39/test262).

## Exécuter les tests V8

[En utilisant `gm`](/docs/build-gn#gm), vous pouvez simplement ajouter `.check` à n’importe quel objectif de compilation pour exécuter les tests, par exemple :

```bash
gm x64.release.check
gm x64.optdebug.check  # recommandé : raisonnablement rapide, avec DCHECKs.
gm ia32.check
gm release.check
gm check  # compile et teste toutes les plateformes par défaut
```

`gm` compile automatiquement les cibles nécessaires avant d’exécuter les tests. Vous pouvez également limiter les tests à exécuter :

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

Si vous avez déjà compilé V8, vous pouvez exécuter les tests manuellement :

```bash
tools/run-tests.py --outdir=out/ia32.release
```

Encore une fois, vous pouvez spécifier les tests à exécuter :

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

Exécutez le script avec `--help` pour découvrir ses autres options.

## Exécuter plus de tests

L’ensemble par défaut des tests exécutés n’inclut pas tous les tests disponibles. Vous pouvez spécifier des suites de tests supplémentaires sur la ligne de commande de `gm` ou `run-tests.py` :

- `benchmarks` (juste pour vérifier le fonctionnement ; ne produit pas de résultats de benchmark !)
- `mozilla`
- `test262`
- `webkit`

## Exécuter des microbenchmarks

Sous `test/js-perf-test`, nous avons des microbenchmarks pour suivre les performances des fonctionnalités. Il existe un exécuteur spécial pour ceux-ci : `tools/run_perf.py`. Exécutez-les comme suit :

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

Si vous ne voulez pas exécuter tous les `JSTests`, vous pouvez fournir un argument `filter` :

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## Mettre à jour les attentes des tests inspecteurs

Après avoir mis à jour votre test, vous devrez peut-être régénérer le fichier des attentes associé. Vous pouvez y parvenir en exécutant :

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

Cela peut également être utile si vous souhaitez savoir comment la sortie de votre test a changé. Régénérez d’abord le fichier attendu en utilisant la commande ci-dessus, puis consultez la différence avec :

```bash
git diff
```

## Mettre à jour les attentes du bytecode (rebaselining)

Parfois, les attentes du bytecode peuvent changer, entraînant des échecs `cctest`. Pour mettre à jour les fichiers golden, compilez `test/cctest/generate-bytecode-expectations` en exécutant :

```bash
gm x64.release generate-bytecode-expectations
```

…puis mettez à jour l’ensemble par défaut des entrées en transmettant l’option `--rebaseline` au binaire généré :

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

Les fichiers golden mis à jour sont maintenant disponibles dans `test/cctest/interpreter/bytecode_expectations/`.

## Ajouter un nouveau test d’attentes de bytecode

1. Ajoutez un nouveau cas de test à `cctest/interpreter/test-bytecode-generator.cc` et spécifiez un fichier golden avec le même nom de test.

1. Compilez `generate-bytecode-expectations` :

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. Exécutez

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    où `testcase.js` contient le cas de test JavaScript ajouté à `test-bytecode-generator.cc` et `testname` est le nom du test défini dans `test-bytecode-generator.cc`.
