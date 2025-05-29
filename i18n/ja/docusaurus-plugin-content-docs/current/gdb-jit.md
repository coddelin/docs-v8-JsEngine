---
title: "GDB JIT コンパイルインターフェースの統合"
description: "GDB JIT コンパイルインターフェースの統合により、V8 は V8 ランタイムから生成されるネイティブコードに対するシンボルとデバッグ情報を GDB に提供することができます。"
---
GDB JIT コンパイルインターフェースの統合により、V8 は V8 ランタイムから生成されるネイティブコードに対するシンボルとデバッグ情報を GDB に提供することができます。

GDB JIT コンパイルインターフェースが無効化された状態では、GDB の典型的なバックトレースには `??` でマークされたフレームが含まれます。これらのフレームは動的に生成されたコードに対応します:

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

しかし、GDB JIT コンパイルインターフェースを有効にすると、GDB はより多くの情報を含むスタックトレースを生成できます:

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

まだ GDB に認識されていないフレームはソース情報が無いネイティブコードに対応します。詳細については [既知の制限事項](#known-limitations) を参照してください。

GDB JIT コンパイルインターフェースの仕様は GDB ドキュメントに記載されています: https://sourceware.org/gdb/current/onlinedocs/gdb/JIT-Interface.html

## 必須要件

- V8 v3.0.9 またはそれ以降のバージョン
- GDB 7.0 またはそれ以降のバージョン
- Linux OS
- Intel 互換アーキテクチャ (ia32 または x64) の CPU

## GDB JIT コンパイルインターフェースの有効化

GDB JIT コンパイルインターフェースは現在、デフォルトではコンパイルから除外され、ランタイムでは無効化されています。有効化するには以下を実行してください:

1. `ENABLE_GDB_JIT_INTERFACE` を定義して V8 ライブラリをビルドします。scons を使用して V8 をビルドする場合は、`gdbjit=on` を付けて実行してください。
1. V8 を起動するときに `--gdbjit` フラグを渡します。

GDB JIT 統合が正しく有効になっていることを確認するために、`__jit_debug_register_code` にブレークポイントを設定してみてください。この関数は新しいコードオブジェクトについて GDB に通知するために呼び出されます。

## 既知の制限事項

- 現在のところ (GDB 7.2 時点)、GDB 側の JIT インターフェースはコードオブジェクトの登録を非常に効率的に処理していません。次の登録ごとに処理時間が増加します: 500 個の登録済みオブジェクトの場合、次の登録には 50ms を超える時間がかかり、1000 個の登録済みコードオブジェクトでは 300ms を超える時間がかかります。この問題は [GDB 開発者に報告されています](https://sourceware.org/ml/gdb/2011-01/msg00002.html) が、現在のところ解決策はありません。GDB にかかる負担を軽減するために、現在の GDB JIT 統合の実装は 2 つのモード (_default_ および _full_) で動作します (_full_ モードは `--gdbjit-full` フラグで有効化)。_default_ モードでは、V8 は GDB に対しソース情報が付随するコードオブジェクト (通常はすべてのユーザースクリプトを含む) についてのみ通知します。_full_ モードでは、すべての生成されたコードオブジェクト (スタブ、IC、トランポリンなど) について通知します。

- x64 環境では、GDB は `.eh_frame` セクションなしではスタックの巻き戻しが適切に行えません ([Issue 1053](https://bugs.chromium.org/p/v8/issues/detail?id=1053))

- GDB はスナップショットからデシリアライズされたコードについて通知を受けません ([Issue 1054](https://bugs.chromium.org/p/v8/issues/detail?id=1054))

- Intel 互換 CPU 上の Linux OS のみサポートされています。別の OS の場合、異なる ELF ヘッダーが生成されるか、完全に異なるオブジェクト形式が使用される必要があります。

- GDB JIT インターフェースを有効化すると、コンパクト GC が無効化されます。これは、GDB への負荷を軽減するためで、移動された各コードオブジェクトの登録解除と再登録が大きなオーバーヘッドを引き起こすためです。

- GDB JIT 統合はあくまで _おおよその_ ソース情報のみを提供します。ローカル変数、関数の引数、スタックレイアウトなどについての情報は提供されません。また、JavaScript コードのステップ実行や特定行でのブレークポイント設定もサポートされません。ただし、関数名を指定してブレークポイントを設定することは可能です。
