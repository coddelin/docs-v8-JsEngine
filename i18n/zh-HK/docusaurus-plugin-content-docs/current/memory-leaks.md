---
title: &apos;調查記憶體洩漏&apos;
description: &apos;本文檔提供了關於在 V8 中調查記憶體洩漏的指導。&apos;
---
如果您正在調查記憶體洩漏並想知道為什麼某個對象沒有被垃圾回收，您可以使用 `%DebugTrackRetainingPath(object)` 打印對象在每次垃圾回收時的實際保留路徑。

這需要 `--allow-natives-syntax --track-retaining-path` 運行時標誌，並且在發布模式和調試模式下均有效。更多信息請參見 CL 描述。

考慮以下 `test.js`：

```js
function foo() {
  const x = { bar: &apos;bar&apos; };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

示例（使用調試模式或 `v8_enable_object_print = true` 獲得更詳盡的輸出）：

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
Retaining path for 0x245c59f0c1a1:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距離根節點 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
根節點: (Isolate)
-------------------------------------------------
```

## 調試器支持

在調試器會話中（例如 `gdb`/`lldb`），並假設您已將上述標誌傳遞給進程（即 `--allow-natives-syntax --track-retaining-path`），您可以在感興趣的對象上使用 `print isolate->heap()->PrintRetainingPath(HeapObject*)`。
