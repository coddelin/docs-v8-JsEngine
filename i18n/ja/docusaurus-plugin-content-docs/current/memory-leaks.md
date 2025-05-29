---
title: 'メモリリークの調査'
description: 'この文書は、V8でのメモリリークの調査方法に関するガイダンスを提供します。'
---
メモリリークを調査しており、なぜオブジェクトがガベージコレクションされないのか疑問に思った場合、`%DebugTrackRetainingPath(object)` を使用して各GCでオブジェクトの実際の保持パスを出力できます。

これには、`--allow-natives-syntax --track-retaining-path` ランタイムフラグが必要で、リリースモードとデバッグモードの両方で動作します。詳細はCLの説明を参照してください。

次の `test.js` を考えてみてください:

```js
function foo() {
  const x = { bar: 'bar' };
  %DebugTrackRetainingPath(x);
  return () => { return x; }
}
const closure = foo();
gc();
```

例 (デバッグモードまたは `v8_enable_object_print = true` を使用すると、非常に詳細な出力が得られます):

```bash
$ out/x64.release/d8 --allow-natives-syntax --track-retaining-path --expose-gc test.js
#################################################
0x245c59f0c1a1 の保持パス:

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 6: 0x245c59f0c1a1 <Object map = 0x2d919f0d729>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 5: 0x245c59f0c169 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 4: 0x245c59f0c219 <JSFunction (sfi = 0x1fbb02e2d7f1)>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 3: 0x1fbb02e2d679 <FixedArray[5]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 2: 0x245c59f0c139 <FixedArray[4]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルートからの距離 1: 0x1fbb02e03d91 <FixedArray[279]>

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ルート: (Isolate)
-------------------------------------------------
```

## デバッガーサポート

デバッガセッション中 (例: `gdb`/`lldb`) に、上記のフラグをプロセスに渡したと仮定すると (つまり `--allow-natives-syntax --track-retaining-path`)、関心のあるオブジェクトで `print isolate->heap()->PrintRetainingPath(HeapObject*)` を実行できる可能性があります。
