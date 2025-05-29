---
title: "Débogage Arm avec le simulateur"
description: 'Le simulateur et le débogueur Arm peuvent être très utiles lorsqu'on travaille avec la génération de code V8.'
---
Le simulateur et le débogueur peuvent être très utiles lorsqu'on travaille avec la génération de code V8.

- Il est pratique car il permet de tester la génération de code sans avoir accès au matériel réel.
- Pas besoin de [cross](/docs/cross-compile-arm) ou de compilation native.
- Le simulateur prend totalement en charge le débogage du code généré.

Veuillez noter que ce simulateur est conçu pour les besoins de V8. Seules les fonctionnalités utilisées par V8 sont implémentées, et il se peut que vous rencontriez des fonctionnalités ou des instructions non implémentées. Dans ce cas, n'hésitez pas à les implémenter et à soumettre le code !

- [Compilation](#compiling)
- [Démarrage du débogueur](#start_debug)
- [Commandes de débogage](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [Fonctionnalités supplémentaires des points d'arrêt](#extra)
    - [32 bits : `stop()`](#arm32_stop)
    - [64 bits : `Debug()`](#arm64_debug)

## Compilation pour Arm avec le simulateur

Par défaut sur un hôte x86, la compilation pour Arm avec [gm](/docs/build-gn#gm) vous donnera une version simulée :

```bash
gm arm64.debug # Pour une version 64 bits ou...
gm arm.debug   # ... pour une version 32 bits.
```

Vous pouvez également construire la configuration `optdebug` car la version `debug` peut être un peu lente, surtout si vous voulez exécuter la suite de tests V8.

## Démarrage du débogueur

Vous pouvez démarrer le débogueur immédiatement depuis la ligne de commande après `n` instructions :

```bash
out/arm64.debug/d8 --stop_sim_at <n> # Ou out/arm.debug/d8 pour une version 32 bits.
```

Sinon, vous pouvez générer une instruction de point d'arrêt dans le code généré :

Nativement, les instructions de point d'arrêt entraînent l'arrêt du programme avec un signal `SIGTRAP`, vous permettant de déboguer le problème avec gdb. Cependant, si vous exécutez avec un simulateur, une instruction de point d'arrêt dans le code généré vous plongera plutôt dans le débogueur du simulateur.

Vous pouvez générer un point d'arrêt de plusieurs manières en utilisant `DebugBreak()` depuis [Torque](/docs/torque-builtins), depuis le [CodeStubAssembler](/docs/csa-builtins), comme un nœud dans un passage [TurboFan](/docs/turbofan), ou directement en utilisant un assembleur.

Ici, nous nous concentrons sur le débogage du code natif de bas niveau, alors regardons la méthode de l'assembleur :

```cpp
TurboAssembler::DebugBreak();
```

Disons que nous avons une fonction compilée appelée `add` compilée avec [TurboFan](/docs/turbofan) et que nous souhaitons arrêter au début. Étant donné un exemple `test.js` :



```js
// Notre fonction optimisée.
function add(a, b) {
  return a + b;
}

// Code de triche typique activé par --allow-natives-syntax.
%PrepareFunctionForOptimization(add);

// Donner au compilateur des commentaires de type pour qu'il spéculera que `a` et `b` sont
// des nombres.
add(1, 3);

// Et forcer son optimisation.
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

Pour ce faire, nous pouvons nous connecter au [générateur de code](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode) de TurboFan et accéder à l'assembleur pour insérer notre point d'arrêt :

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // Vérifiez si nous sommes en train d'optimiser, puis recherchez le nom de la fonction actuelle et
  // insérez un point d'arrêt.
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

Et lançons-le :

```simulateur
$ d8 \
    # Activer les fonctions de code de triche JS '%'.
    --allow-natives-syntax \
    # Désassembler notre fonction.
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # Désactiver les atténuations spectre pour plus de lisibilité.
    --no-untrusted-code-mitigations \
    test.js
--- Source brute ---
(a, b) {
  return a + b;
}


--- Code optimisé ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

Instructions (size = 504)
0x7f0900082be0     0  d45bd600       début du pool de constantes (num_const = 6)
0x7f0900082be4     4  00000000       constant
0x7f0900082be8     8  00000001       constant
0x7f0900082bec     c  75626544       constant
0x7f0900082bf0    10  65724267       constant
0x7f0900082bf4    14  00006b61       constant
0x7f0900082bf8    18  d45bd7e0       constant
                  -- Prologue : vérifier registre de début de code --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (addr 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (addr 0x7f0900082c14)
                  Message d'abandon :
                  Mauvaise valeur dans le registre de début de code passé
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- Trampoline intégré vers Abandon --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (addr 0x00007f0900082db8)    ;; cible hors tas
0x7f0900082c10    30  d63f0200       blr x16
                  -- Prologue : vérifier la désoptimisation --
                  [ Pointer Décompressé Étiqueté
0x7f0900082c14    34  b85d0050       ldur w16, [x2, #-48]
0x7f0900082c18    38  8b100350       add x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       ldur w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (adresse 0x7f0900082c2c)
                  -- Trampoline intégré à CompileLazyDeoptimizedCode --
0x7f0900082c24    44  58000c31       ldr x17, pc+388 (adresse 0x00007f0900082da8)    ;; cible hors tas
0x7f0900082c28    48  d61f0220       br x17
                  -- Début B0 (construction de la trame) --
(...)

--- Fin du code ---
# Interruption du débogueur 0 : DebugBreak
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (adresse 0x7f0900082be0)
sim>
```

Nous pouvons voir que nous nous sommes arrêtés au début de la fonction optimisée et le simulateur nous a donné une invite !

Notez que c'est juste un exemple et que V8 évolue rapidement, donc les détails peuvent varier. Mais vous devriez pouvoir le faire partout où un assembleur est disponible.

## Commandes de débogage

### Commandes courantes

Entrez `help` dans l'invite du débogueur pour obtenir les détails sur les commandes disponibles. Celles-ci incluent les commandes classiques de type gdb, telles que `stepi`, `cont`, `disasm`, etc. Si le simulateur est exécuté sous gdb, la commande `gdb` cèdera le contrôle à gdb. Vous pouvez ensuite utiliser `cont` depuis gdb pour revenir au débogueur.

### Commandes spécifiques à l'architecture

Chaque architecture cible implémente son propre simulateur et débogueur, donc l'expérience et les détails varieront.

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $register` (alias `po`)

Décrire un objet JS contenu dans un registre.

Par exemple, disons que cette fois-ci nous exécutons [notre exemple](#test.js) sur une version 32 bits du simulateur Arm. Nous pouvons examiner les arguments entrants passés dans des registres :

```simulator
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
Le simulateur a rencontré un arrêt, s'arrêtant à l'instruction suivante :
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1 : 0x4b60ffb1 1264648113
# L'objet fonction actuel est passé avec r1.
sim> printobject r1
r1 :
0x4b60ffb1 : [Function] in OldSpace
 - map : 0x485801f9 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - prototype : 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - éléments : 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - prototype de la fonction :
 - carte initiale :
 - infos partagées : 0x4b60fe9d <SharedFunctionInfo add>
 - nom : 0x5b701c5d <String[#3] : add>
 - formal_parameter_count : 2
 - type : FonctionNormale
 - contexte : 0x4b600c65 <NativeContext[261]>
 - code : 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - code source : (a, b) {
  return a + b ;
}
(...)

# Maintenant, imprimez le contexte JS actuel passé avec r7.
sim> printobject r7
r7 :
0x449c0c65 : [NativeContext] dans OldSpace
 - map : 0x561000b9 <Map>
 - longueur : 261
 - informations sur le scope : 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - précédent : 0
 - contexte natif : 0x449c0c65 <NativeContext[261]>
           0 : 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1 : 0
           2 : 0x449cdaf5 <JSObject>
           3 : 0x58480c25 <Objet Global JS>
           4 : 0x58485499 <Autre objet dans le tas (EMBEDDER_DATA_ARRAY_TYPE)>
           5 : 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6 : 0x3408027d <undefined>
           7 : 0x449c75c1 <FonctionJS ArrayBuffer (sfi = 0x4be8ade1)>
           8 : 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9 : 0x449c967d <FonctionJS arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10 : 0x449c8dbd <FonctionJS Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (alias `t`)

Activer ou désactiver la traçabilité des instructions exécutées.

Lorsqu'il est activé, le simulateur imprimera les instructions désassemblées au fur et à mesure de leur exécution. Si vous exécutez une version Arm 64 bits, le simulateur peut également tracer les changements des valeurs des registres.

Vous pouvez également activer ceci depuis la ligne de commande avec le drapeau `--trace-sim` pour activer la traçabilité dès le début.

Avec le même [exemple](#test.js) :

```simulateur
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim est requis sur Arm 64 bits pour activer le désassemblage
    # lors de la traçabilité.
    --debug-sim test.js
# Interruption du débogueur 0 : DebugBreak
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (adresse 0x7f1e00082be0)
sim> trace
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (adresse 0x7f1e00082be0)
Activation du désassemblage, traçage des registres et des écritures mémoire

# Pause à l'adresse de retour stockée dans le registre lr.
sim> break lr
Pause configurée à 0x7f1f880abd28
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (adresse 0x7f1e00082be0)

# Continuer traçera l'exécution de la fonction jusqu'à ce que nous revenions, permettant
# de comprendre ce qui se passe.
sim> continue
#    x0 : 0x00007f1e00082ba1
#    x1 : 0x00007f1e08250125
#    x2 : 0x00007f1e00082be0
(...)

# Nous chargeons d'abord les arguments 'a' et 'b' de la pile et vérifions s'ils
# sont des nombres étiquetés. Ceci est indiqué par le bit le moins significatif à 0.
0x00007f1e00082c90  f9401fe2            ldr x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            tst w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            b.ne #+0x158 (addr 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            ldr x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            tst w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            b.ne #+0x150 (addr 0x7f1e00082df4)

# Ensuite, nous détaguons et additionnons 'a' et 'b' ensemble.
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# Cela donne 5 + 7 == 12, tout est bon !

# Ensuite, nous vérifions les débordements et retaguons le résultat.
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# Et enfin, nous plaçons le résultat dans x0.
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
Un arrêt sur point de rupture activé à l'adresse 0x7f1f880abd28.
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

Ajoute un point de rupture à l'adresse spécifiée.

Notez que sur Arm 32 bits, il n'y a qu'un seul point de rupture possible et que vous devrez désactiver la protection en écriture sur les pages de code pour l'insérer. Le simulateur Arm 64 bits n'a pas de telles restrictions.

Avec notre [exemple](#test.js) encore :

```simulateur
$ out/arm.debug/d8 --allow-natives-syntax \
    # Ceci est utile pour savoir à quelle adresse s'arrêter.
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

Le simulateur s'arrête, point de rupture sur la prochaine instruction :
  0x488c2e20  e24fc00c       sub ip, pc, #12

# Arrêtons à une adresse connue intéressante, où nous commençons
# le chargement de 'a' et 'b'.
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# Nous pouvons examiner avec 'disasm'.
sim> disasm 10
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]
  0x488c2ea0  e3120001       tst r2, #1
  0x488c2ea4  1a000037       bne +228 -> 0x488c2f88
  0x488c2ea8  e59b3008       ldr r3, [fp, #+8]
  0x488c2eac  e3130001       tst r3, #1
  0x488c2eb0  1a000037       bne +228 -> 0x488c2f94
  0x488c2eb4  e1a040c2       mov r4, r2, asr #1
  0x488c2eb8  e09440c3       adds r4, r4, r3, asr #1
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0
  0x488c2ec0  e0942004       adds r2, r4, r4

# Et essayons de définir un point de rupture sur le résultat des premières instructions `adds`.
sim> break 0x488c2ebc
Échec de la définition du point de rupture

# Ah, il faut d'abord supprimer le point de rupture.
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# Cela donne 5 + 7 == 12, tout est bon !
```

### Instructions de point d'arrêt générées avec quelques fonctionnalités supplémentaires

Au lieu de `TurboAssembler::DebugBreak()`, vous pouvez utiliser une instruction de niveau inférieur qui a le même effet mais avec des fonctionnalités supplémentaires.

- [32 bits : `stop()`](#arm32_stop)
- [64 bits : `Debug()`](#arm64_debug)

#### `stop()` (Arm 32 bits)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

Le premier argument est la condition et le deuxième est le code d'arrêt. Si un code est spécifié et qu'il est inférieur à 256, l'arrêt est considéré comme “surveillé” et peut être désactivé/activé ; un compteur garde également une trace du nombre de fois où le simulateur atteint ce code.

Imaginez que nous travaillons sur ce code C++ de V8 :

```cpp
__ stop(al, 123);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ mov(r0, r0);
__ stop(al, 0x1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
__ mov(r1, r1);
```

Voici une session de débogage échantillon :

Nous atteignons le premier arrêt.

```simulateur
Le simulateur atteint l'arrêt 123, s'arrêtant à la prochaine instruction :
  0xb53559e8  e1a00000       mov r0, r0
```

Nous pouvons voir l'arrêt suivant en utilisant `disasm`.

```simulateur
sim> disasm
  0xb53559e8  e1a00000       mov r0, r0
  0xb53559ec  e1a00000       mov r0, r0
  0xb53559f0  e1a00000       mov r0, r0
  0xb53559f4  e1a00000       mov r0, r0
  0xb53559f8  e1a00000       mov r0, r0
  0xb53559fc  ef800001       stop 1 - 0x1
  0xb5355a00  e1a00000       mov r1, r1
  0xb5355a04  e1a00000       mov r1, r1
  0xb5355a08  e1a00000       mov r1, r1
```

Des informations peuvent être affichées pour tous les arrêts (surveillés) qui ont été atteints au moins une fois.

```simulateur
sim> stop info all
Informations sur les arrêts :
stop 123 - 0x7b:      Activé,      compteur = 1
sim> cont
Le simulateur atteint l'arrêt 1, s'arrêtant à la prochaine instruction :
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
Informations sur les arrêts :
stop 1 - 0x1:         Activé,      compteur = 1
stop 123 - 0x7b:      Activé,      compteur = 1
```

Les arrêts peuvent être désactivés ou activés. (Disponible uniquement pour les arrêts surveillés.)

```simulateur
sim> stop disable 1
sim> cont
Le simulateur a atteint l'arrêt 123, interrompant à la prochaine instruction :
  0xb5356808  e1a00000       mov r0, r0
sim> cont
Le simulateur a atteint l'arrêt 123, interrompant à la prochaine instruction :
  0xb5356c28  e1a00000       mov r0, r0
sim> stop info all
Informations sur les arrêts :
arrêt 1 - 0x1 :         Désactivé,     compteur = 2
arrêt 123 - 0x7b :      Activé,        compteur = 3
sim> stop enable 1
sim> cont
Le simulateur a atteint l'arrêt 1, interrompant à la prochaine instruction :
  0xb5356c44  e1a00000       mov r1, r1
sim> stop disable all
sim> con
```

#### `Debug()` (Arm 64-bit)

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

Cette instruction est un point d'arrêt par défaut, mais elle permet également d'activer et de désactiver le traçage comme si vous l'aviez fait avec la commande [`trace`](#trace) dans le débogueur. Vous pouvez également lui donner un message et un code comme identifiant.

Imaginez que nous travaillons sur ce code V8 C++ extrait de la bibliothèque native qui prépare le cadre pour appeler une fonction JS.

```cpp
int64_t pointeur_cadre_invalide = -1L;  // Pointeur de cadre invalide, devrait échouer s'il est utilisé.
__ Mov(x13, pointeur_cadre_invalide);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

Il pourrait être utile d'insérer un point d'arrêt avec `DebugBreak()` pour examiner l'état actuel lorsqu'on exécute cela. Mais nous pouvons aller plus loin et tracer ce code si nous utilisons `Debug()` à la place :

```cpp
// Démarrer le traçage et enregistrer la désassemblage et les valeurs des registres.
__ Debug("start tracing", 42, TRACE_ENABLE | LOG_ALL);

int64_t pointeur_cadre_invalide = -1L;  // Pointeur de cadre invalide, devrait échouer s'il est utilisé.
__ Mov(x13, pointeur_cadre_invalide);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// Arrêter le traçage.
__ Debug("stop tracing", 42, TRACE_DISABLE);
```

Cela nous permet de tracer les valeurs des registres __uniquement__ pour l'extrait de code sur lequel nous travaillons :

```simulateur
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (Arrondir au plus proche)
#    x0: 0x00007fbf00000000
#    x1: 0x00007fbf0804030d
#    x2: 0x00007fbf082500e1
(...)

0x00007fc039d31cb0  9280000d            movn x13, #0x0
#   x13: 0xffffffffffffffff
0x00007fc039d31cb4  d280004c            movz x12, #0x2
#   x12: 0x0000000000000002
0x00007fc039d31cb8  d2864110            movz x16, #0x3208
#   ip0: 0x0000000000003208
0x00007fc039d31cbc  8b10034b            add x11, x26, x16
#   x11: 0x00007fbf00003208
0x00007fc039d31cc0  f940016a            ldr x10, [x11]
#   x10: 0x0000000000000000 <- 0x00007fbf00003208
0x00007fc039d31cc4  a9be7fea            stp x10, xzr, [sp, #-32]!
#    sp: 0x00007fc033e81340
#   x10: 0x0000000000000000 -> 0x00007fc033e81340
#   xzr: 0x0000000000000000 -> 0x00007fc033e81348
0x00007fc039d31cc8  a90137ec            stp x12, x13, [sp, #16]
#   x12: 0x0000000000000002 -> 0x00007fc033e81350
#   x13: 0xffffffffffffffff -> 0x00007fc033e81358
0x00007fc039d31ccc  910063fd            add fp, sp, #0x18 (24)
#    fp: 0x00007fc033e81358
0x00007fc039d31cd0  d45bd600            hlt #0xdeb0
```
