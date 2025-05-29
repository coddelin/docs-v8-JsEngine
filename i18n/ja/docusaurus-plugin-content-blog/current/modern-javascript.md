---
title: 'ES2015、ES2016、そしてその先'
author: 'V8チーム、ECMAScriptの愛好家たち'
date: 2016-04-29 13:33:37
tags:
  - ECMAScript
description: 'V8 v5.2がES2015とES2016をサポート！'
---
V8チームは、JavaScriptをますます表現力豊かで明確化された言語に進化させることに大きな重要性を置いています。これにより、高速で安全かつ正確なWebアプリケーションの開発が容易になります。2015年6月に、[ES2015仕様](https://www.ecma-international.org/ecma-262/6.0/)がTC39標準委員会によって批准され、これまでで最大規模のJavaScript言語の更新が行われました。新機能には、[クラス](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)、[アロー関数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)、[プロミス](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)、[イテレータ/ジェネレータ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators)、[プロキシ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)、[よく知られたシンボル](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)、および追加の糖衣構文が含まれています。TC39はまた、新しい仕様のリリースペースを向上させ、2016年2月に[ES2016の候補草案](https://tc39.es/ecma262/2016/)を発表しました。これが今夏に批准される予定です。リリースサイクルが短いためES2015ほど広範ではありませんが、ES2016では[べき乗演算子](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Arithmetic_Operators#Exponentiation)と[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)が重要な位置づけを占めています。

<!--truncate-->
本日、重要な節目を迎えました：**V8がES2015とES2016に対応**しました。今日からChrome Canaryで新しい言語機能を利用することができ、Chrome 52で正式に出荷されます。

進化し続ける仕様の性質、さまざまな種類の準拠テストの違い、そしてWebとの互換性を維持する複雑さを考えると、JavaScriptエンジンがECMAScriptの特定バージョンを完全にサポートしているかどうかの判断は難しいものです。なぜ仕様のサポートが単なるバージョン番号以上に複雑であるのか、なぜ適切な末尾呼び出しがまだ議論されているのか、そしてどのような留意点があるのかについて、詳しくは以下をお読みください。

## 進化する仕様

TC39がJavaScript仕様をより頻繁に更新することを決定した際、言語の最新バージョンが主要なドラフトバージョンとなりました。ECMAScriptのバージョンは依然として毎年作成され、批准されていますが、V8は最新の批准済みバージョン（例：ES2015）、標準化に十分近づいていて実装が安全な特定の機能（例：ES2016の候補草案からのべき乗演算子と`Array.prototype.includes()`）、および最近の草案からのバグ修正やWeb互換性の修正を組み合わせて実装しています。このようなアプローチを取る理由の一部は、ブラウザ内の言語実装が仕様に一致するべきであり、たとえ修正すべきが仕様であったとしても、それが求められるからです。実際、批准された仕様のバージョンを実装する過程で、次の仕様バージョンを構成する多くの修正や明確化が発見されます。

![進化し続けるECMAScript仕様の現在出荷されている部分](/_img/modern-javascript/shipped-features.png)

例えば、ES2015の[RegExpのstickyフラグ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)を実装する際、ES2015仕様のセマンティクスが多くの既存サイトを壊すことがV8チームによって発見されました（人気のある[XRegExp](https://github.com/slevithan/xregexp)ライブラリの2.x.xバージョンを使用しているすべてのサイトを含む）。互換性はWebの基盤であるため、V8チームとSafari JavaScriptCoreチームのエンジニアは、RegExp仕様に修正を提案しました。これはTC39によって承認されました。この修正はES2017まで批准されたバージョンには登場しませんが、それでもECMAScript言語の一部であり、RegExpのstickyフラグを出荷するために実装されました。

言語仕様の継続的な洗練化、そして各バージョン（まだ批准されていない草案を含む）が以前のバージョンを置き換え、修正し、明確化するという事実により、ES2015およびES2016のサポートの背後にある複雑さを理解するのは困難です。一言で言うのは不可能ですが、最も正確な表現はおそらく、「V8は『継続的に維持される将来のECMAScript標準のドラフト』の準拠をサポートしている」と言えるでしょう！

## 準拠の測定

この仕様の複雑さを理解するために、JavaScriptエンジンがECMAScript標準にどれだけ適合しているかを測定するさまざまな方法があります。V8チームや他のブラウザベンダーは、[Test262テストスイート](https://github.com/tc39/test262)を使用して、継続的に更新される将来のECMAScript標準のドラフトへの準拠度をゴールドスタンダードとして評価しています。このテストスイートは、仕様と一致するように継続的に更新され、JavaScriptの互換性があり準拠した実装を構成するすべての機能やエッジケースに対して16,000の個別の機能テストを提供します。現在、V8はTest262の約98%のテストを合格しており、残りの2%は若干のエッジケースやまだ出荷準備が整っていない将来のES機能です。

Test262の膨大なテストをざっと見るのが難しいため、[Kangax互換性テーブル](http://kangax.github.io/compat-table/ES2015/)のような他の準拠テストも存在します。Kangaxは、特定の機能（例えば、[アロー関数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)）が特定のエンジンで実装されているかどうかを簡単に確認することができます。ただし、Test262のようなすべての準拠エッジケースはテストしません。現在、Chrome CanaryはES2015においてKangaxテーブルで98%、並びにES2016に対応するKangaxセクション（例えば、ESnextタブの「2016 features」および「2016 misc」セクションのラベル）の評価で100%のスコアを達成しています。

Kangax ES2015テーブルの残りの2%のテストは、[適切な末尾呼び出し](http://www.2ality.com/2015/06/tail-call-optimization.html)に関するものです。この機能はV8で実装されていますが、以下に詳述する開発者体験に関する懸念からChrome Canaryでは意図的に無効化されています。「Experimental JavaScript features」フラグを有効にしてこの機能を強制的に有効にすると、CanaryはES2015に関するKangaxテーブル全体で100%のスコアを達成します。

## 適切な末尾呼び出し

適切な末尾呼び出しは実装されていますが、[TC39で現在議論中](https://github.com/tc39/proposal-ptc-syntax)であるため、まだ出荷されていません。ES2015は、末尾位置でのstrict mode関数呼び出しがスタックオーバーフローを引き起こさないと規定しています。この保証は特定のプログラミングパターンにおいて役立ちますが、現在のセマンティクスには2つの問題があります。1つ目は、末尾呼び出しの削除が暗黙的なため、[プログラマーがどの関数が実際に末尾呼び出し位置にあるのかを特定するのが難しい](http://2ality.com/2015/06/tail-call-optimization.html#checking-whether-a-function-call-is-in-a-tail-position)ことです。このため、プログラム中の誤った末尾呼び出しの試みをスタックがオーバーフローするまで発見できない場合があります。2つ目は、適切な末尾呼び出しを実装するにはスタックから末尾呼び出しスタックフレームを削除する必要があり、これにより実行フローに関する情報が失われることです。これには2つの結果があります：

1. スタックに不連続性があるため、デバッグ時に実行がどのようにある地点に到達したのか理解しにくくなる。
2. [`error.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack) が実行フローに関する情報を減少させるため、クライアントサイドエラーを収集および分析するテレメトリソフトウェアが破損する可能性がある。

[シャドウスタック](https://bugs.webkit.org/attachment.cgi?id=274472&action=review)を実装すると、呼び出しスタックの可読性を向上させることができますが、V8チームとDevToolsチームは、デバッグ時に表示されるスタックが完全に確定的で、実際の仮想マシンスタックの真の状態と常に一致している場合、デバッグが最も簡単で信頼性が高く正確であると考えています。さらに、シャドウスタックはパフォーマンス上のコストが高すぎるため、常時オンにするのは現実的ではありません。

これらの理由から、V8チームは適切な末尾呼び出しを特別な構文で明示することを強く支持しています。この動作を指定するために、MozillaやMicrosoftの委員会メンバーが共同で推進している[TC39提案](https://github.com/tc39/proposal-ptc-syntax)「構文的末尾呼び出し」が進行中です。私たちはES2015に指定されている適切な末尾呼び出しを実装し、進行中の新しい提案に基づいた構文的末尾呼び出しを実装し始めました。V8チームは次回のTC39会議で問題を解決し、その後に暗黙的適切な末尾呼び出しや構文的末尾呼び出しを既定で出荷する予定です。その間、それぞれのバージョンを`--harmony-tailcalls`および`--harmony-explicit-tailcalls`のV8フラグを使用してテストすることができます。**更新：**これらのフラグは削除されました。

## モジュール

ES2015の最もエキサイティングな約束の1つは、JavaScriptモジュールを使用してアプリケーションのさまざまな部分を名前空間に整理および分離するサポートです。ES2015はモジュール用の[`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)および[`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)宣言を定めていますが、モジュールがJavaScriptプログラムにどのようにロードされるかを定義していません。ブラウザでは、[`<script type="module">`](https://blog.whatwg.org/js-modules)を通じてロード動作が最近指定されました。高度なダイナミックモジュールロードAPIを標準化するための追加作業が必要ですが、モジュールスクリプトタグのChromiumサポートはすでに[開発中](https://groups.google.com/a/chromium.org/d/msg/blink-dev/uba6pMr-jec/tXdg6YYPBAAJ)です。[ローンチバグ](https://bugs.chromium.org/p/v8/issues/detail?id=1569)で実装作業を追跡し、[whatwg/loader](https://github.com/whatwg/loader)リポジトリで実験的なローダーAPIのアイデアについて詳しく読むことができます。

## ESnextとその先

将来的には、開発者はより短い実装サイクルで、より小規模かつ頻繁な更新のECMAScript更新を期待できます。V8チームはすでに、[`async`/`await`](https://github.com/tc39/ecmascript-asyncawait)キーワード、[`Object.values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values) / [`Object.entries`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)、[`String.prototype.{padStart,padEnd}`](http://tc39.es/proposal-string-pad-start-end/)、[RegExpの後方参照](/blog/regexp-lookbehind-assertions) など、次回の機能を実行環境に導入する作業を進めています。ESnext実装の進捗状況や、既存のES2015およびES2016+機能に対するパフォーマンス最適化の最新情報については、今後もチェックしてください。

私たちはJavaScriptを進化させ続け、互換性と既存のウェブの安定性を確保し、新機能を早期に導入するという適切なバランスを追求しています。また、設計上の懸念に関するTC39の実装フィードバックを提供しています。これらの新機能を用いて開発者が作り出す驚くべき体験を見るのを楽しみにしています。
