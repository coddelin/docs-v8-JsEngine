---
title: "JavaScriptモジュール"
author: "Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) と Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
- "addy-osmani"
- "mathias-bynens"
date: 2018-06-18
tags: 
  - ECMAScript
  - ES2015
description: "この記事では、JavaScriptモジュールの使い方、責任を持ってデプロイする方法、そしてChromeチームが将来モジュールをさらに良くするために取り組んでいることについて説明します。"
tweet: "1008725884575109120"
---
JavaScriptモジュールは現在、[すべての主要なブラウザでサポートされています](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

この記事では、JSモジュールの使い方、責任を持ってデプロイする方法、そしてChromeチームが将来モジュールをさらに良くするために取り組んでいることについて説明します。

## JSモジュールとは？

JSモジュール（「ESモジュール」や「ECMAScriptモジュール」とも呼ばれる）は、主要な新機能、または新機能の集合です。過去に独自のJavaScriptモジュールシステムを使用していたことがあるかもしれません。[Node.jsのようなCommonJS](https://nodejs.org/docs/latest-v10.x/api/modules.html)や[AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)など、もしくは別の何かを使ったかもしれません。これらのモジュールシステムには1つの共通点があります: インポートとエクスポートが可能です。

<!--truncate-->
JavaScriptは、それを標準化した構文を持つようになりました。モジュール内では、`export` キーワードを使用してほぼ何でもエクスポートできます。`const`、`function`、その他の変数バインディングや宣言をエクスポートできます。変数文や宣言の先頭に `export` を付けるだけで設定完了です:

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

その後、`import` キーワードを使用して別のモジュールからモジュールをインポートできます。ここでは、`lib` モジュールから `repeat` と `shout` の機能をインポートし、それを `main` モジュールで使用しています:

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('Modules in action');
// → 'MODULES IN ACTION!'
```

また、モジュールからデフォルトの値をエクスポートすることもできます:

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

このような`default`エクスポートは、任意の名前でインポートできます:

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

モジュールは古典的なスクリプトとは少し異なります:

- モジュールはデフォルトで[厳格モード](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)が有効です。

- HTMLスタイルのコメント構文はモジュールではサポートされていませんが、古典的なスクリプトでは機能します。

    ```js
    // JavaScriptでHTMLスタイルのコメント構文は使用しないでください！
    const x = 42; <!-- TODO: xをyに名前を変更する。
    // 通常のシングルラインコメントを使用してください:
    const x = 42; // TODO: xをyに名前を変更する。
    ```

- モジュールには字句的なトップレベルのスコープがあります。つまり、例えばモジュール内で`var foo = 42;` を実行しても、ブラウザで`window.foo` を通じてアクセスできるグローバル変数`foo`を作成することはありません。しかしこれは古典的なスクリプトでは可能です。

- 同様に、モジュール内の`this`はグローバル`this`ではなく`undefined`です（グローバル`this`が必要な場合は[`globalThis`](/features/globalthis)を使用してください）。

- 新しい静的な`import`および`export`構文はモジュール内でのみ使用可能で、古典的なスクリプトでは機能しません。

- [トップレベルの`await`](/features/top-level-await)はモジュール内で利用可能ですが、古典的なスクリプトでは利用できません。関連して、`await`はモジュール内のどこでも変数名として使用することはできませんが、古典的なスクリプトでは非同期関数の外で`await`という名前の変数を作成することが可能です。

これらの違いのため、*同じJavaScriptコードがモジュールとして扱われる場合と古典的なスクリプトとして扱われる場合で、動作が異なることがあります*。そのためJavaScriptランタイムはどのスクリプトがモジュールであるかを知る必要があります。

## ブラウザでJSモジュールを使用する

ウェブでは、`<script>` 要素の`type`属性を`module`に設定することで、ブラウザにそれをモジュールとして扱うよう指示できます。

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

`type="module"` を理解するブラウザは、`nomodule` 属性を含むスクリプトを無視します。これにより、モジュール対応ブラウザにはモジュールベースのペイロードを提供し、その他のブラウザにはフォールバックを提供することができます。この区別を可能にする能力は、特にパフォーマンスの観点から素晴らしいです！考えてみてください。モジュールをサポートするのは現代のブラウザだけです。ブラウザがモジュールコードを理解しているなら、それは同時に [モジュール以前から存在していた機能](https://codepen.io/samthor/pen/MmvdOM)（例えば、アロー関数や `async`-`await`）をサポートしていることを意味します。もはやモジュールバンドル内でこれらの機能をトランスパイルする必要はありません！これにより、[モダンブラウザには軽量でほぼトランスパイルされていないモジュールベースのペイロードを提供することが可能になります](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)。古いブラウザのみが `nomodule` ペイロードを取得します。

[モジュールはデフォルトで遅延実行](#defer)されるため、`nomodule` スクリプトも遅延実行で読み込むことを検討するかもしれません:

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### モジュールと従来のスクリプトのブラウザ固有の違い

これまでで分かるように、モジュールは従来のスクリプトとは異なります。これまで述べたプラットフォームに依存しない違いに加えて、ブラウザ固有の違いもいくつか存在します。

例えば、モジュールは 1 度だけ評価されますが、従来のスクリプトは DOM に追加された回数分評価されます。

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js は複数回実行されます。 -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import './module.mjs';</script>
<!-- module.mjs は 1 度だけ実行されます。 -->
```

また、モジュールスクリプトとその依存関係は CORS によってフェッチされます。これにより、クロスオリジンのモジュールスクリプトは `Access-Control-Allow-Origin: *` のような適切なヘッダーで提供されなければなりません。これは従来のスクリプトには当てはまりません。

もう一つの違いは `async` 属性に関連します。この属性はスクリプトを HTML パーサーをブロックせずに（`defer` のように）ダウンロードするようにしますが、スクリプトを可能な限り早く実行し、HTML パーサーの終了を待つことなく、保証された順序もありません。`async` 属性はインラインの従来のスクリプトでは機能しませんが、インラインの `<script type="module">` では機能します。

### ファイル拡張子についての注意

モジュールには `.mjs` ファイル拡張子を使用していることに気付いたかもしれません。Web 上では、ファイル拡張子はあまり重要ではありません。ファイルが [JavaScript MIMEタイプ `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type) で提供されている限り問題ありません。ブラウザはスクリプト要素の `type` 属性によってそれがモジュールであることを知ります。

それでも、モジュールに `.mjs` 拡張子を使用することを推奨します。理由は 2 つあります:

1. 開発中に `.mjs` 拡張子がファイルが従来のスクリプトではなくモジュールであることを明確に示します（コードを見るだけでは判別できない場合があります）。前述の通り、モジュールは従来のスクリプトとは異なる扱いを受けるため、この違いは非常に重要です。
1. これにより、ファイルが [Node.js](https://nodejs.org/api/esm.html#enabling) や [`d8`](/docs/d8)、[Babel](https://babeljs.io/docs/en/options#sourcetype) などのビルドツールなどのランタイムにモジュールとして解析されることが保証されます。これらの環境やツールは他の拡張子をモジュールとして解釈するための独自の構成方法を持っていますが、`.mjs` 拡張子はモジュールとしてファイルを扱うための互換性のある方法です。

:::note
**注意:** `.mjs` を Web 上でデプロイするには、前述のように適切な `Content-Type: text/javascript` ヘッダーでこの拡張子を持つファイルを提供するように Web サーバーを構成する必要があります。また、`.mjs` ファイルを `.js` ファイルとして扱うようにエディターを構成してシンタックスハイライトを取得することも検討できます。ほとんどの最新エディターは既にこれをデフォルトで行っています。
:::

### モジュール指定子

モジュールを `import` する際に、モジュールの場所を指定する文字列は「モジュール指定子」または「インポート指定子」と呼ばれます。先ほどの例では、モジュール指定子は `'./lib.mjs'` です:

```js
import {shout} from './lib.mjs';
//                  ^^^^^^^^^^^
```

ブラウザではモジュール指定子にいくつかの制限があります。いわゆる「裸の」モジュール指定子は現在はサポートされていません。この制限は、将来ブラウザがカスタムモジュールローダーに特別な意味を与えることができるようにするために [指定](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier) されています。例えば次のような裸のモジュール指定子には特別な意味を与える可能性があります:

```js
// 未サポート:
import {shout} from 'jquery';
import {shout} from 'lib.mjs';
import {shout} from 'modules/lib.mjs';
```

一方、次の例はすべてサポートされています:

```js
// サポート:
import {shout} from './lib.mjs';
import {shout} from '../lib.mjs';
import {shout} from '/modules/lib.mjs';
import {shout} from 'https://simple.example/modules/lib.mjs';
```

現時点では、モジュール指定子は完全な URL、または `/`, `./`, `../` で始まる相対 URL である必要があります。

### モジュールはデフォルトで遅延実行

従来の `<script>` はデフォルトで HTML パーサーをブロックします。それを回避するには [`defer` 属性](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer) を追加することで、スクリプトのダウンロードが HTML パーサーと並行して行われるようにすることができます。

![](/_img/modules/async-defer.svg)

モジュールスクリプトはデフォルトで遅延実行されます。そのため、`<script type="module">`タグに`defer`を追加する必要はありません！メインモジュールのダウンロードはHTML解析と並行して行われるだけでなく、依存モジュールでも同様です。

## その他のモジュール機能

### 動的な`import()`

これまで静的な`import`のみを使用してきました。静的`import`では、メインコードが実行できるようになる前にモジュール全体をダウンロードして実行する必要があります。しかし、必要なとき、例えばユーザーがリンクやボタンをクリックした際などにのみモジュールをロードしたい場合があります。これにより初回ロードのパフォーマンスが向上します。[動的な`import()`](/features/dynamic-import)でこれが可能になります！

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './lib.mjs';
    const {repeat, shout} = await import(moduleSpecifier);
    repeat('hello');
    // → 'hello hello'
    shout('Dynamic import in action');
    // → 'DYNAMIC IMPORT IN ACTION!'
  })();
</script>
```

静的な`import`とは違い、動的な`import()`は通常のスクリプト内でも使用できます。これは既存のコードベースで段階的にモジュールを使い始める簡単な方法です。詳細については、[動的な`import()`に関する記事](/features/dynamic-import)をご覧ください。

:::note
**注:** [webpackは独自の`import()`](https://web.dev/use-long-term-caching/)を提供しており、インポートされたモジュールをメインバンドルから分離した独立したチャンクに分けることができます。
:::

### `import.meta`

もう1つの新しいモジュール関連機能は`import.meta`です。これにより現在のモジュールに関するメタデータを取得できます。取得できるメタデータの正確な内容はECMAScriptの一部として指定されておらず、ホスト環境によります。例えば、ブラウザではNode.jsとは異なるメタデータが得られるかもしれません。

以下はウェブ上での`import.meta`の例です。デフォルトでは画像はHTMLドキュメント内の現在のURLに対して相対的にロードされますが、`import.meta.url`を使用すると現在のモジュールに対して相対的に画像をロードすることが可能です。

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail('../img/thumbnail.png');
container.append(thumbnail);
```

## パフォーマンス推奨事項

### バンドルを維持する

モジュールを使用すると、webpack、Rollup、Parcelなどのバンドラーを使用せずにウェブサイトを開発できるようになります。以下の状況では、ネイティブJSモジュールを直接使用しても問題ありません：

- ローカル開発時
- 合計で100モジュール未満で、依存ツリーが比較的浅い（最大深度が5未満）小規模ウェブアプリの場合

しかし、[Chromeの読み込みパイプラインのボトルネック分析](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub)で学んだように、約300モジュールで構成されたモジュール化ライブラリをロードする場合、バンドルされたアプリケーションの方が未バンドルのものより読み込みパフォーマンスが優れています。

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

この理由の1つは、静的な`import`/`export`構文が静的に解析可能であるため、バンドラーツールが未使用のエクスポートを削除してコードを最適化するのに役立つことです。静的な`import`と`export`は単なる構文以上のものであり、重要なツール機能です！

*モジュールを本番環境にデプロイする前に引き続きバンドラーを使用することをお勧めします。* バンドル化はコードを圧縮する最適化に似ています。これによりパフォーマンスが向上し、最終的には少ないコードを配信することになります。バンドル化も同じ効果をもたらします！バンドルを維持しましょう。

いつものように、[DevToolsのコードカバレッジ機能](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)を使用して不要なコードをユーザーに送信しているかどうかを特定できます。また、[コード分割](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading)を使用してバンドルを分割し、非最初の意味のある描画の重要なスクリプトのロードを遅らせることをお勧めします。

#### バンドル化と未バンドルモジュール配信のトレードオフ

ウェブ開発では通常すべてがトレードオフです。未バンドルモジュールを配信すると初回ロードパフォーマンス（コールドキャッシュ）が低下する可能性がありますが、コード分割なしで単一バンドルを配信する場合と比べて、2回目以降の訪問（ウォームキャッシュ）での読み込みパフォーマンスが向上する可能性があります。200 KBのコードベースで細かいモジュール1つだけを変更し、それが次回の訪問でサーバーから唯一のフェッチである方が、全体のバンドルを再取得するよりはるかに良いです。

ウォームキャッシュを持つ訪問者の体験を初回訪問のパフォーマンスよりも重視していて、数百未満の細かいモジュールで構成されたサイトを持っている場合、未バンドルモジュールの配信を試してコールドロードとウォームロードの両方でパフォーマンス影響を測定し、データに基づいた決定を下すことができます！

ブラウザのエンジニアたちは、モジュールのパフォーマンスを出荷時点で改善するために尽力しています。時間の経過とともに、モジュールをバンドルせずに出荷することが、より多くの状況で実現可能になると期待されています。

### 細粒度のモジュールを使用する

コードを書く際には、小さく細分化されたモジュールを使用する習慣をつけましょう。開発中は、多くのエクスポートを1つのファイルに手動でまとめるよりも、モジュールごとに少数のエクスポートを持つ方が一般的に良いです。

`./util.mjs` という名前のモジュールがあり、`drop`、`pluck`、`zip` という3つの関数をエクスポートしているとします:

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

コードベースが `pluck` の機能だけを必要としている場合、おそらく以下のようにインポートするでしょう:

```js
import {pluck} from './util.mjs';
```

この場合でも（ビルド時にバンドルするステップなしでは）、ブラウザは結局、`pluck` だけが必要であっても、`./util.mjs` モジュール全体をダウンロード、解析、コンパイルする必要があります。それは無駄です！

`pluck` が `drop` や `zip` とコードを共有していないのであれば、それを専用の細粒度のモジュール、例えば `./pluck.mjs` に移す方が良いです。

```js
export function pluck() { /* … */ }
```

そして、`drop` や `zip` を扱う負担を避けて `pluck` をインポートすることができます:

```js
import {pluck} from './pluck.mjs';
```

:::note
**注意:** 名前付きエクスポートの代わりに `default` エクスポートを使用することも可能です。これは個人の好みによります。
:::

これにより、ソースコードを簡潔でわかりやすく保つだけでなく、バンドラーによるデッドコード除去の必要性も減少します。ソースツリー内のモジュールのうち使用されていないものはインポートされないため、ブラウザはそれをダウンロードする必要がなくなります。使用されるモジュールはブラウザによって個別に[コードキャッシュ](/blog/code-caching-for-devs) されることができます。（これを実現するインフラストラクチャはすでに V8 に導入されており、[Chrome でも有効化する作業](https://bugs.chromium.org/p/chromium/issues/detail?id=841466) が進行中です。）

小さく細分化されたモジュールを使用することで、将来的に[ネイティブなバンドリングソリューション](#web-packaging)を利用できるようになる状況に備えることができます。

### モジュールを事前ロードする

[`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload) を使用することで、モジュールの配信をさらに最適化できます。この方法により、ブラウザはモジュールやその依存関係を事前にロードし、さらには事前解析および事前コンパイルすることができます。

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

これは特に依存関係ツリーが大きい場合に重要です。`rel="modulepreload"` がない場合、ブラウザは完全な依存関係ツリーを特定するために複数のHTTPリクエストを行う必要があります。しかし、`rel="modulepreload"` を使用して依存するモジュールスクリプトのリストを完全に宣言すれば、ブラウザはこれらの依存関係を段階的に検出する必要がありません。

### HTTP/2 を使用する

可能であれば HTTP/2 を使用することは、[マルチプレックスサポート](https://web.dev/performance-http2/#request-and-response-multiplexing) だけを理由としても、常に良いパフォーマンスのアドバイスです。HTTP/2 のマルチプレキシングにより、複数のリクエストおよび応答メッセージを同時にやり取りできるため、モジュールツリーのロードに役立ちます。

Chrome チームは、特に[HTTP/2 サーバープッシュ](https://web.dev/performance-http2/#server-push)が高度にモジュール化されたアプリを配信するための実用的なソリューションとなるかどうかを調査しました。しかし、[HTTP/2 サーバープッシュは正しく設定するのが難しい](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/)ため、現在のところ、ウェブサーバーやブラウザの実装は高度にモジュール化されたウェブアプリのユースケースに最適化されていません。例えば、ユーザーが既にキャッシュしていないリソースのみをプッシュすることが難しく、オリジンのすべてのキャッシュ状態をサーバーに伝えることでそれを解決しようとすると、プライバシーのリスクがあります。

ですから、ぜひ HTTP/2 を使用してください！ただし、HTTP/2 サーバープッシュが（残念ながら）万能の解決策ではないことを忘れないでください。

## JS モジュールのウェブ上での採用状況

JS モジュールはウェブ上で徐々に採用が進んでいます。[私たちの使用状況カウンター](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062)によると、現在 `<script type="module">` を使用しているページの読み込みは全体の0.08%です。この数には、動的な `import()` や [worklets](https://drafts.css-houdini.org/worklets/) などの他のエントリーポイントは含まれません。

## JS モジュールのこれからは？

Chrome チームは、JS モジュールを使った開発時の体験を様々な方法で改善する作業を進めています。そのうちのいくつかについて説明します。

### 高速かつ決定論的なモジュール解決アルゴリズム

モジュール解決アルゴリズムの速度と決定論の欠陥に対処する変更を提案しました。この新しいアルゴリズムは現在、[HTML仕様](https://github.com/whatwg/html/pull/2991)と[ECMAScript仕様](https://github.com/tc39/ecma262/pull/1006)の両方で採用されており、[Chrome 63](http://crbug.com/763597)で実装されています。この改善が間もなく他のブラウザにも導入される予定です！

新しいアルゴリズムは、はるかに効率的で高速です。古いアルゴリズムの計算複雑度は、依存グラフのサイズによって二次的（すなわち𝒪(n²））でしたが、新しいアルゴリズムは線形（すなわち𝒪(n））です。

さらに、新しいアルゴリズムは、解決エラーを決定論的に報告します。複数のエラーを含むグラフでは、古いアルゴリズムの異なる実行が、解決失敗の原因として異なるエラーを報告する可能性がありました。これによりデバッグが不必要に困難になっていました。新しいアルゴリズムは、毎回同じエラーを報告することを保証します。

### WorkletsとWebワーカー

Chromeでは現在、[Worklets](https://drafts.css-houdini.org/worklets/)が実装されており、これによりWeb開発者がブラウザの「低レベル部分」におけるハードコーディングされたロジックをカスタマイズできるようになります。Workletsを使用すると、JSモジュールをレンダリングパイプラインやオーディオ処理パイプライン（おそらく将来的にはさらに多くのパイプライン！）に供給できます。

Chrome 65では、DOM要素を描画方法を制御するための[`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi)（通称CSS Paint API）をサポートしています。

```js
const result = await css.paintWorklet.addModule('paint-worklet.mjs');
```

Chrome 66では、独自のコードでオーディオ処理を制御できる[`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet)をサポートしています。同じChromeバージョンでは、[`AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)の[OriginTrial](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)を開始しました。これにより、スクロールリンクされた高性能な手続き型アニメーションを作成できます。

最後に、[`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/)（通称CSS Layout API）は、現在Chrome 67で実装されています。

Chrome上で専用WebワーカーでJSモジュールを使用するためのサポートを追加作業中です。この機能は`chrome://flags/#enable-experimental-web-platform-features`を有効にしてすでに試すことができます。

```js
const worker = new Worker('worker.mjs', { type: 'module' });
```

共有ワーカーとService Worker向けのJSモジュールサポートも間もなく提供予定です：

```js
const worker = new SharedWorker('worker.mjs', { type: 'module' });
const registration = await navigator.serviceWorker.register('worker.mjs', { type: 'module' });
```

### Import maps

Node.js/npmでは、「パッケージ名」でJSモジュールをインポートすることが一般的です。例えば：

```js
import moment from 'moment';
import {pluck} from 'lodash-es';
```

現在のところ、[HTML仕様](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)によれば、そのような「ベアインポート指定子」は例外をスローします。[Import maps提案](https://github.com/domenic/import-maps)により、このようなコードがWeb上で動作し、プロダクションアプリでも利用可能になります。Import Mapは、ブラウザがベアインポート指定子を完全なURLに変換するのを助けるJSONリソースです。

Import mapsはまだ提案段階です。さまざまなユースケースにどのように対応するかについて多くのことを検討してきましたが、まだコミュニティとの関与段階であり、完全な仕様は記述されていません。フィードバック歓迎です！

### Webパッケージング：ネイティブバンドル

Chromeロードチームは現在、Webアプリを配布する新しい方法として[ネイティブWebパッケージング形式](https://github.com/WICG/webpackage)を模索しています。Webパッケージングの主要機能は以下の通りです：

ブラウザが単一のHTTPリクエスト/レスポンスペアが主張する元の生成元によって生成されたことを信頼できるようにする[署名付きHTTP交換](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)；[バンドルされたHTTP交換](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00)、すなわち、署名されているかどうかにかかわらず、いくつかの交換とそれを全体として解釈する方法を記述するメタデータの集合。

これらを組み合わせることで、*複数の同じ元のリソース*を*単一の*HTTP `GET`応答内に*安全に埋め込む*ことが可能になります。

webpack、Rollup、Parcelのような既存のバンドルツールは現在、元の分離されたモジュールやアセットのセマンティクスを失いながら単一のJavaScriptバンドルを生成します。ネイティブバンドルでは、ブラウザがリソースを元の形に戻すことができます。簡単に言えば、バンドルされたHTTP交換はコンテンツ（マニフェスト）の表とリソースが効率的に保存およびラベル付けされる形式にリソースを順序付けてアクセスし、その相対的な重要性に基づいた管理を可能にし、個々のファイルの概念を維持します。このため、ネイティブバンドルはデバッグ体験を改善できます。DevToolsでアセットを表示する際、ブラウザは複雑なソースマップを求めることなく元々のモジュールを特定できます。

ネイティブバンドル形式の透明性は、さまざまな最適化の機会を提供します。たとえば、ブラウザがすでにネイティブバンドルの一部をローカルにキャッシュしている場合、それをウェブサーバーに通知し、不足している部分だけをダウンロードすることができます。

Chromeは提案の一部（[`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)）をすでにサポートしていますが、バンドル形式そのものや高度にモジュール化されたアプリへの適用については、まだ探求段階にあります。リポジトリや電子メール [loading-dev@chromium.org](mailto:loading-dev@chromium.org) を通じてフィードバックをお寄せいただけると幸いです！

### レイヤードAPI

新機能やウェブAPIを提供することには、継続的なメンテナンスとランタイムコストが伴います。新機能を追加するたびにブラウザの名前空間が汚染され、起動コストが増加し、コードベース全体にバグが入り込む新たな表面となります。[レイヤードAPI](https://github.com/drufball/layered-apis)は、よりスケーラブルな方法でウェブブラウザに高レベルAPIを実装・提供する取り組みです。JSモジュールは、レイヤードAPIを実現するための重要な技術です:

- モジュールが明示的にインポートされるため、レイヤードAPIをモジュールを通じて公開する要件を設けることで、開発者が使用するAPIに対してのみコストを支払うことを保証します。
- モジュールの読み込みは設定可能であるため、レイヤードAPIは、これをサポートしていないブラウザで自動的にポリフィルを読み込むための仕組みを備えることができます。

モジュールとレイヤードAPIがどのように連携するかについての詳細は[まだ検討中](https://github.com/drufball/layered-apis/issues)ですが、現在の提案は次のようなものです:

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

`<script>`要素は、ブラウザの組み込みレイヤードAPIセット（`std:virtual-scroller`）またはポリフィルを指すフォールバックURLのいずれかから`virtual-scroller` APIを読み込みます。このAPIはウェブブラウザでJSモジュールができることをすべて実行できます。一例として、[カスタム`<virtual-scroller>`要素](https://www.chromestatus.com/feature/5673195159945216)を定義することで、次のHTMLが望まれる形で漸進的に強化されます:

```html
<virtual-scroller>
  <!-- コンテンツがここに入ります。 -->
</virtual-scroller>
```

## クレジット

JavaScriptモジュールを高速化するために尽力されたDomenic Denicola、Georg Neis、中川裕基、林崎宏重、Jakob Gruber、上野晃平、阪本邦彦、Yang Guoに感謝します！

また、このガイドのドラフト版を読んでフィードバックを提供してくださったEric Bidelman、Jake Archibald、Jason Miller、Jeffrey Posnick、Philip Walton、Rob Dodson、Sam Dutton、Sam Thorogood、Thomas Steinerにも感謝します。
