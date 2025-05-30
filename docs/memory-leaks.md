---
title: "调查内存泄漏"
description: "本文档提供了关于在V8中调查内存泄漏的指导。"
---
如果你正在调查内存泄漏，并想知道为什么某个对象没有被垃圾回收，你可以使用`%DebugTrackRetainingPath(object)`在每次GC时打印该对象的实际保留路径。

这需要运行时标志`--allow-natives-syntax --track-retaining-path`，并且在发布模式和调试模式下均可使用。更多信息请参阅CL描述。

考虑以下`test.js`代码：

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

示例（使用调试模式或设置`v8_enable_object_print = true`以获得更详细的输出）：

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
对象0x245c59f0c1a1的保留路径：

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
距离根1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
根: (Isolate)
-------------------------------------------------
```

## 调试器支持

在调试器会话中（例如使用`gdb`/`lldb`），并假设你已经将上述标志传递给进程（即`--allow-natives-syntax --track-retaining-path`），你可以在感兴趣的对象上使用`print isolate->heap()->PrintRetainingPath(HeapObject*)`。
