---
 title: &apos;V8にヘッズアップを与える: 明示的なコンパイルヒントでJavaScriptの起動を高速化&apos;
 author: &apos;Marja Hölttä&apos;
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "明示的なコンパイルヒントは、どのJavaScriptファイルや関数が積極的に解析およびコンパイルされるべきかを制御します"
 tweet: &apos;&apos;
---

JavaScriptを高速で動作させることは、応答性の高いWebアプリケーションには欠かせません。V8の高度な最適化をもってしても、起動時に重要なJavaScriptを解析およびコンパイルすることがパフォーマンスにボトルネックをもたらす場合があります。初期スクリプトのコンパイル中にどのJavaScript関数をコンパイルするかを把握することで、Webページの読み込みを高速化できます。

<!--truncate-->
ネットワークから読み込まれたスクリプトを処理する際、V8は各関数について、すぐにコンパイルする（"積極的に"）か、それともこのプロセスを遅らせるかを選択する必要があります。コンパイルされていない関数が後で呼び出されると、V8はその関数を未コンパイルのまま要求に応じてコンパイルする必要があります。

ページ読み込み中に呼び出されるJavaScript関数については、以下の理由で積極的にコンパイルすることが有益です:

- スクリプトの初期処理中に、少なくとも軽量なパースを行い、関数の終わりを見つける必要があります。JavaScriptでは関数の終端を見つけるために完全な構文を解析する必要があり（中括弧の数を数えるような近道はできません）、軽量なパースを最初に行い、その後で実際のパースを行うのは作業が重複します。
- 関数を積極的にコンパイルする場合、この作業はバックグラウンドスレッドで実行され、その一部はネットワークからスクリプトを読み込む作業と並行して行われます。一方、関数が呼び出された時にのみコンパイルする場合、並行作業には遅すぎます。メインスレッドは関数がコンパイルされるまで進行できません。

V8がどのようにJavaScriptを解析およびコンパイルするかについて、[こちら](https://v8.dev/blog/preparser)で詳しく読むことができます。

多くのWebページは、適切な関数を選択して積極的にコンパイルすることで恩恵を受けられます。例えば、人気のあるWebページを対象とした実験では、20ページ中17ページで改善が見られ、平均で630msの前景パースおよびコンパイル時間が短縮されました。

私たちは[明示的コンパイルヒント](https://github.com/WICG/explicit-javascript-compile-hints-file-based)という機能を開発中です。これは、Web開発者がどのJavaScriptファイルや関数を積極的にコンパイルするかを制御できるようにするものです。Chrome 136では、個別のファイルを選択して積極的にコンパイルすることができるバージョンがリリースされています。

特に、「コアファイル」を選択して積極的にコンパイルする機能や、コードをソースファイル間で移動させてそのようなコアファイルを作成できる場合に、このバージョンが役立ちます。

ファイル全体を積極的にコンパイルするには、以下のマジックコメントをファイルの先頭に挿入します。

```js
//# allFunctionsCalledOnLoad
```

この機能は慎重に使用する必要があります。コンパイルが多すぎると時間とメモリを消費するからです！

## 自分で試してみよう - コンパイルヒントの実際

V8に関数のイベントをログに記録させることで、コンパイルヒントが動作している様子を観察できます。例えば、以下のファイルを使って最小限のテストを設定できます。

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log(&apos;testfunc1 called!&apos;);
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log(&apos;testfunc2 called!&apos;);
}

testfunc2();
```

ユーザーデータディレクトリをクリーンにしてChromeを実行することを忘れないようにしてください。コードキャッシュが実験に影響しないようにするためです。例として以下のコマンドラインを使用できます。

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

テストページにアクセスした後、ログ内で以下の関数イベントを見ることができます。

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

`testfunc1`は遅延コンパイルされたため、結局呼び出されたときに`parse-function`イベントが記録されているのがわかります。

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

`testfunc2`については、対応するイベントが見られません。これはコンパイルヒントにより強制的に積極的に解析およびコンパイルされたためです。

## 明示的コンパイルヒントの未来

長期的には、個々の関数を積極的にコンパイルする機能へ移行したいと考えています。これにより、Web開発者はコンパイルしたい関数を正確に制御し、最後の性能向上を絞り出してウェブページを最適化することができます。今後の展開にご期待ください！
