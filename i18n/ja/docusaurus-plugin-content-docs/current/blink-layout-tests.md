---
title: &apos;Blinkウェブテスト（旧称: レイアウトテスト）&apos;
description: &apos;V8のインフラストラクチャは、Chromiumとの統合の問題を防ぐため、Blinkのウェブテストを継続的に実行しています。このドキュメントは、そのようなテストに失敗した場合に何をすべきかを説明します。&apos;
---
我々はChromiumとの統合の問題を防ぐため、[Blinkのウェブテスト（旧称: “レイアウトテスト”）](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md)を[統合コンソール](https://ci.chromium.org/p/v8/g/integration/console)上で継続的に実行しています。

テストが失敗すると、ボットはV8 Tip-of-Treeの結果とChromiumの固定されたV8バージョンを比較し、新しく導入されたV8の問題のみをフラグ付けします（偽陽性率 < 5%）。責任の割り当ては簡単で、[Linuxリリース](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Blink%20Linux)ボットはすべてのリビジョンをテストします。

新たに導入された失敗を伴うコミットは通常Chromiumへの自動ロールを解除するためにリバートされます。レイアウトテストに問題があることに気づいた場合やそのためにコミットがリバートされた場合、そしてそれが予期される変更である場合には、以下の手順に従ってChromiumに更新されたベースラインを追加し、（再）コミットしてください。

1. 変更されたテストに対して`[ Failure Pass ]`を設定するChromium変更を適用してください（[詳細](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#updating-the-expectations-files)）。
1. V8のCLを適用し、Chromiumに反映されるまで1～2日待ってください。
1. [これらの指示](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_tests.md#Rebaselining-Web-Tests)に従って新しいベースラインを手動で生成してください。Chromiumのみに変更を加える場合は、[この推奨自動手順](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_test_expectations.md#how-to-rebaseline)が使用できます。
1. テスト期待値ファイルから`[ Failure Pass ]`エントリを削除し、新しいベースラインと一緒にChromiumにコミットしてください。

すべてのCLには`Bug: …`フッターを関連付けてください。
