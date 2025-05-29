---
title: "安定した `Array.prototype.sort`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-07-02
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.sort が安定ソートであることが保証されました。"
tweet: "1146067251302244353"
---
犬の配列を持っているとして、それぞれの犬には名前と評価があります。（これが奇妙な例に聞こえるなら、これを専門としているTwitterアカウントがあることを知っておくと良いでしょう…聞かないでくださいね！）

```js
// 配列が `name` でアルファベット順にソートされている点に注意してください。
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// 犬を `rating` の降順でソートします。
// （この操作は `doggos` を直接変更します。）
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
配列は名前順（アルファベット順）であらかじめソートされています。代わりに評価順でソートするには（最高評価の犬が最初に来るように）、`Array#sort` を使用し、評価を比較するカスタムコールバックを渡します。これが期待される結果です:

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

犬は評価順にソートされますが、それぞれの評価内では名前順（アルファベット順）にソートされています。たとえば、Choco と Ghost の評価はどちらも 14 ですが、ソート結果では Choco が Ghost の前に現れます。これは、元の配列でもこの順序だったためです。

しかし、この結果を得るには、JavaScript エンジンが _任意の_ ソートアルゴリズムを使用するわけにはいきません。いわゆる「安定ソート」が必要です。長い間、JavaScript の仕様では `Array#sort` の安定性を要求せず、実装に任せていました。このため、この動作が未定義だったため、たとえば以下のようなソート結果も得られる可能性がありました。この場合、Ghost が突然 Choco よりも前に現れます:

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

つまり、JavaScript 開発者はソートの安定性に依存することができませんでした。実際、状況はさらに厄介でした。一部の JavaScript エンジンは、短い配列には安定ソートを使用し、大きな配列には不安定なソートを使用することがあったからです。これは非常に混乱を招きました。開発者はテストでは安定した結果を確認できても、本番環境で配列が少し大きくなると突然不安定な結果が得られることもありました。

しかし、良い知らせです。[`Array#sort` を安定ソートにする仕様変更](https://github.com/tc39/ecma262/pull/1340)を提案し、それが受け入れられました。現在、すべての主要な JavaScript エンジンは安定した `Array#sort` を実装しています。これで JavaScript 開発者としてまたひとつ心配事が減りましたね。素晴らしい！

（あ、それと、[`TypedArray` にも同じ変更を行いました](https://github.com/tc39/ecma262/pull/1433)。こちらも安定ソートになっています。）

:::note
**注:** 仕様により安定性が要求されるようになりましたが、JavaScript エンジンは依然として任意のソートアルゴリズムを実装する自由があります。例えば、[V8 は Timsort を使用しています](/blog/array-sort#timsort)。仕様は特定のソートアルゴリズムを義務付けていません。
:::

## 機能サポート

### 安定した `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### 安定した `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
