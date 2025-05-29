---
title: 'Investigando vazamentos de memória'
description: 'Este documento fornece orientações sobre como investigar vazamentos de memória no V8.'
---
Se você estiver investigando um vazamento de memória e se perguntar por que um objeto não é coletado como lixo, pode usar `%DebugTrackRetainingPath(object)` para imprimir o caminho real de retenção do objeto a cada GC.

Isso requer as flags de tempo de execução `--allow-natives-syntax --track-retaining-path` e funciona tanto nos modos release quanto debug. Mais informações na descrição do CL.

Considere o seguinte `test.js`:

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

Exemplo (use o modo de depuração ou `v8_enable_object_print = true` para uma saída muito mais detalhada):

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
Caminho de retenção para 0x245c59f0c1a1:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 6: 0x245c59f0c1a1 <Objeto mapa = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 5: 0x245c59f0c169 <ArrayFixado[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 3: 0x1fbb02e2d679 <ArrayFixado[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 2: 0x245c59f0c139 <ArrayFixado[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Distância da raiz 1: 0x1fbb02e03d91 <ArrayFixado[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Raiz: (Isolate)
-------------------------------------------------
```

## Suporte ao depurador

Durante uma sessão de depuração (por exemplo, `gdb`/`lldb`), e assumindo que você passou as flags acima para o processo (ou seja, `--allow-natives-syntax --track-retaining-path`), talvez seja possível usar `print isolate->heap()->PrintRetainingPath(HeapObject*)` em um objeto de interesse.
