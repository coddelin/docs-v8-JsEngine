---
title: 'V8 ❤️ Node.js'
author: 'フランツィスカ・ヒンケルマン, Node モンキーパッチャー'
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: 'このブログ記事では、Node.jsがV8とChrome DevToolsでより良くサポートされるための最近の取り組みを紹介します。'
---
Node.jsの人気はここ数年で着実に成長しており、私たちはNode.jsをより良くするために取り組んでいます。このブログ記事では、V8とDevToolsにおける最近の取り組みをいくつか紹介します。

## DevToolsでNode.jsをデバッグ

現在、[Chrome開発者ツールを使用してNodeアプリケーションをデバッグ](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t)することができます。Chrome DevToolsチームはデバッグプロトコルを実装するソースコードをChromiumからV8に移動させました。これにより、Node Coreがデバッガーのソースや依存関係を最新の状態に保つことが容易になりました。他のブラウザベンダーやIDEもChromeデバッグプロトコルを利用しており、Nodeを操作する際の開発者体験が向上しています。

<!--truncate-->
## ES2015の高速化

私たちはV8をこれまで以上に高速化するために懸命に取り組んでいます。[最近のパフォーマンス改善作業は主にES6の機能](https://v8.dev/blog/v8-release-56)に焦点を当てています。これには、プロミス、ジェネレータ、デストラクタ、およびrest/spread演算子が含まれます。Node 6.2以降のV8バージョンはES6を完全にサポートしているため、Node開発者はポリフィルを使用せずに新しい言語機能を「ネイティブ」に利用できます。これにより、Node開発者はES6のパフォーマンス向上の恩恵をいち早く受けることができる一方で、パフォーマンスの低下も早期に認識する可能性があります。入念なNodeコミュニティのおかげで、[`instanceof`](https://github.com/nodejs/node/issues/9634)、[`buffer.length`](https://github.com/nodejs/node/issues/9006)、[長い引数リスト](https://github.com/nodejs/node/pull/9643)、および[`let`/`const`](https://github.com/nodejs/node/issues/9729)に関するパフォーマンス問題を含むいくつかの低下を発見し、修正しました。

## Node.jsの`vm`モジュールとREPLの修正が来る

[`vm`モジュール](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html)には[いくつかの長年の制約](https://github.com/nodejs/node/issues/6283)がありました。これらの問題を適切に解決するため、私たちはより直感的な動作を実現するためにV8 APIを拡張しました。`vm`モジュールの改善は、[Node財団のOutreachy](https://nodejs.org/en/foundation/outreachy/)で支援しているプロジェクトの1つであることを発表できることを嬉しく思います。このプロジェクトや他のプロジェクトで今後さらなる進展があることを期待しています。

## `async`/`await`

非同期関数を使用することで、プロミスを順次待機することにより、非同期コードを大幅に簡素化できます。`async`/`await`は[次回のV8アップデート](https://github.com/nodejs/node/pull/9618)でNodeに追加されます。プロミスとジェネレータのパフォーマンスを改善するための最近の作業により、非同期関数が高速化されました。それに関連して、私たちは[プロミスフック](https://bugs.chromium.org/p/v8/issues/detail?id=4643)、すなわち[Node Async Hook API](https://github.com/nodejs/node-eps/pull/18)に必要な一連の内部検査APIを提供する作業も進めています。

## 最新のNode.jsを試してみたいですか？

Nodeで最新のV8機能を試したい、または最新の不安定なソフトウェアを使用することを厭わない場合は、[こちら](https://github.com/v8/node/tree/vee-eight-lkgr)の統合ブランチを試してみてください。[V8はNode.jsに統合される前に最新の継続的統合](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration)が行われるので、問題を早期に発見できます。ただし、Node.js最新ツリーよりもさらに実験的ですのでご注意ください。
