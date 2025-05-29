---
title: 'Depuração de builtins com GDB'
description: 'A partir do V8 v6.9, é possível criar pontos de interrupção no GDB para depurar builtins de CSA / ASM / Torque.'
---
A partir do V8 v6.9, é possível criar pontos de interrupção no GDB (e possivelmente em outros depuradores) para depurar builtins de CSA / ASM / Torque.

```
(gdb) tb i::Isolate::Init
Ponto de interrupção temporário 1 em 0x7ffff706742b: i::Isolate::Init. (2 locais)
(gdb) r
Thread 1 "d8" atingiu o ponto de interrupção temporário 1, 0x00007ffff7c55bc0 em Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
Ponto de interrupção 2 em 0x7ffff7ac8784
(gdb) c
Thread 1 "d8" atingiu o ponto de interrupção 2, 0x00007ffff7ac8784 em Builtins_RegExpPrototypeExec ()
```

Note que funciona bem usar um ponto de interrupção temporário (atalho `tb` no GDB) em vez de um ponto de interrupção regular (`br`) para isso, já que você só precisa dele no início do processo.

Os builtins também são visíveis em rastreamentos de pilha:

```
(gdb) bt
#0  0x00007ffff7ac8784 em Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 em Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 em ?? ()
#3  0x000037ef23a0fa59 em ?? ()
#4  0x0000000000000000 em ?? ()
```

Avisos:

- Funciona apenas com builtins incorporados.
- Pontos de interrupção podem ser definidos apenas no início do builtin.
- O ponto de interrupção inicial em `Isolate::Init` é necessário antes de definir o ponto de interrupção do builtin, já que o GDB modifica o binário e verificamos um hash da seção de builtins no binário na inicialização. Caso contrário, o V8 reclama de uma incompatibilidade de hash:

    ```
    # Erro fatal em ../../src/isolate.cc, linha 117
    # Verificação falhou: d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
