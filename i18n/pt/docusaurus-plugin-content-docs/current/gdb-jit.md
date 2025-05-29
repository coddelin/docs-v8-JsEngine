---
title: "Integração com a Interface de Compilação JIT do GDB"
description: "A integração com a Interface de Compilação JIT do GDB permite que o V8 forneça ao GDB informações de símbolos e depuração para o código nativo emitido pelo runtime do V8."
---
A integração com a Interface de Compilação JIT do GDB permite que o V8 forneça ao GDB informações de símbolos e depuração para o código nativo emitido pelo runtime do V8.

Quando a Interface de Compilação JIT do GDB está desativada, um backtrace típico no GDB contém frames marcados com `??`. Esses frames correspondem a código gerado dinamicamente:

```
#8  0x08281674 in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#9  0xf5cae28e in ?? ()
#10 0xf5cc3a0a in ?? ()
#11 0xf5cc38f4 in ?? ()
#12 0xf5cbef19 in ?? ()
#13 0xf5cb09a2 in ?? ()
#14 0x0809e0a5 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd46f) at src/execution.cc:97
```

No entanto, habilitar a Interface de Compilação JIT do GDB permite que o GDB produza um rastreamento de pilha mais informativo:

```
#6  0x082857fc in v8::internal::Runtime_SetProperty (args=...) at src/runtime.cc:3758
#7  0xf5cae28e in ?? ()
#8  0xf5cc3a0a in loop () at test.js:6
#9  0xf5cc38f4 in test.js () at test.js:13
#10 0xf5cbef19 in ?? ()
#11 0xf5cb09a2 in ?? ()
#12 0x0809e1f9 in v8::internal::Invoke (construct=false, func=..., receiver=..., argc=0, args=0x0,
    has_pending_exception=0xffffd44f) at src/execution.cc:97
```

Os frames ainda desconhecidos pelo GDB correspondem ao código nativo sem informações de origem. Consulte [limitações conhecidas](#known-limitations) para mais detalhes.

A Interface de Compilação JIT do GDB está especificada na documentação do GDB: https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## Pré-requisitos

- V8 v3.0.9 ou mais recente
- GDB 7.0 ou mais recente
- Sistema operacional Linux
- CPU com arquitetura compatível com Intel (ia32 ou x64)

## Habilitando a Interface de Compilação JIT do GDB

Por padrão, a Interface de Compilação JIT do GDB está atualmente excluída da compilação e desabilitada em tempo de execução. Para habilitá-la:

1. Compile a biblioteca V8 com `ENABLE_GDB_JIT_INTERFACE` definido. Se você estiver usando scons para compilar o V8, execute-o com `gdbjit=on`.
1. Passe a flag `--gdbjit` ao iniciar o V8.

Para verificar se você habilitou a integração do JIT do GDB corretamente, tente definir um ponto de interrupção em `__jit_debug_register_code`. Essa função é chamada para notificar o GDB sobre novos objetos de código.

## Limitações conhecidas

- No lado do GDB, a Interface JIT atualmente (a partir do GDB 7.2) não lida com o registro de objetos de código de maneira muito eficiente. Cada novo registro leva mais tempo: com 500 objetos registrados, cada novo registro leva mais de 50ms; com 1000 objetos registrados, leva mais de 300 ms. Este problema foi [relatado aos desenvolvedores do GDB](https://sourceware.org/ml/gdb/2011-01/msg00002.html), mas atualmente não há solução disponível. Para reduzir a pressão no GDB, a implementação atual da integração JIT do GDB opera em dois modos: _padrão_ e _completo_ (habilitado pela flag `--gdbjit-full`). No modo _padrão_, o V8 notifica o GDB apenas sobre objetos de código que possuem informações de origem anexadas (isso geralmente inclui todos os scripts do usuário). No modo _completo_, o GDB é notificado sobre todos os objetos de código gerados (stubs, ICs, trampolins).

- No x64, o GDB é incapaz de desenrolar corretamente a pilha sem a seção `.eh_frame` ([Problema 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- O GDB não é notificado sobre o código desserializado do snapshot ([Problema 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- Apenas o sistema operacional Linux em CPUs compatíveis com Intel é suportado. Para diferentes sistemas operacionais, ou um cabeçalho ELF diferente deve ser gerado, ou um formato de objeto completamente diferente deve ser usado.

- Habilitar a interface JIT do GDB desativa o GC compactador. Isso é feito para reduzir a pressão no GDB, já que desregistrar e registrar cada objeto de código movido acarretará uma sobrecarga considerável.

- A integração JIT do GDB fornece apenas informações de origem _aproximadas_. Não fornece nenhuma informação sobre variáveis locais, argumentos de funções, layout da pilha, etc. Não permite executar passo a passo o código JavaScript ou definir um ponto de interrupção em uma linha específica. No entanto, é possível definir um ponto de interrupção em uma função pelo seu nome.
