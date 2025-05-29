---
title: "메모리 누수 조사"
description: "이 문서는 V8에서 메모리 누수를 조사하는 방법에 대한 지침을 제공합니다."
---
메모리 누수를 조사하고 객체가 왜 가비지 수집되지 않는지 궁금하다면, `%DebugTrackRetainingPath(object)`를 사용하여 각 GC에서 해당 객체의 실제 보유 경로를 인쇄할 수 있습니다.

이 기능은 `--allow-natives-syntax --track-retaining-path` 런타임 플래그를 필요로 하며, 릴리스 및 디버그 모드 모두에서 작동합니다. 자세한 정보는 CL 설명을 참조하세요.

다음 `test.js`를 고려해보세요:

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

예제 (디버그 모드 또는 `v8_enable_object_print = true`를 사용하여 훨씬 더 자세한 출력을 얻으세요):

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
0x245c59f0c1a1의 보유 경로:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트로부터 거리 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
루트: (Isolate)
-------------------------------------------------
```

## 디버거 지원

디버거 세션 (예: `gdb`/`lldb`) 중에, 위에 언급된 플래그를 프로세스에 전달했다고 가정하면 (즉, `--allow-natives-syntax --track-retaining-path`), 관심 있는 객체에 대해 `print isolate->heap()->PrintRetainingPath(HeapObject*)`를 사용할 수 있습니다.
