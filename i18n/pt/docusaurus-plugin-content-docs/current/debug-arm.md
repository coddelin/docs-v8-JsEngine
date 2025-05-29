---
title: "Depuração Arm com o simulador"
description: "O simulador e depurador Arm podem ser muito úteis ao trabalhar com a geração de código V8."
---
O simulador e depurador podem ser muito úteis ao trabalhar com a geração de código V8.

- É conveniente, pois permite testar a geração de código sem acesso ao hardware real.
- Não é necessário [compilação cruzada](/docs/cross-compile-arm) ou compilação nativa.
- O simulador suporta totalmente a depuração de código gerado.

Observe que este simulador foi projetado para fins de V8. Apenas as funcionalidades usadas pelo V8 estão implementadas, e você pode encontrar funcionalidades ou instruções não implementadas. Neste caso, fique à vontade para implementá-las e enviar o código!

- [Compilando](#compiling)
- [Iniciando o depurador](#start_debug)
- [Comandos de depuração](#debug_commands)
    - [printobject](#po)
    - [trace](#trace)
    - [break](#break)
- [Recursos extras de ponto de interrupção](#extra)
    - [32-bit: `stop()`](#arm32_stop)
    - [64-bit: `Debug()`](#arm64_debug)

## Compilando para Arm usando o simulador

Por padrão, em um host x86, ao compilar para Arm com [gm](/docs/build-gn#gm), você obterá uma compilação do simulador:

```bash
gm arm64.debug # Para uma compilação de 64 bits ou...
gm arm.debug   # ... para uma compilação de 32 bits.
```

Você também pode compilar a configuração `optdebug`, já que `debug` pode ser um pouco lento, especialmente se você quiser executar o test suite do V8.

## Iniciando o depurador

Você pode iniciar o depurador imediatamente a partir da linha de comando após `n` instruções:

```bash
out/arm64.debug/d8 --stop_sim_at <n> # Ou out/arm.debug/d8 para uma compilação de 32 bits.
```

Alternativamente, você pode gerar uma instrução de ponto de interrupção no código gerado:

Nativamente, instruções de ponto de interrupção fazem com que o programa pare com um sinal `SIGTRAP`, permitindo que você depure o problema com gdb. No entanto, se estiver executando com um simulador, uma instrução de ponto de interrupção no código gerado o levará ao depurador do simulador.

Você pode gerar um ponto de interrupção de várias formas usando `DebugBreak()` do [Torque](/docs/torque-builtins), do [CodeStubAssembler](/docs/csa-builtins), como um nó em um passe [TurboFan](/docs/turbofan), ou diretamente usando um assembler.

Aqui, focamos em depurar código nativo de baixo nível, então vamos olhar para o método do assembler:

```cpp
TurboAssembler::DebugBreak();
```

Suponha que tenhamos uma função jitted chamada `add` compilada com [TurboFan](/docs/turbofan) e que desejamos quebrar no início. Dado um exemplo `test.js`:



```js
// Nossa função otimizada.
function add(a, b) {
  return a + b;
}

// Código típico habilitado por --allow-natives-syntax.
%PrepareFunctionForOptimization(add);

// Dê feedback de tipo ao compilador otimizado para que ele especule que `a` e `b` são
// números.
add(1, 3);

// E force a otimização.
%OptimizeFunctionOnNextCall(add);
add(5, 7);
```

Para fazer isso, podemos conectar ao [gerador de código](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/code-generator.cc?q=CodeGenerator::AssembleCode) do TurboFan e acessar o assembler para inserir o ponto de interrupção:

```cpp
void CodeGenerator::AssembleCode() {
  // ...

  // Verifique se estamos otimizando, procure o nome da função atual e
  // insira um ponto de interrupção.
  if (info->IsOptimizing()) {
    AllowHandleDereference allow_handle_dereference;
    if (info->shared_info()->PassesFilter("add")) {
      tasm()->DebugBreak();
    }
  }

  // ...
}
```

E vamos executá-lo:

```simulator
$ d8 \
    # Habilitar funções cheat code JS com '%'.
    --allow-natives-syntax \
    # Desmontar nossa função.
    --print-opt-code --print-opt-code-filter="add" --code-comments \
    # Desativar mitigação Spectre para facilitar a leitura.
    --no-untrusted-code-mitigations \
    test.js
--- Código fonte bruto ---
(a, b) {
  return a + b;
}


--- Código otimizado ---
optimization_id = 0
source_position = 12
kind = OPTIMIZED_FUNCTION
name = add
stack_slots = 6
compiler = turbofan
address = 0x7f0900082ba1

Instruções (size = 504)
0x7f0900082be0     0  d45bd600       início da pool constante (num_const = 6)
0x7f0900082be4     4  00000000       constante
0x7f0900082be8     8  00000001       constante
0x7f0900082bec     c  75626544       constante
0x7f0900082bf0    10  65724267       constante
0x7f0900082bf4    14  00006b61       constante
0x7f0900082bf8    18  d45bd7e0       constante
                  -- Prólogo: verificar o início do registrador de código --
0x7f0900082bfc    1c  10ffff30       adr x16, #-0x1c (endereço 0x7f0900082be0)
0x7f0900082c00    20  eb02021f       cmp x16, x2
0x7f0900082c04    24  54000080       b.eq #+0x10 (endereço 0x7f0900082c14)
                  Mensagem de Abort:
                  Valor errado no registrador de início de código passado
0x7f0900082c08    28  d2800d01       movz x1, #0x68
                  -- Trampolim embutido para Abort --
0x7f0900082c0c    2c  58000d70       ldr x16, pc+428 (endereço 0x00007f0900082db8)    ;; alvo fora da heap
0x7f0900082c10    30  d63f0200       blr x16
                  -- Prólogo: verificar a desotimização --
                  [ Descompactar Ponteiro Marcado
0x7f0900082c14    34  b85d0050       carregar w16, [x2, #-48]
0x7f0900082c18    38  8b100350       adicionar x16, x26, x16
                  ]
0x7f0900082c1c    3c  b8407210       carregar w16, [x16, #7]
0x7f0900082c20    40  36000070       tbz w16, #0, #+0xc (endereço 0x7f0900082c2c)
                  -- Trampolim embutido para CompilarCódigoDesotimizadoLazy --
0x7f0900082c24    44  58000c31       carregar x17, pc+388 (endereço 0x00007f0900082da8)    ;; alvo fora do heap
0x7f0900082c28    48  d61f0220       pular x17
                  -- Início B0 (construir o quadro) --
(...)

--- Código finalizado ---
# Depurador acionado 0: QuebraDepuração
0x00007f0900082bfc 10ffff30            adr x16, #-0x1c (endereço 0x7f0900082be0)
sim>
```

Podemos ver que paramos no início da função otimizada e o simulador nos forneceu um prompt!

Observe que este é apenas um exemplo e o V8 muda rapidamente, então os detalhes podem variar. Mas você deve conseguir fazer isso em qualquer lugar onde um montador esteja disponível.

## Comandos de depuração

### Comandos comuns

Digite `ajuda` no prompt do depurador para obter detalhes sobre os comandos disponíveis. Estes incluem comandos típicos semelhantes ao gdb, como `stepi`, `cont`, `disasm`, etc. Se o Simulador for executado sob o gdb, o comando de depuração `gdb` dará controle ao gdb. Você pode então usar `cont` no gdb para retornar ao depurador.

### Comandos específicos da arquitetura

Cada arquitetura alvo implementa seu próprio simulador e depurador, então a experiência e os detalhes podem variar.

- [printobject](#po)
- [trace](#trace)
- [break](#break)

#### `printobject $registro` (apelido `po`)

Descreve um objeto JS armazenado em um registro.

Por exemplo, vamos supor que desta vez estamos executando [nosso exemplo](#test.js) em uma compilação de simulador Arm de 32 bits. Podemos examinar os argumentos recebidos passados em registros:

```simulador
$ ./out/arm.debug/d8 --allow-natives-syntax test.js
O simulador acionou uma parada, interrompendo na próxima instrução:
  0x26842e24  e24fc00c       sub ip, pc, #12
sim> print r1
r1: 0x4b60ffb1 1264648113
# O objeto da função atual é passado com r1.
sim> printobject r1
r1:
0x4b60ffb1: [Função] no OldSpace
 - mapa: 0x485801f9 <Map(HOLEY_ELEMENTS)> [FastProperties]
 - protótipo: 0x4b6010f1 <JSFunction (sfi = 0x42404e99)>
 - elementos: 0x5b700661 <FixedArray[0]> [HOLEY_ELEMENTS]
 - protótipo da função:
 - mapa inicial:
 - informações compartilhadas: 0x4b60fe9d <SharedFunctionInfo add>
 - nome: 0x5b701c5d <String[#3]: adiciona>
 - quantidade de parâmetros formais: 2
 - tipo: FunçãoNormal
 - contexto: 0x4b600c65 <NativeContext[261]>
 - código: 0x26842de1 <Code OPTIMIZED_FUNCTION>
 - código fonte: (a, b) {
  retornar a + b;
}
(...)

# Agora imprima o contexto atual do JS passado em r7.
sim> printobject r7
r7:
0x449c0c65: [NativeContext] no OldSpace
 - mapa: 0x561000b9 <Mapa>
 - comprimento: 261
 - informações do escopo: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
 - anterior: 0
 - contexto nativo: 0x449c0c65 <NativeContext[261]>
           0: 0x34081341 <ScopeInfo SCRIPT_SCOPE [5]>
           1: 0
           2: 0x449cdaf5 <JSObject>
           3: 0x58480c25 <Objecto Global JS>
           4: 0x58485499 <Outro objeto de heap (EMBEDDER_DATA_ARRAY_TYPE)>
           5: 0x561018a1 <Map(HOLEY_ELEMENTS)>
           6: 0x3408027d <indefinido>
           7: 0x449c75c1 <JSFunction ArrayBuffer (sfi = 0x4be8ade1)>
           8: 0x561010f9 <Map(HOLEY_ELEMENTS)>
           9: 0x449c967d <JSFunction arrayBufferConstructor_DoNotInitialize (sfi = 0x4be8c3ed)>
          10: 0x449c8dbd <JSFunction Array (sfi = 0x4be8be59)>
(...)
```

#### `trace` (apelido `t`)

Ativar ou desativar o rastreamento de instruções executadas.

Quando ativado, o simulador irá imprimir instruções desmontadas enquanto as está executando. Se você estiver executando uma compilação Arm de 64 bits, o simulador também poderá rastrear alterações nos valores dos registros.

Você também pode ativar isso a partir da linha de comando usando a opção `--trace-sim` para ativar o rastreamento desde o início.

Com o mesmo [exemplo](#test.js):

```simulador
$ out/arm64.debug/d8 --allow-natives-syntax \
    # --debug-sim é necessário no Arm de 64 bits para habilitar a desmontagem
    # ao rastrear.
    --debug-sim test.js
# Depurador acionado 0: QuebraDepuração
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (endereço 0x7f1e00082be0)
sim> rastrear
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (endereço 0x7f1e00082be0)
Habilitando desmontagem, registros e rastreamento de escritas na memória

# Pausar no endereço de retorno armazenado no registro lr.
sim> break lr
Definir um ponto de interrupção em 0x7f1f880abd28
0x00007f1e00082bfc  10ffff30            adr x16, #-0x1c (endereço 0x7f1e00082be0)

# Continuar irá rastrear a execução da função até retornarmos, permitindo
# entender o que está acontecendo.
sim> continuar
#    x0: 0x00007f1e00082ba1
#    x1: 0x00007f1e08250125
#    x2: 0x00007f1e00082be0
(...)

# Primeiro carregamos os argumentos 'a' e 'b' da pilha e verificamos se eles
# são números marcados. Isso é indicado pelo bit menos significativo sendo 0.
0x00007f1e00082c90  f9401fe2            carregar x2, [sp, #56]
#    x2: 0x000000000000000a <- 0x00007f1f821f0278
0x00007f1e00082c94  7200005f            tst w2, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082c98  54000ac1            b.ne #+0x158 (addr 0x7f1e00082df0)
0x00007f1e00082c9c  f9401be3            ldr x3, [sp, #48]
#    x3: 0x000000000000000e <- 0x00007f1f821f0270
0x00007f1e00082ca0  7200007f            tst w3, #0x1
# NZCV: N:0 Z:1 C:0 V:0
0x00007f1e00082ca4  54000a81            b.ne #+0x150 (addr 0x7f1e00082df4)

# Então nós removemos a tag e somamos 'a' e 'b' juntos.
0x00007f1e00082ca8  13017c44            asr w4, w2, #1
#    x4: 0x0000000000000005
0x00007f1e00082cac  2b830484            adds w4, w4, w3, asr #1
# NZCV: N:0 Z:0 C:0 V:0
#    x4: 0x000000000000000c
# Isso é 5 + 7 == 12, tudo certo!

# Então verificamos por transbordamentos e marcamos o resultado novamente.
0x00007f1e00082cb0  54000a46            b.vs #+0x148 (addr 0x7f1e00082df8)
0x00007f1e00082cb4  2b040082            adds w2, w4, w4
# NZCV: N:0 Z:0 C:0 V:0
#    x2: 0x0000000000000018
0x00007f1e00082cb8  54000466            b.vs #+0x8c (addr 0x7f1e00082d44)


# E por fim colocamos o resultado em x0.
0x00007f1e00082cbc  aa0203e0            mov x0, x2
#    x0: 0x0000000000000018
(...)

0x00007f1e00082cec  d65f03c0            ret
Atingiu e desativou um ponto de interrupção em 0x7f1f880abd28.
0x00007f1f880abd28  f85e83b4            ldur x20, [fp, #-24]
sim>
```

#### `break $address`

Adiciona um ponto de interrupção no endereço especificado.

Observe que no Arm de 32 bits, você pode ter apenas um ponto de interrupção e precisará desativar a proteção contra gravação em páginas de código para inseri-lo. O simulador de Arm de 64 bits não possui essas restrições.

Com nosso [exemplo](#test.js) novamente:

```simulator
$ out/arm.debug/d8 --allow-natives-syntax \
    # Isso é útil para saber qual endereço interromper.
    --print-opt-code --print-opt-code-filter="add" \
    test.js
(...)

O simulador atingiu o ponto de interrupção, interrompendo na próxima instrução:
  0x488c2e20  e24fc00c       sub ip, pc, #12

# Interrompa em um endereço conhecido interessante, onde começamos
# carregando 'a' e 'b'.
sim> break 0x488c2e9c
sim> continue
  0x488c2e9c  e59b200c       ldr r2, [fp, #+12]

# Podemos olhar adiante com 'disasm'.
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

# E tente interromper no resultado das primeiras instruções `adds`.
sim> break 0x488c2ebc
falha ao definir o ponto de interrupção

# Ah, precisamos excluir o ponto de interrupção primeiro.
sim> del
sim> break 0x488c2ebc
sim> cont
  0x488c2ebc  6a000037       bvs +228 -> 0x488c2fa0

sim> print r4
r4: 0x0000000c 12
# Isso é 5 + 7 == 12, tudo certo!
```

### Instruções de ponto de interrupção geradas com alguns recursos adicionais

Em vez de `TurboAssembler::DebugBreak()`, você pode usar uma instrução de nível inferior que tem o mesmo efeito, mas com recursos adicionais.

- [32 bits: `stop()`](#arm32_stop)
- [64 bits: `Debug()`](#arm64_debug)

#### `stop()` (Arm de 32 bits)

```cpp
Assembler::stop(Condition cond = al, int32_t code = kDefaultStopCode);
```

O primeiro argumento é a condição e o segundo é o código de interrupção. Se um código for especificado e for menor que 256, a interrupção é dita como “monitorada” e pode ser desativada/ativada; um contador também rastreia quantas vezes o Simulador atinge esse código.

Imagine que estamos trabalhando neste código em C++ do V8:

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

Aqui está uma sessão de depuração de exemplo:

Atingimos a primeira interrupção.

```simulator
O simulador atingiu a interrupção 123, interrompendo na próxima instrução:
  0xb53559e8  e1a00000       mov r0, r0
```

Podemos ver a próxima interrupção usando `disasm`.

```simulator
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

É possível imprimir informações para todas as interrupções (monitoradas) que foram atingidas pelo menos uma vez.

```simulator
sim> stop info all
Informações de interrupção:
stop 123 - 0x7b:      Ativado,      contador = 1
sim> cont
O simulador atingiu a interrupção 1, interrompendo na próxima instrução:
  0xb5355a04  e1a00000       mov r1, r1
sim> stop info all
Informações de interrupção:
stop 1 - 0x1:         Ativado,      contador = 1
stop 123 - 0x7b:      Ativado,      contador = 1
```

Interrupções podem ser desativadas ou ativadas. (Disponível apenas para interrupções monitoradas.)

```simulator
sim> stop disable 1
sim> cont
Simulador atingiu parada 123, interrompendo na próxima instrução:
  0xb5356808  e1a00000       mov r0, r0
sim> cont
Simulador atingiu parada 123, interrompendo na próxima instrução:
  0xb5356c28  e1a00000       mov r0, r0
sim> stop info all
Informação de parada:
parada 1 - 0x1:         Desativado,     contador = 2
parada 123 - 0x7b:      Ativado,        contador = 3
sim> stop enable 1
sim> cont
Simulador atingiu parada 1, interrompendo na próxima instrução:
  0xb5356c44  e1a00000       mov r1, r1
sim> stop disable all
sim> con
```

#### `Debug()` (Arm 64-bit)

```cpp
MacroAssembler::Debug(const char* message, uint32_t code, Instr params = BREAK);
```

Esta instrução é um ponto de interrupção por padrão, mas também pode habilitar e desabilitar rastreamento como se você tivesse feito isso com o comando [`trace`](#trace) no depurador. Você também pode fornecer uma mensagem e um código como identificador.

Imagine que estamos trabalhando neste código C++ do V8, retirado do builtin nativo que prepara o quadro para chamar uma função JS.

```cpp
int64_t bad_frame_pointer = -1L;  // Ponteiro de quadro ruim, deve falhar se for usado.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);
```

Pode ser útil inserir um ponto de interrupção com `DebugBreak()` para examinar o estado atual ao executar isso. Mas podemos ir além e rastrear este código se usarmos `Debug()` em vez disso:

```cpp
// Iniciar rastreamento e registrar desmontagem e valores de registradores.
__ Debug("iniciar rastreamento", 42, TRACE_ENABLE | LOG_ALL);

int64_t bad_frame_pointer = -1L;  // Ponteiro de quadro ruim, deve falhar se for usado.
__ Mov(x13, bad_frame_pointer);
__ Mov(x12, StackFrame::TypeToMarker(type));
__ Mov(x11, ExternalReference::Create(IsolateAddressId::kCEntryFPAddress,
                                      masm->isolate()));
__ Ldr(x10, MemOperand(x11));

__ Push(x13, x12, xzr, x10);

// Parar rastreamento.
__ Debug("parar rastreamento", 42, TRACE_DISABLE);
```

Isso nos permite rastrear valores de registradores __apenas__ para o trecho de código em que estamos trabalhando:

```simulador
$ d8 --allow-natives-syntax --debug-sim test.js
# NZCV: N:0 Z:0 C:0 V:0
# FPCR: AHP:0 DN:0 FZ:0 RMode:0b00 (Arredondar para o Mais Próximo)
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
