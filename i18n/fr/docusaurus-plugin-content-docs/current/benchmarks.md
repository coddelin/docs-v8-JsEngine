---
title: 'Exécution des benchmarks localement'
description: 'Ce document explique comment exécuter les suites de benchmarks classiques dans d8.'
---
Nous avons un flux de travail simple pour exécuter les benchmarks « classiques » de SunSpider, Kraken et Octane. Vous pouvez les exécuter avec différents binaires et combinaisons de flags, et les résultats sont moyennés sur plusieurs exécutions.

## CPU

Créez le shell `d8` en suivant les instructions sur [Construire avec GN](/docs/build-gn).

Avant d'exécuter des benchmarks, assurez-vous de régler le gouverneur d'échelle de fréquence de votre CPU sur performance.

```bash
sudo tools/cpu.sh fast
```

Les commandes comprises par `cpu.sh` sont

- `fast`, performance (alias pour `fast`)
- `slow`, économie d'énergie (alias pour `slow`)
- `default`, à la demande (alias pour `default`)
- `dualcore` (désactive tous les cœurs sauf deux), dual (alias pour `dualcore`)
- `allcores` (réactive tous les cœurs disponibles), all (alias pour `allcores`).

## CSuite

`CSuite` est notre outil simple d'exécution de benchmarks :

```bash
test/benchmarks/csuite/csuite.py
    (sunspider | kraken | octane)
    (baseline | compare)
    <path to d8 binary>
    [-x "<optional extra d8 command-line flags>"]
```

Commencez par exécuter en mode `baseline` pour créer les références, puis en mode `compare` pour obtenir les résultats. Par défaut, `CSuite` effectue 10 exécutions pour Octane, 100 pour SunSpider et 80 pour Kraken, mais vous pouvez les remplacer par des résultats plus rapides avec l'option `-r`.

`CSuite` crée deux sous-répertoires dans le répertoire où vous l'exécutez :

1. `./_benchmark_runner_data` — ceci est la sortie mise en cache des N exécutions.
1. `./_results` — il écrit les résultats dans le fichier master ici. Vous pouvez sauvegarder ces fichiers sous différents noms, et ils apparaîtront en mode comparatif.

En mode comparatif, vous utiliserez naturellement un binaire différent ou au moins des flags différents.

## Exemple d'utilisation

Disons que vous avez construit deux versions de `d8`, et que vous voulez voir ce qui se passe avec SunSpider. Commencez par créer des références :

```bash
$ test/benchmarks/csuite/csuite.py sunspider baseline out.gn/master/d8
Wrote ./_results/master.
Exécutez SunSpider à nouveau en mode comparatif pour voir les résultats.
```

Comme suggéré, exécutez à nouveau mais cette fois en mode `compare` avec un binaire différent:

```
$ test/benchmarks/csuite/csuite.py sunspider compare out.gn/x64.release/d8

                               benchmark:    score |   master |      % |
===================================================+==========+========+
                       3d-cube-sunspider:     13.9 S     13.4 S   -3.6 |
                      3d-morph-sunspider:      8.6 S      8.4 S   -2.3 |
                   3d-raytrace-sunspider:     15.1 S     14.9 S   -1.3 |
           access-binary-trees-sunspider:      3.7 S      3.9 S    5.4 |
               access-fannkuch-sunspider:     11.9 S     11.8 S   -0.8 |
                  access-nbody-sunspider:      4.6 S      4.8 S    4.3 |
                 access-nsieve-sunspider:      8.4 S      8.1 S   -3.6 |
      bitops-3bit-bits-in-byte-sunspider:      2.0 |      2.0 |        |
           bitops-bits-in-byte-sunspider:      3.7 S      3.9 S    5.4 |
            bitops-bitwise-and-sunspider:      2.7 S      2.9 S    7.4 |
            bitops-nsieve-bits-sunspider:      5.3 S      5.6 S    5.7 |
         controlflow-recursive-sunspider:      3.8 S      3.6 S   -5.3 |
                    crypto-aes-sunspider:     10.9 S      9.8 S  -10.1 |
                    crypto-md5-sunspider:      7.0 |      7.4 S    5.7 |
                   crypto-sha1-sunspider:      9.2 S      9.0 S   -2.2 |
             date-format-tofte-sunspider:      9.8 S      9.9 S    1.0 |
             date-format-xparb-sunspider:     10.3 S     10.3 S        |
                   math-cordic-sunspider:      6.1 S      6.2 S    1.6 |
             math-partial-sums-sunspider:     20.2 S     20.1 S   -0.5 |
            math-spectral-norm-sunspider:      3.2 S      3.0 S   -6.2 |
                    regexp-dna-sunspider:      7.6 S      7.8 S    2.6 |
                 string-base64-sunspider:     14.2 S     14.0 |   -1.4 |
                  string-fasta-sunspider:     12.8 S     12.6 S   -1.6 |
               string-tagcloud-sunspider:     18.2 S     18.2 S        |
            string-unpack-code-sunspider:     20.0 |     20.1 S    0.5 |
         string-validate-input-sunspider:      9.4 S      9.4 S        |
                               SunSpider:    242.6 S    241.1 S   -0.6 |
---------------------------------------------------+----------+--------+
```

La sortie de l’exécution précédente est mise en cache dans un sous-répertoire créé dans le répertoire courant (`_benchmark_runner_data`). Les résultats agrégés sont également mis en cache, dans le répertoire `_results`. Ces répertoires peuvent être supprimés après avoir exécuté l’étape comparatif.

Une autre situation est lorsque vous avez le même binaire, mais souhaitez voir les résultats de flags différents. Vous voulez, par exemple, voir comment Octane fonctionne sans un compilateur d'optimisation. Commencez par la base :

```bash

$ test/benchmarks/csuite/csuite.py -r 1 octane baseline out.gn/x64.release/d8

Normalement, octane nécessite 10 exécutions pour obtenir des résultats stables.
Écrit /usr/local/google/home/mvstanton/src/v8/_results/master.
Relancez octane avec le mode de comparaison pour voir les résultats.
```

Notez l'avertissement selon lequel une seule exécution ne suffit généralement pas pour être sûr de nombreuses optimisations de performances. Cependant, notre « changement » devrait avoir un effet reproductible avec une seule exécution ! Comparons maintenant, en passant l'option `--noopt` pour désactiver [TurboFan](/docs/turbofan) :

```bash
$ test/benchmarks/csuite/csuite.py -r 1 octane compare out.gn/x64.release/d8 \
  -x "--noopt"

Normalement, octane nécessite 10 exécutions pour obtenir des résultats stables.
                               benchmark:    score |   master |      % |
===================================================+==========+========+
                                Richards:    973.0 |  26770.0 |  -96.4 |
                               DeltaBlue:   1070.0 |  57245.0 |  -98.1 |
                                  Crypto:    923.0 |  32550.0 |  -97.2 |
                                RayTrace:   2896.0 |  75035.0 |  -96.1 |
                             EarleyBoyer:   4363.0 |  42779.0 |  -89.8 |
                                  RegExp:   2881.0 |   6611.0 |  -56.4 |
                                   Splay:   4241.0 |  19489.0 |  -78.2 |
                            SplayLatency:  14094.0 |  57192.0 |  -75.4 |
                            NavierStokes:   1308.0 |  39208.0 |  -96.7 |
                                   PdfJS:   6385.0 |  26645.0 |  -76.0 |
                                Mandreel:    709.0 |  33166.0 |  -97.9 |
                         MandreelLatency:   5407.0 |  97749.0 |  -94.5 |
                                 Gameboy:   5440.0 |  54336.0 |  -90.0 |
                                CodeLoad:  25631.0 |  25282.0 |    1.4 |
                                   Box2D:   3288.0 |  67572.0 |  -95.1 |
                                    zlib:  59154.0 |  58775.0 |    0.6 |
                              Typescript:  12700.0 |  23310.0 |  -45.5 |
                                  Octane:   4070.0 |  37234.0 |  -89.1 |
---------------------------------------------------+----------+--------+
```

Sympa de voir que `CodeLoad` et `zlib` ont été relativement épargnés.

## Sous le capot

`CSuite` est basé sur deux scripts dans le même répertoire, `benchmark.py` et `compare-baseline.py`. Il y a plus d'options dans ces scripts. Par exemple, vous pouvez enregistrer plusieurs bases et effectuer des comparaisons à 3, 4 ou 5 voies. `CSuite` est optimisé pour une utilisation rapide et sacrifie une certaine flexibilité.
