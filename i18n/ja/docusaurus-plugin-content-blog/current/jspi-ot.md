---
title: &apos;WebAssembly JSPIがオリジントライアルに進む&apos;
description: &apos;JSPIのオリジントライアル開始について説明します&apos;
author: &apos;Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl&apos;
date: 2024-03-06
tags:
  - WebAssembly
---
WebAssemblyのJavaScriptプロミス統合(JSPI) APIがChromiumリリースM123でオリジントライアルに入ります。これにより、あなたやユーザーがこの新しいAPIから受けるメリットをテストできます。

JSPIは、WebAssemblyにコンパイルされたいわゆる逐次コードが_非同期_なWeb APIにアクセスできるようにするAPIです。多くのWeb APIはJavaScriptの`Promise`を使用して作成されています。そのため、操作をすぐに実行する代わりに、操作を実行するための`Promise`を返します。操作が最終的に実行されると、ブラウザのタスクランナーがその`Promise`に関連付けられたコールバックを呼び出します。JSPIはこのアーキテクチャにフックして、WebAssemblyアプリケーションが`Promise`を返した時点で一旦中断され、`Promise`が解決された時点で再開できるようにします。

<!--truncate-->
JSPIおよびその使い方についての詳細は[こちら](https://v8.dev/blog/jspi)を、仕様そのものについては[こちら](https://github.com/WebAssembly/js-promise-integration)をご覧ください。

## 要件

オリジントライアルに登録する以外にも、適切なWebAssemblyとJavaScriptを生成する必要があります。Emscriptenを使用している場合、これは簡単です。バージョン3.1.47以上を使用していることを確認してください。

## オリジントライアルに登録する

JSPIはまだプレリリース段階にあり、標準化プロセスを進行中で、プロセスのフェーズ4に到達するまでは完全にはリリースされません。現在それを使用するには、Chromeブラウザでフラグを設定するか、ユーザーが自分でフラグを設定しなくてもアクセスできるようにするオリジントライアルトークンを申請できます。

登録は[こちら](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)で行えます。登録の手続きを必ずお守りください。オリジントライアル全般についての詳細は、[こちら](https://developer.chrome.com/docs/web-platform/origin-trials)が良い出発点です。

## 潜在的な注意点

JSPI APIのいくつかの側面について、WebAssemblyコミュニティでいくつかの[議論](https://github.com/WebAssembly/js-promise-integration/issues)が行われています。その結果、変更が示唆されており、これらがシステム全体に完全に浸透するまでに時間がかかります。これらの変更は*ソフトランチ*される予定で、利用可能になり次第共有されますが、既存のAPIは少なくともオリジントライアルの終了まで維持される予定です。

さらに、オリジントライアル期間中には完全に解決される可能性が低い既知の問題もいくつかあります:

派生した計算を集中的に生成するアプリケーションでは、ラップされたシーケンス（つまり、非同期APIにアクセスするためにJSPIを使用する場合）のパフォーマンスが低下する可能性があります。これは、ラップされた呼び出しを作成する際に使用されるリソースが、呼び出し間でキャッシュされず、ガベージコレクションを頼りに生成されたスタックを片付けるためです。
現在、ラップされた呼び出しごとに固定サイズのスタックを割り当てています。このスタックは複雑なアプリケーションに対応するために必然的に大きくなっています。しかし、多数の単純なラップされた呼び出しが「飛行中」である場合、メモリ圧迫が発生する可能性があります。

これらの問題はいずれも、JSPIの実験を妨げるものではないと考えられ、JSPIが正式にリリースされる前に解決されることを期待しています。

## フィードバック

JSPIは標準化プロセスの取り組みであるため、問題やフィードバックは[こちら](https://github.com/WebAssembly/js-promise-integration/issues)で共有していただきたいと思います。ただし、バグ報告は標準的なChromeバグ報告[サイト](https://issues.chromium.org/new)で提出できます。コード生成に問題がある場合は、[こちら](https://github.com/emscripten-core/emscripten/issues)を使用して問題を報告してください。

最後に、発見したメリットについてお聞かせください。体験を共有するには[イシュートラッカー](https://github.com/WebAssembly/js-promise-integration/issues)をご利用ください。
