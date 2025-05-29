---
title: "機能サポート"
permalink: /features/support/
layout: layouts/base.njk
description: "この文書では、V8ウェブサイトで使用されているJavaScriptおよびWebAssembly言語機能サポートリストについて説明します。"
---
# JavaScript/Wasm機能サポート

[JavaScriptおよびWebAssembly言語機能の解説](/features)には、以下のような機能サポートリストが含まれることがよくあります:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

サポートがない機能は次のように表示されます:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

最先端の機能では、環境によってサポートが混在していることが一般的です:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

目的は、V8とChromeだけでなく、広範なJavaScriptエコシステム全体での機能の成熟度を迅速に概観することです。これは、V8などの積極的に開発されているJavaScript VMでのネイティブ実装に限定されるものではなく、ここでは[Babel](https://babeljs.io/)アイコンを使用して示されるツールサポートも含まれます。

<!--truncate-->
Babelエントリはさまざまな意味を持ちます:

- [クラスフィールド](/features/class-fields)のような構文言語機能の場合、それはトランスピレーションサポートを指します。
- [`Promise.allSettled`](/features/promise-combinators#promise.allsettled)のような新しいAPIである言語機能の場合、それはポリフィルサポートを指します。（Babelは[core-jsプロジェクト](https://github.com/zloirock/core-js)を通じてポリフィルを提供します。）

ChromeロゴはV8、Chromium、およびChromiumベースのブラウザを表します。
