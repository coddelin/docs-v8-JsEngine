---
title: &apos;GDBを使用したビルトインのデバッグ&apos;
description: &apos;V8 v6.9以降では、GDBでCSA / ASM / Torqueビルトインをデバッグするためのブレークポイントを作成することが可能です。&apos;
---
V8 v6.9以降では、GDB（おそらく他のデバッガーでも）でCSA / ASM / Torqueビルトインをデバッグするためのブレークポイントを作成することが可能です。

```
(gdb) tb i::Isolate::Init
一時ブレークポイント 1が0x7ffff706742b: i::Isolate::Initでヒットしました。(2箇所)
(gdb) r
スレッド 1 "d8" が一時ブレークポイント 1で停止しました, 0x00007ffff7c55bc0 in Isolate::Init
(gdb) br Builtins_RegExpPrototypeExec
ブレークポイント 2が0x7ffff7ac8784で設定されました
(gdb) c
スレッド 1 "d8" がブレークポイント 2で停止しました, 0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
```

この方法では、一時ブレークポイント（GDBでのショートカット `tb`）を通常のブレークポイント（`br`）の代わりに使用するのが便利です。プロセス開始時にのみ必要だからです。

ビルトインはスタックトレースにも表示されます:

```
(gdb) bt
#0  0x00007ffff7ac8784 in Builtins_RegExpPrototypeExec ()
#1  0x00007ffff78f5066 in Builtins_ArgumentsAdaptorTrampoline ()
#2  0x000039751d2825b1 in ?? ()
#3  0x000037ef23a0fa59 in ?? ()
#4  0x0000000000000000 in ?? ()
```

留意点:

- 埋め込みビルトインでのみ動作します。
- ビルトインの開始地点でのみブレークポイントを設定できます。
- ビルトインのブレークポイントを設定する前に、`Isolate::Init`で初回ブレークポイントを設定する必要があります。これは、GDBがバイナリを変更し、起動時にバイナリ内のビルトインセクションのハッシュを検証するためです。そうでない場合、V8がハッシュの不一致を報告します:

    ```
    # ../../src/isolate.cc の致命的エラー、117行目
    # チェック失敗: d.Hash() == d.CreateHash() (11095509419988753467 vs. 3539781814546519144).
    ```
