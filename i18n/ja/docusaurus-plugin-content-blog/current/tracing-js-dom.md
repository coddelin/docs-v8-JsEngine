---
title: "JavaScriptからDOMへ、そして再び戻るまでのトレース"
author: "ウラン・デゲンバエフ、アレクセイ・フィリポフ、マイケル・リッパウツ、ハンネス・ペイヤー — DOMの仲間"
avatars: 
  - "ウラン・デゲンバエフ"
  - "マイケル・リッパウツ"
  - "ハンネス・ペイヤー"
date: "2018-03-01 13:33:37"
tags: 
  - internals
  - memory
description: "ChromeのDevToolsは、JavaScriptから参照されるC++ DOMオブジェクトをトレースし、スナップショットを取得して、JavaScriptから到達可能なすべてのDOMオブジェクトを参照付きで表示できるようになりました。"
tweet: "969184997545562112"
---
Chrome 66では、メモリリークのデバッグが格段に簡単になりました。ChromeのDevToolsは、JavaScriptから参照可能なすべてのC++ DOMオブジェクトをトレースおよびスナップショットを取得して、その参照とともに表示することができます。この機能は、V8ガベージコレクタの新しいC++トレースメカニズムの恩恵の一つです。

<!--truncate-->
## 背景

ガベージコレクションシステムにおけるメモリリークは、他のオブジェクトからの意図しない参照により、使用されていないオブジェクトが解放されない場合に発生します。ウェブページのメモリリークは、多くの場合、JavaScriptオブジェクトとDOM要素との間の相互作用が関係します。

[この簡単な例](https://ulan.github.io/misc/leak.html)では、プログラマーがイベントリスナーの登録解除を忘れたときに発生するメモリリークを示しています。イベントリスナーが参照しているオブジェクトは、いずれもガベージコレクションされません。特に、iframeウィンドウはイベントリスナーと共にリークします。

```js
// メインウィンドウ:
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // `localVariable`を使って何かを行う。
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // バグ: `leakingListener`の登録解除を忘れた。
});
```

リークしたiframeウィンドウは、そのJavaScriptオブジェクトもすべて保持し続けます。

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

メモリリークの根本原因を見つけるには、保持パスの概念を理解することが重要です。保持パスとは、リークしたオブジェクトのガベージコレクションを妨げるオブジェクトの連鎖です。この連鎖は、メインウィンドウのグローバルオブジェクトのようなルートオブジェクトから始まり、リークしたオブジェクトに終わります。連鎖内の各中間オブジェクトは、次のオブジェクトへの直接参照を持っています。例えば、iframe内の`Leak`オブジェクトの保持パスは以下のようになります:

![図1: `iframe`とイベントリスナーによるオブジェクトの保持パス](/_img/tracing-js-dom/retaining-path.svg)

保持パスがJavaScript / DOMの境界（それぞれ緑/赤で強調）を二度横断していることに注意してください。JavaScriptオブジェクトはV8ヒープ内に存在し、DOMオブジェクトはChrome内のC++オブジェクトです。

## DevToolsヒープスナップショット

DevToolsでヒープスナップショットを取得することで、任意のオブジェクトの保持パスを調査できます。ヒープスナップショットは、V8ヒープ内のすべてのオブジェクトを正確にキャプチャします。しかし、最近まではC++ DOMオブジェクトに関する情報は不完全でした。例えば、Chrome 65では、以前の例の`Leak`オブジェクトに対する保持パスが不完全です:

![図2: Chrome 65の保持パス](/_img/tracing-js-dom/chrome-65.png)

最初の行だけが正確です: `Leak`オブジェクトは実際にiframeのwindowオブジェクトの`global_variable`に格納されています。後続の行は実際の保持パスを概略的に示しており、メモリリークのデバッグを困難にします。

Chrome 66では、DevToolsがC++ DOMオブジェクトをトレースし、それらの間のオブジェクトや参照を正確にキャプチャします。これは以前にクロスコンポーネントガベージコレクションのために導入された強力なC++オブジェクトトレースメカニズムに基づいています。その結果、[DevToolsの保持パス](https://www.youtube.com/watch?v=ixadA7DFCx8)が実際に正確になりました:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>図3: Chrome 66の保持パス</figcaption>
</figure>

## 内部: クロスコンポーネントトレーシング

DOMオブジェクトはChromeのレンダリングエンジンであるBlinkによって管理されており、これは画面上のテキストや画像にDOMを変換する役割を果たしています。BlinkとそのDOMの表現はC++で記述されているため、DOMは直接JavaScriptに公開することができません。その代わりに、DOM内のオブジェクトは2つの部分に分かれています: JavaScriptに提供されるV8ラッパーオブジェクトと、DOM内のノードを表すC++オブジェクト。このオブジェクト同士は直接参照を持っています。複数のコンポーネント（例えば、BlinkとV8）間でオブジェクトの生存性と所有権を決定することは難しく、関係するすべての当事者がどのオブジェクトがまだ生存しているか、またどのオブジェクトが回収可能であるかについて合意する必要があります。

Chrome 56以前のバージョン（2017年3月まで）では、Chromeは_object grouping_という仕組みを使用してオブジェクトの生存性を判断していました。オブジェクトは文書内に含まれているかどうかでグループ分けされ、1つのオブジェクトが他の保持経路を通じて生存している限り、そのグループ内のすべてのオブジェクトが生存すると考えられていました。これは常にその文書に関連付けられるDOMノードに対しては適切で、いわゆるDOMツリーを形成します。しかし、この抽象化により、実際の保持経路がすべて削除され、図2に示すようにデバッグが困難になりました。このシナリオに適合しないオブジェクトの場合、例えばイベントリスナーとして使用されるJavaScriptのクロージャなど、この方法は扱いにくくなり、JavaScriptのラッパーオブジェクトが予期せず収集されることで、プロパティをすべて失った空のJSラッパーに置き換えられるなど、さまざまなバグにつながりました。

Chrome 57から、このアプローチはクロスコンポーネントトレーシングに置き換えられました。この仕組みでは、JavaScriptからDOMのC++実装へ、そして戻る形で追跡することで生存性を判断します。C++サイドでは、書き込みバリアを使用してインクリメンタルトレーシングを実装し、[以前のブログ投稿](/blog/orinoco-parallel-scavenger)で述べたような止めることのあるトレーシングのガクつきを防ぎました。クロスコンポーネントトレーシングはより良いレイテンシを提供するだけでなく、コンポーネント間の境界を超えたオブジェクトの生存性をより適切に近似し、以前はリークを引き起こしていた[いくつかのシナリオ](https://bugs.chromium.org/p/chromium/issues/detail?id=501866)を修正します。その上で、DevToolsが図3に示されているように、実際にDOMを表すスナップショットを提供できるようになります。

ぜひ試してみてください！ご意見をお待ちしています。
