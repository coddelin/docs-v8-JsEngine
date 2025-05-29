---
title: "Cross-compilation et débogage pour ARM/Android"
description: "Ce document explique comment cross-compiler V8 pour ARM/Android, et comment le déboguer."
---
Tout d'abord, assurez-vous de pouvoir [compiler avec GN](/docs/build-gn).

Ajoutez ensuite `android` à votre fichier de configuration `.gclient`.

```python
target_os = ['android']  # Ajoutez ceci pour inclure les outils Android.
```

Le champ `target_os` est une liste, donc si vous compilez également sous Unix, cela ressemblera à ceci :

```python
target_os = ['android', 'unix']  # Multiples systèmes d'exploitation cibles.
```

Exécutez `gclient sync`, et vous obtiendrez une grande synchronisation sous `./third_party/android_tools`.

Activez le mode développeur sur votre téléphone ou tablette et activez le débogage USB, via les instructions [ici](https://developer.android.com/studio/run/device.html). En plus, ajoutez le pratique outil [`adb`](https://developer.android.com/studio/command-line/adb.html) à votre PATH. Il se trouve dans votre synchronisation à `./third_party/android_sdk/public/platform-tools`.

## Utiliser `gm`

Utilisez [le script `tools/dev/gm.py`](/docs/build-gn#gm) pour compiler automatiquement les tests V8 et les exécuter sur l'appareil.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

Cette commande transfère les binaires et les tests dans le répertoire `/data/local/tmp/v8` sur l'appareil.

## Compilation manuelle

Utilisez `v8gen.py` pour générer une version ARM de production ou de débogage :

```bash
tools/dev/v8gen.py arm.release
```

Ensuite, exécutez `gn args out.gn/arm.release` et assurez-vous d'avoir les clés suivantes :

```python
target_os = "android"      # Ces lignes doivent être modifiées manuellement.
target_cpu = "arm"         # car v8gen.py suppose une build simulateur.
v8_target_cpu = "arm"
is_component_build = false
```

Les clés devraient être identiques pour les builds de débogage. Si vous compilez pour un appareil arm64 tel que le Pixel C, qui prend en charge des binaires 32 bits et 64 bits, les clés devraient ressembler à ceci :

```python
target_os = "android"      # Ces lignes doivent être modifiées manuellement.
target_cpu = "arm64"       # car v8gen.py suppose une build simulateur.
v8_target_cpu = "arm64"
is_component_build = false
```

Ensuite, compilez :

```bash
ninja -C out.gn/arm.release d8
```

Utilisez `adb` pour copier les fichiers binaires et les fichiers snapshot sur le téléphone :

```bash
adb shell 'mkdir -p /data/local/tmp/v8/bin'
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
V8 version 5.8.0 (candidate)
d8> 'w00t!'
"w00t!"
d8>
```

## Débogage

### d8

Le débogage à distance de `d8` sur un appareil Android est relativement simple. D'abord, démarrez `gdbserver` sur l'appareil Android :

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

Ensuite, connectez-vous au serveur à partir de votre appareil hôte.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` et `gdbserver` doivent être compatibles entre eux. En cas de doute, utilisez les binaires du [NDK Android](https://developer.android.com/ndk). Notez que par défaut, le binaire `d8` est stripé (les informations de débogage sont supprimées), mais `$OUT_DIR/exe.unstripped/d8` contient le binaire non stripé.

### Journalisation

Par défaut, certains des outputs de débogage de `d8` se retrouvent dans les logs système Android, qui peuvent être extraits via [`logcat`](https://developer.android.com/studio/command-line/logcat). Malheureusement, parfois une partie des outputs de débogage spécifiques est partagée entre les logs système et `adb`, et parfois une partie semble totalement manquante. Pour éviter ces problèmes, il est recommandé d'ajouter le paramètre suivant dans les `gn args` :

```python
v8_android_log_stdout = true
```

### Problèmes en virgule flottante

Le paramètre `gn args` `arm_float_abi = "hard"`, utilisé par le bot de stress GC Arm de V8, peut entraîner des comportements complètement absurdes sur du matériel différent de celui utilisé par le bot de stress GC (par exemple, sur le Nexus 7).

## Utiliser Sourcery G++ Lite

Le suite cross-compilateur Sourcery G++ Lite est une version gratuite de Sourcery G++ de [CodeSourcery](http://www.codesourcery.com/). Il existe une page pour la [chaîne d'outils GNU pour les processeurs ARM](http://www.codesourcery.com/sgpp/lite/arm). Déterminez la version requise pour votre combinaison hôte/cible.

Les instructions suivantes utilisent [2009q1-203 pour ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858), et si vous utilisez une autre version, modifiez les URL et `TOOL_PREFIX` ci-dessous en conséquence.

### Installation sur l'hôte et la cible

Le moyen le plus simple de paramétrer cela est d'installer le package complet Sourcery G++ Lite à la fois sur l'hôte et la cible au même emplacement. Cela garantira que toutes les bibliothèques requises sont disponibles des deux côtés. Si vous souhaitez utiliser les bibliothèques par défaut sur l'hôte, il n'est pas nécessaire d'installer quoi que ce soit sur la cible.

Le script suivant s'installe dans `/opt/codesourcery` :

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## Profil

- Compiler un binaire, le transférer sur l'appareil, en conserver une copie sur l'hôte :

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- Obtenir un journal de profilage et le copier sur l'hôte :

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- Ouvrez `v8.log` dans votre éditeur préféré et modifiez la première ligne pour correspondre au chemin complet du binaire `d8-version.under.test` sur votre station de travail (au lieu du chemin `/data/local/tmp/v8/bin/` qu'il avait sur l'appareil)

- Exécutez le processeur de ticks avec le `d8` de l'hôte et un binaire `nm` approprié :

    ```bash
    cp out/x64.release/d8 .  # requis uniquement une fois
    cp out/x64.release/natives_blob.bin .  # requis uniquement une fois
    cp out/x64.release/snapshot_blob.bin .  # requis uniquement une fois
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
