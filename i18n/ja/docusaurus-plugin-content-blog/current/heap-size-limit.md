---
title: &apos;Chromeの小さな一歩、V8の巨大な飛躍&apos;
author: &apos;ヒープの守護者 Ulan Degenbaev、Hannes Payer、Michael Lippautz、そしてDevToolsの戦士 Alexey Kozyatinskiy&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2017-02-09 13:33:37
tags:
  - memory
description: &apos;最近V8ではヒープサイズのハードリミットを増加しました。&apos;
---
V8にはヒープサイズに関するハードリミットがあります。これはメモリリークがあるアプリケーションに対する安全対策として機能します。アプリケーションがこのハードリミットに達すると、V8は緊急措置として一連のガベージコレクションを実行します。ガベージコレクションがメモリを解放するのに役立たない場合、V8は実行を停止し、メモリ不足のエラーを報告します。ハードリミットがなければ、メモリリークがあるアプリケーションがシステムのメモリをすべて使い果たし、他のアプリケーションのパフォーマンスに悪影響を与える可能性があります。

<!--truncate-->
皮肉なことに、この安全対策メカニズムはJavaScript開発者にとってメモリリークの調査を困難にします。開発者がDevToolsでヒープを調査する前に、アプリケーションがメモリ不足になる可能性があります。さらに、DevToolsプロセス自体が通常のV8インスタンスを使用しているため、メモリ不足になる可能性があります。例えば、[このデモ](https://ulan.github.io/misc/heap-snapshot-demo.html)でヒープスナップショットを取得しようとすると、現在の安定版のChromeではメモリ不足により実行が中断します。

歴史的にV8のヒープリミットは、32ビットの符号付き整数の範囲に収まるよう便利に設定されていました。しかし、年月を経てこの便利さがV8内のだらしないコードにつながり、異なるビット幅の型を混用することがあり、結果としてリミットを増加させる能力が損なわれました。最近では、ガベージコレクタコードのクリーンアップを行い、より大きなヒープサイズをサポートできるようにしています。DevToolsはすでにこの機能を活用しており、先ほど述べたデモでヒープスナップショットを取得する操作が最新のChrome Canaryでは期待通りに動作します。

さらに、DevToolsにメモリ不足に近づいた際にアプリケーションを一時停止する機能を追加しました。この機能は、短期間で大量のメモリを割り当てる原因となるバグの調査に役立ちます。[このデモ](https://ulan.github.io/misc/oom.html)を最新のChrome Canaryで実行すると、DevToolsはメモリ不足のエラーが発生する前にアプリケーションを一時停止し、ヒープリミットを増加させ、ユーザーがヒープを調査したり、コンソールで式を評価してメモリを解放したり、その後のデバッグのために実行を再開する機会を提供します。

![](/_img/heap-size-limit/debugger.png)

V8を組み込むエンベッダーは、`ResourceConstraints` APIの[`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes)関数を使用してヒープリミットを増加させることができます。ただし注意してください。ガベージコレクタのいくつかのフェーズではヒープサイズに線形依存する部分があります。ヒープが大きくなるとガベージコレクションの停止時間が増加する可能性があります。
